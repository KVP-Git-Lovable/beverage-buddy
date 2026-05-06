
-- ================================================================
-- FIX 1: Replace create_packing_list_atomic
-- Fix primary_order_id -> order_id bug
-- Support direct order_item_id in sources
-- Support manual batch allocations
-- ================================================================
DROP FUNCTION IF EXISTS public.create_packing_list_atomic(UUID, DATE, TEXT, UUID, NUMERIC, JSONB, UUID[], JSONB, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.create_packing_list_atomic(
  p_distributor_id UUID,
  p_delivery_date DATE,
  p_order_type TEXT,
  p_warehouse_id UUID DEFAULT NULL,
  p_total_value NUMERIC DEFAULT 0,
  p_items JSONB DEFAULT '[]',
  p_order_ids UUID[] DEFAULT '{}',
  p_batch_allocations JSONB DEFAULT NULL,
  p_sources JSONB DEFAULT NULL,
  p_strategy TEXT DEFAULT 'FEFO'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- STEP 3: Batch allocation + insert packing_list_item_batches
  -- Supports both auto (FEFO/FIFO/LIFO) and manual allocation
  -- ================================================================
  IF p_batch_allocations IS NOT NULL AND jsonb_array_length(p_batch_allocations) > 0 THEN
    FOR v_alloc IN
      SELECT
        (elem->>'product_id')::UUID AS product_id,
        (elem->>'required_qty')::INTEGER AS required_qty,
        elem->'manual_batches' AS manual_batches
      FROM jsonb_array_elements(p_batch_allocations) AS elem
    LOOP
      -- Check if manual batches are provided
      IF v_alloc.manual_batches IS NOT NULL AND jsonb_typeof(v_alloc.manual_batches) = 'array' AND jsonb_array_length(v_alloc.manual_batches) > 0 THEN
        -- ============ MANUAL ALLOCATION ============
        FOR v_batch IN
          SELECT
            (mb->>'batch_id')::UUID AS batch_id,
            (mb->>'allocate_qty')::INTEGER AS allocate_qty
          FROM jsonb_array_elements(v_alloc.manual_batches) AS mb
          WHERE (mb->>'allocate_qty')::INTEGER > 0
        LOOP
          -- Lock and validate batch
          PERFORM 1 FROM inventory_batches
          WHERE id = v_batch.batch_id
            AND available_qty >= v_batch.allocate_qty
            AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
          FOR UPDATE;

          IF NOT FOUND THEN
            RAISE EXCEPTION 'Batch % has insufficient stock or is expired', v_batch.batch_id;
          END IF;

          -- Reserve on batch
          UPDATE inventory_batches
          SET available_qty = available_qty - v_batch.allocate_qty,
              reserved_qty = reserved_qty + v_batch.allocate_qty
          WHERE id = v_batch.batch_id;

          -- Insert batch link
          INSERT INTO packing_list_item_batches (
            packing_list_item_id, batch_id, allocated_qty, picked_qty
          ) VALUES (
            (v_pl_item_map->>v_alloc.product_id::text)::UUID,
            v_batch.batch_id, v_batch.allocate_qty, 0
          );

          v_total_allocated := v_total_allocated + v_batch.allocate_qty;

          -- Track per-product totals
          IF v_product_alloc_totals ? v_alloc.product_id::text THEN
            v_product_alloc_totals := jsonb_set(
              v_product_alloc_totals,
              ARRAY[v_alloc.product_id::text],
              to_jsonb((v_product_alloc_totals->>v_alloc.product_id::text)::integer + v_batch.allocate_qty)
            );
          ELSE
            v_product_alloc_totals := jsonb_set(
              v_product_alloc_totals,
              ARRAY[v_alloc.product_id::text],
              to_jsonb(v_batch.allocate_qty)
            );
          END IF;
        END LOOP;
      ELSE
        -- ============ AUTO ALLOCATION (FEFO/FIFO/LIFO) ============
        v_remaining := v_alloc.required_qty;

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

          UPDATE inventory_batches
          SET available_qty = available_qty - v_alloc_qty,
              reserved_qty = reserved_qty + v_alloc_qty
          WHERE id = v_batch.id;

          INSERT INTO packing_list_item_batches (
            packing_list_item_id, batch_id, allocated_qty, picked_qty
          ) VALUES (
            (v_pl_item_map->>v_alloc.product_id::text)::UUID,
            v_batch.id, v_alloc_qty, 0
          );

          v_total_allocated := v_total_allocated + v_alloc_qty;
          v_remaining := v_remaining - v_alloc_qty;

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
      END IF;
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
  -- Accepts optional order_item_id directly; falls back to lookup
  -- FIXED: primary_order_items uses 'order_id' not 'primary_order_id'
  -- ================================================================
  IF p_sources IS NOT NULL AND jsonb_array_length(p_sources) > 0 THEN
    FOR v_source IN
      SELECT
        (elem->>'product_id')::UUID AS product_id,
        (elem->>'order_id')::UUID AS order_id,
        (elem->>'order_item_id')::UUID AS order_item_id,
        (elem->>'allocated_qty')::INTEGER AS allocated_qty
      FROM jsonb_array_elements(p_sources) AS elem
    LOOP
      v_real_item_id := v_source.order_item_id;

      -- If no direct order_item_id provided, look it up
      IF v_real_item_id IS NULL THEN
        IF p_order_type = 'primary' THEN
          SELECT id INTO v_real_item_id
          FROM primary_order_items
          WHERE order_id = v_source.order_id
            AND product_id = v_source.product_id
          LIMIT 1;
        ELSE
          SELECT id INTO v_real_item_id
          FROM order_items
          WHERE order_id = v_source.order_id
            AND product_id = v_source.product_id
          LIMIT 1;
        END IF;
      END IF;

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
  -- STEP 6: Update backorder_qty on original order items
  -- ================================================================
  IF p_sources IS NOT NULL AND jsonb_array_length(p_sources) > 0 THEN
    FOR v_source IN
      SELECT
        (elem->>'product_id')::UUID AS product_id,
        (elem->>'order_id')::UUID AS order_id,
        (elem->>'order_item_id')::UUID AS order_item_id,
        (elem->>'allocated_qty')::INTEGER AS allocated_qty,
        (elem->>'backorder_qty')::INTEGER AS backorder_qty
      FROM jsonb_array_elements(p_sources) AS elem
    LOOP
      IF COALESCE(v_source.backorder_qty, 0) > 0 THEN
        v_real_item_id := v_source.order_item_id;
        IF v_real_item_id IS NULL THEN
          IF p_order_type = 'primary' THEN
            SELECT id INTO v_real_item_id
            FROM primary_order_items
            WHERE order_id = v_source.order_id
              AND product_id = v_source.product_id
            LIMIT 1;
          ELSE
            SELECT id INTO v_real_item_id
            FROM order_items
            WHERE order_id = v_source.order_id
              AND product_id = v_source.product_id
            LIMIT 1;
          END IF;
        END IF;

        IF v_real_item_id IS NOT NULL THEN
          IF p_order_type = 'primary' THEN
            UPDATE primary_order_items
            SET approved_qty = COALESCE(v_source.allocated_qty, 0),
                backorder_qty = v_source.backorder_qty
            WHERE id = v_real_item_id;
          ELSE
            UPDATE order_items
            SET backorder_qty = v_source.backorder_qty
            WHERE id = v_real_item_id;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- ================================================================
  -- STEP 7: Update total_items on packing list
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
  RAISE;
END;
$$;


-- ================================================================
-- FIX 2: Replace cancel_packing_list_reservations
-- Use packing_list_id on orders/primary_orders directly
-- instead of non-existent packing_list_orders table
-- ================================================================
DROP FUNCTION IF EXISTS public.cancel_packing_list_reservations(UUID);

CREATE OR REPLACE FUNCTION public.cancel_packing_list_reservations(
  p_packing_list_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_total_released INTEGER := 0;
  v_dist_id UUID;
  v_release_qty INTEGER;
  v_product_releases JSONB := '{}'::JSONB;
  v_status TEXT;
  v_order_type TEXT;
BEGIN
  -- Get packing list info
  SELECT distributor_id, status, order_type
  INTO v_dist_id, v_status, v_order_type
  FROM packing_lists
  WHERE id = p_packing_list_id;

  IF v_dist_id IS NULL AND v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Packing list not found');
  END IF;

  IF v_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already cancelled');
  END IF;

  -- Release all batch reservations
  FOR v_rec IN
    SELECT plib.id AS plib_id, plib.batch_id, plib.allocated_qty, plib.picked_qty,
           pli.product_id
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
    FOR UPDATE OF plib
  LOOP
    v_release_qty := v_rec.allocated_qty - COALESCE(v_rec.picked_qty, 0);

    IF v_release_qty > 0 THEN
      UPDATE inventory_batches
      SET available_qty = available_qty + v_release_qty,
          reserved_qty = GREATEST(0, reserved_qty - v_release_qty)
      WHERE id = v_rec.batch_id;

      IF v_product_releases ? v_rec.product_id::text THEN
        v_product_releases := jsonb_set(
          v_product_releases,
          ARRAY[v_rec.product_id::text],
          to_jsonb((v_product_releases->>v_rec.product_id::text)::integer + v_release_qty)
        );
      ELSE
        v_product_releases := jsonb_set(
          v_product_releases,
          ARRAY[v_rec.product_id::text],
          to_jsonb(v_release_qty)
        );
      END IF;

      v_total_released := v_total_released + v_release_qty;
    END IF;
  END LOOP;

  -- Update distributor_inventory summary
  FOR v_rec IN
    SELECT key::uuid AS product_id, value::integer AS released_qty
    FROM jsonb_each_text(v_product_releases)
  LOOP
    UPDATE distributor_inventory
    SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_rec.released_qty)
    WHERE distributor_id = v_dist_id
      AND product_id = v_rec.product_id;
  END LOOP;

  -- Update packing list status to cancelled
  UPDATE packing_lists
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_packing_list_id;

  -- Reset linked orders back to pending using packing_list_id directly
  IF v_order_type = 'primary' THEN
    UPDATE primary_orders
    SET packing_list_id = NULL,
        status = 'confirmed'
    WHERE packing_list_id = p_packing_list_id
      AND status != 'delivered';
  ELSE
    UPDATE orders
    SET packing_list_id = NULL,
        delivery_status = 'pending',
        updated_at = now()
    WHERE packing_list_id = p_packing_list_id
      AND delivery_status != 'delivered';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_released', v_total_released,
    'status', 'cancelled'
  );
END;
$$;


-- ================================================================
-- FIX 3: Clean orphaned batch reservations
-- ================================================================
UPDATE inventory_batches ib
SET reserved_qty = 0,
    available_qty = available_qty + reserved_qty
WHERE reserved_qty > 0
  AND NOT EXISTS (
    SELECT 1 FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    JOIN packing_lists pl ON pl.id = pli.packing_list_id
    WHERE plib.batch_id = ib.id
      AND pl.status NOT IN ('cancelled', 'delivered', 'completed')
  );

-- Reconcile distributor_inventory.reserved_quantity
UPDATE distributor_inventory di
SET reserved_quantity = COALESCE(batch_totals.total_reserved, 0)
FROM (
  SELECT distributor_id, product_id, SUM(reserved_qty) as total_reserved
  FROM inventory_batches
  GROUP BY distributor_id, product_id
) batch_totals
WHERE di.distributor_id = batch_totals.distributor_id
  AND di.product_id = batch_totals.product_id
  AND di.reserved_quantity != COALESCE(batch_totals.total_reserved, 0);

UPDATE distributor_inventory di
SET reserved_quantity = 0
WHERE di.reserved_quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM inventory_batches ib
    WHERE ib.distributor_id = di.distributor_id
      AND ib.product_id = di.product_id
      AND ib.reserved_qty > 0
  );
