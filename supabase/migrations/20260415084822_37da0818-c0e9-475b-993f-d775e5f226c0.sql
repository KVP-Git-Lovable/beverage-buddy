CREATE OR REPLACE FUNCTION public.create_packing_list_atomic(
  p_order_ids uuid[],
  p_items jsonb,
  p_delivery_date date,
  p_distributor_id uuid,
  p_order_type text DEFAULT 'secondary',
  p_total_value numeric DEFAULT 0,
  p_warehouse_id uuid DEFAULT NULL,
  p_batch_allocations jsonb DEFAULT NULL,
  p_strategy text DEFAULT 'FEFO',
  p_sources jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_packing_list_id uuid;
  v_packing_list_number text;
  v_item jsonb;
  v_pl_item_id uuid;
  v_alloc jsonb;
  v_batch record;
  v_remaining numeric;
  v_alloc_qty numeric;
  v_source jsonb;
  v_total_items integer := 0;
  v_manual_batch jsonb;
  v_already_assigned text;
  v_available numeric;
  v_total_shortfall numeric := 0;
BEGIN
  -- IDEMPOTENCY CHECK
  IF p_order_type = 'secondary' THEN
    SELECT string_agg(o.id::text, ', ') INTO v_already_assigned
    FROM orders o WHERE o.id = ANY(p_order_ids) AND o.packing_list_id IS NOT NULL;
  ELSE
    SELECT string_agg(po.id::text, ', ') INTO v_already_assigned
    FROM primary_orders po WHERE po.id = ANY(p_order_ids) AND po.packing_list_id IS NOT NULL;
  END IF;

  IF v_already_assigned IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orders already allocated to a packing list: ' || v_already_assigned);
  END IF;

  v_packing_list_number := 'PL-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 10000)::text, 4, '0');

  INSERT INTO packing_lists (
    packing_list_number, delivery_date, distributor_id, status, order_type,
    total_items, total_value, warehouse_id, created_by
  ) VALUES (
    v_packing_list_number, p_delivery_date, p_distributor_id, 'draft', p_order_type,
    0, p_total_value, p_warehouse_id, auth.uid()
  ) RETURNING id INTO v_packing_list_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO packing_list_items (
      packing_list_id, product_id, product_name, unit, ordered_qty, picked_qty, short_qty
    ) VALUES (
      v_packing_list_id, (v_item->>'product_id')::uuid, v_item->>'product_name',
      v_item->>'unit', (v_item->>'quantity')::numeric, 0, 0
    ) RETURNING id INTO v_pl_item_id;

    v_total_items := v_total_items + (v_item->>'quantity')::integer;

    IF p_batch_allocations IS NOT NULL THEN
      FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_batch_allocations)
      LOOP
        IF (v_alloc->>'product_id') = (v_item->>'product_id') THEN
          IF v_alloc->'manual_batches' IS NOT NULL AND jsonb_array_length(v_alloc->'manual_batches') > 0 THEN
            -- MANUAL ALLOCATION (keep strict — user explicitly chose batches)
            FOR v_manual_batch IN SELECT * FROM jsonb_array_elements(v_alloc->'manual_batches')
            LOOP
              v_alloc_qty := (v_manual_batch->>'allocate_qty')::numeric;
              IF v_alloc_qty <= 0 THEN CONTINUE; END IF;

              SELECT * INTO v_batch FROM inventory_batches
              WHERE id = (v_manual_batch->>'batch_id')::uuid FOR UPDATE SKIP LOCKED;

              IF NOT FOUND THEN RAISE EXCEPTION 'Batch % not found or locked', v_manual_batch->>'batch_id'; END IF;

              v_available := v_batch.quantity - v_batch.reserved_qty;
              IF v_available < v_alloc_qty THEN
                RAISE EXCEPTION 'Batch % insufficient stock: avail %, need %', v_batch.batch_no, v_available, v_alloc_qty;
              END IF;
              IF v_batch.expiry_date IS NOT NULL AND v_batch.expiry_date < CURRENT_DATE THEN
                RAISE EXCEPTION 'Batch % is expired', v_batch.batch_no;
              END IF;

              UPDATE inventory_batches
              SET reserved_qty = reserved_qty + v_alloc_qty
              WHERE id = v_batch.id;

              UPDATE distributor_inventory SET reserved_quantity = reserved_quantity + v_alloc_qty
              WHERE distributor_id = p_distributor_id AND product_id = (v_item->>'product_id')::uuid
                AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id);

              INSERT INTO packing_list_item_batches (packing_list_item_id, batch_id, batch_number, expiry_date, allocated_qty, picked_qty)
              VALUES (v_pl_item_id, v_batch.id, v_batch.batch_no, v_batch.expiry_date, v_alloc_qty, 0);
            END LOOP;
          ELSE
            -- AUTO ALLOCATION (FEFO/FIFO/LIFO) — allocate what's available, track shortfall
            v_remaining := (v_alloc->>'required_qty')::numeric;
            FOR v_batch IN
              SELECT * FROM inventory_batches
              WHERE distributor_id = p_distributor_id AND product_id = (v_item->>'product_id')::uuid
                AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
                AND (quantity - reserved_qty) > 0
                AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
              ORDER BY
                CASE WHEN p_strategy = 'FEFO' THEN expiry_date END ASC NULLS LAST,
                CASE WHEN p_strategy = 'FIFO' THEN created_at END ASC,
                CASE WHEN p_strategy = 'LIFO' THEN created_at END DESC
              FOR UPDATE SKIP LOCKED
            LOOP
              EXIT WHEN v_remaining <= 0;
              v_available := v_batch.quantity - v_batch.reserved_qty;
              v_alloc_qty := LEAST(v_remaining, v_available);

              UPDATE inventory_batches
              SET reserved_qty = reserved_qty + v_alloc_qty
              WHERE id = v_batch.id;

              UPDATE distributor_inventory SET reserved_quantity = reserved_quantity + v_alloc_qty
              WHERE distributor_id = p_distributor_id AND product_id = (v_item->>'product_id')::uuid
                AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id);

              INSERT INTO packing_list_item_batches (packing_list_item_id, batch_id, batch_number, expiry_date, allocated_qty, picked_qty)
              VALUES (v_pl_item_id, v_batch.id, v_batch.batch_no, v_batch.expiry_date, v_alloc_qty, 0);

              v_remaining := v_remaining - v_alloc_qty;
            END LOOP;

            -- Track shortfall instead of hard-failing — shortfall becomes backorder
            IF v_remaining > 0 THEN
              v_total_shortfall := v_total_shortfall + v_remaining;
              -- Update short_qty on the packing list item
              UPDATE packing_list_items
              SET short_qty = v_remaining
              WHERE id = v_pl_item_id;
            END IF;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  UPDATE packing_lists SET total_items = v_total_items WHERE id = v_packing_list_id;

  IF p_order_type = 'secondary' THEN
    UPDATE orders SET packing_list_id = v_packing_list_id, delivery_date = p_delivery_date, delivery_status = 'in_packing_list'
    WHERE id = ANY(p_order_ids);
  ELSE
    UPDATE primary_orders SET packing_list_id = v_packing_list_id, status = 'allocated'
    WHERE id = ANY(p_order_ids);
  END IF;

  -- Source traceability
  IF p_sources IS NOT NULL THEN
    FOR v_source IN SELECT * FROM jsonb_array_elements(p_sources)
    LOOP
      DECLARE
        v_src_pl_item_id uuid;
        v_src_order_item_id uuid;
      BEGIN
        SELECT id INTO v_src_pl_item_id FROM packing_list_items
        WHERE packing_list_id = v_packing_list_id AND product_id = (v_source->>'product_id')::uuid LIMIT 1;

        IF v_source->>'order_item_id' IS NOT NULL AND v_source->>'order_item_id' != '' THEN
          v_src_order_item_id := (v_source->>'order_item_id')::uuid;
        ELSE
          IF p_order_type = 'secondary' THEN
            SELECT oi.id INTO v_src_order_item_id FROM order_items oi
            WHERE oi.order_id = (v_source->>'order_id')::uuid AND oi.product_id = (v_source->>'product_id')::uuid LIMIT 1;
          ELSE
            SELECT poi.id INTO v_src_order_item_id FROM primary_order_items poi
            WHERE poi.order_id = (v_source->>'order_id')::uuid AND poi.product_id = (v_source->>'product_id')::uuid LIMIT 1;
          END IF;
        END IF;

        IF v_src_pl_item_id IS NOT NULL THEN
          INSERT INTO packing_list_item_sources (packing_list_item_id, order_id, order_item_id, product_id, allocated_qty)
          VALUES (v_src_pl_item_id, (v_source->>'order_id')::uuid, v_src_order_item_id, (v_source->>'product_id')::uuid, (v_source->>'allocated_qty')::numeric);

          IF (v_source->>'backorder_qty')::numeric > 0 THEN
            IF p_order_type = 'secondary' AND v_src_order_item_id IS NOT NULL THEN
              UPDATE order_items SET backorder_qty = (v_source->>'backorder_qty')::numeric WHERE id = v_src_order_item_id;
            ELSIF p_order_type = 'primary' AND v_src_order_item_id IS NOT NULL THEN
              UPDATE primary_order_items SET backorder_qty = (v_source->>'backorder_qty')::numeric WHERE id = v_src_order_item_id;
            END IF;
          END IF;
        END IF;
      END;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'packing_list_id', v_packing_list_id,
    'packing_list_number', v_packing_list_number,
    'total_items', v_total_items,
    'total_shortfall', v_total_shortfall
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;