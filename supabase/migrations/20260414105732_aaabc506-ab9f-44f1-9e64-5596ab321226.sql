
-- Atomic packing list creation: single transaction for allocation + packing list + items + sources + order sync
-- If ANY step fails, PostgreSQL auto-rolls back everything including batch reservations

CREATE OR REPLACE FUNCTION public.create_packing_list_atomic(
  p_distributor_id UUID,
  p_delivery_date DATE,
  p_order_type TEXT,
  p_warehouse_id UUID DEFAULT NULL,
  p_total_value NUMERIC DEFAULT 0,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_order_ids UUID[] DEFAULT '{}'::UUID[],
  p_batch_allocations JSONB DEFAULT NULL,
  p_sources JSONB DEFAULT NULL,
  p_strategy TEXT DEFAULT 'FEFO'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_packing_list_id UUID;
  v_packing_list_number TEXT;
  v_item RECORD;
  v_pl_item_id UUID;
  v_pl_item_map JSONB := '{}'::JSONB;
  v_alloc RECORD;
  v_batch RECORD;
  v_remaining INTEGER;
  v_alloc_qty INTEGER;
  v_total_allocated INTEGER := 0;
  v_shortfall_qty INTEGER := 0;
  v_product_alloc_totals JSONB := '{}'::JSONB;
  v_source RECORD;
  v_real_item_id UUID;
  v_total_items INTEGER := 0;
BEGIN
  -- Validate order_type
  IF p_order_type NOT IN ('primary', 'secondary') THEN
    RAISE EXCEPTION 'Invalid order_type: %. Must be primary or secondary', p_order_type;
  END IF;

  -- ================================================================
  -- STEP 1: Create packing_lists row
  -- ================================================================
  INSERT INTO packing_lists (
    delivery_date, distributor_id, total_value, order_type, status, warehouse_id
  ) VALUES (
    p_delivery_date, p_distributor_id, p_total_value, p_order_type, 'draft',
    p_warehouse_id
  )
  RETURNING id, packing_list_number INTO v_packing_list_id, v_packing_list_number;

  -- ================================================================
  -- STEP 2: Insert packing_list_items, build product_id → pl_item_id map
  -- ================================================================
  FOR v_item IN
    SELECT
      (elem->>'product_id')::UUID AS product_id,
      elem->>'product_name' AS product_name,
      elem->>'unit' AS unit,
      (elem->>'quantity')::INTEGER AS quantity
    FROM jsonb_array_elements(p_items) AS elem
  LOOP
    INSERT INTO packing_list_items (
      packing_list_id, product_id, product_name, unit, ordered_qty, picked_qty, short_qty
    ) VALUES (
      v_packing_list_id, v_item.product_id, v_item.product_name, v_item.unit,
      v_item.quantity, 0, 0
    )
    RETURNING id INTO v_pl_item_id;

    v_pl_item_map := jsonb_set(v_pl_item_map, ARRAY[v_item.product_id::text], to_jsonb(v_pl_item_id));
    v_total_items := v_total_items + v_item.quantity;
  END LOOP;

  -- ================================================================
  -- STEP 3: Batch allocation (FEFO) + insert packing_list_item_batches
  -- ================================================================
  IF p_batch_allocations IS NOT NULL AND jsonb_array_length(p_batch_allocations) > 0 THEN
    -- Process each product's allocation request
    FOR v_alloc IN
      SELECT
        (elem->>'product_id')::UUID AS product_id,
        (elem->>'required_qty')::INTEGER AS required_qty
      FROM jsonb_array_elements(p_batch_allocations) AS elem
    LOOP
      v_remaining := v_alloc.required_qty;

      -- Allocate from batches using FEFO with row-level locking
      FOR v_batch IN
        SELECT id, batch_no, expiry_date, available_qty
        FROM inventory_batches
        WHERE distributor_id = p_distributor_id
          AND product_id = v_alloc.product_id
          AND available_qty > 0
          AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
          AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
        ORDER BY
          CASE WHEN p_strategy = 'FEFO' THEN expiry_date END ASC NULLS LAST,
          CASE WHEN p_strategy = 'FIFO' THEN created_at END ASC,
          CASE WHEN p_strategy = 'LIFO' THEN created_at END DESC
        FOR UPDATE SKIP LOCKED
      LOOP
        EXIT WHEN v_remaining <= 0;

        v_alloc_qty := LEAST(v_batch.available_qty, v_remaining);

        -- Reserve on batch
        UPDATE inventory_batches
        SET available_qty = available_qty - v_alloc_qty,
            reserved_qty = reserved_qty + v_alloc_qty
        WHERE id = v_batch.id;

        -- Insert batch link
        INSERT INTO packing_list_item_batches (
          packing_list_item_id, batch_id, allocated_qty, picked_qty
        ) VALUES (
          (v_pl_item_map->>v_alloc.product_id::text)::UUID,
          v_batch.id, v_alloc_qty, 0
        );

        v_total_allocated := v_total_allocated + v_alloc_qty;
        v_remaining := v_remaining - v_alloc_qty;

        -- Track per-product totals for distributor_inventory update
        IF v_product_alloc_totals ? v_alloc.product_id::text THEN
          v_product_alloc_totals := jsonb_set(
            v_product_alloc_totals,
            ARRAY[v_alloc.product_id::text],
            to_jsonb((v_product_alloc_totals->>v_alloc.product_id::text)::integer + v_alloc_qty)
          );
        ELSE
          v_product_alloc_totals := jsonb_set(
            v_product_alloc_totals,
            ARRAY[v_alloc.product_id::text],
            to_jsonb(v_alloc_qty)
          );
        END IF;
      END LOOP;

      v_shortfall_qty := v_shortfall_qty + GREATEST(0, v_remaining);
    END LOOP;

    -- Update distributor_inventory summary for each product
    FOR v_alloc IN
      SELECT key::uuid AS product_id, value::integer AS alloc_total
      FROM jsonb_each_text(v_product_alloc_totals)
    LOOP
      UPDATE distributor_inventory
      SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_alloc.alloc_total
      WHERE distributor_id = p_distributor_id
        AND product_id = v_alloc.product_id;
    END LOOP;
  END IF;

  -- ================================================================
  -- STEP 4: Insert packing_list_item_sources (traceability)
  -- Look up real order_item_id from order_items / primary_order_items
  -- ================================================================
  IF p_sources IS NOT NULL AND jsonb_array_length(p_sources) > 0 THEN
    FOR v_source IN
      SELECT
        (elem->>'product_id')::UUID AS product_id,
        (elem->>'order_id')::UUID AS order_id,
        (elem->>'allocated_qty')::INTEGER AS allocated_qty
      FROM jsonb_array_elements(p_sources) AS elem
    LOOP
      -- Look up the real order_item_id
      IF p_order_type = 'primary' THEN
        SELECT id INTO v_real_item_id
        FROM primary_order_items
        WHERE primary_order_id = v_source.order_id
          AND product_id = v_source.product_id
        LIMIT 1;
      ELSE
        SELECT id INTO v_real_item_id
        FROM order_items
        WHERE order_id = v_source.order_id
          AND product_id = v_source.product_id
        LIMIT 1;
      END IF;

      -- Only insert if we found a real item ID (skip gracefully otherwise)
      IF v_real_item_id IS NOT NULL AND v_pl_item_map ? v_source.product_id::text THEN
        INSERT INTO packing_list_item_sources (
          packing_list_item_id, order_item_id, order_type, allocated_qty
        ) VALUES (
          (v_pl_item_map->>v_source.product_id::text)::UUID,
          v_real_item_id,
          p_order_type,
          v_source.allocated_qty
        );
      END IF;
    END LOOP;
  END IF;

  -- ================================================================
  -- STEP 5: Update orders with packing_list_id
  -- ================================================================
  IF p_order_type = 'primary' THEN
    UPDATE primary_orders
    SET packing_list_id = v_packing_list_id,
        status = 'allocated'
    WHERE id = ANY(p_order_ids);
  ELSE
    UPDATE orders
    SET packing_list_id = v_packing_list_id,
        delivery_date = p_delivery_date,
        delivery_status = 'in_packing_list'
    WHERE id = ANY(p_order_ids);
  END IF;

  -- ================================================================
  -- STEP 6: Update total_items on packing list
  -- ================================================================
  UPDATE packing_lists
  SET total_items = v_total_items
  WHERE id = v_packing_list_id;

  -- ================================================================
  -- Return result
  -- ================================================================
  RETURN jsonb_build_object(
    'success', true,
    'packing_list_id', v_packing_list_id,
    'packing_list_number', v_packing_list_number,
    'total_allocated', v_total_allocated,
    'shortfall_qty', v_shortfall_qty
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error rolls back the entire transaction automatically
  RAISE;
END;
$$;
