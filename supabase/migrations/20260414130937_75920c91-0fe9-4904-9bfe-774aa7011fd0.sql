
-- Drop old signature first
DROP FUNCTION IF EXISTS public.create_packing_list_atomic(uuid,date,text,uuid,numeric,jsonb,uuid[],jsonb,jsonb,text);

-- ============================================================
-- 1. RECREATE create_packing_list_atomic with idempotency + order_item_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_packing_list_atomic(
  p_distributor_id uuid,
  p_delivery_date date,
  p_order_type text,
  p_warehouse_id uuid,
  p_total_value numeric,
  p_items jsonb,
  p_order_ids uuid[],
  p_batch_allocations jsonb DEFAULT NULL,
  p_sources jsonb DEFAULT NULL,
  p_strategy text DEFAULT 'FEFO'
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
            FOR v_manual_batch IN SELECT * FROM jsonb_array_elements(v_alloc->'manual_batches')
            LOOP
              v_alloc_qty := (v_manual_batch->>'allocate_qty')::numeric;
              IF v_alloc_qty <= 0 THEN CONTINUE; END IF;

              SELECT * INTO v_batch FROM inventory_batches
              WHERE id = (v_manual_batch->>'batch_id')::uuid FOR UPDATE SKIP LOCKED;

              IF NOT FOUND THEN RAISE EXCEPTION 'Batch % not found or locked', v_manual_batch->>'batch_id'; END IF;
              IF (v_batch.quantity - v_batch.reserved_qty) < v_alloc_qty THEN
                RAISE EXCEPTION 'Batch % insufficient stock: avail %, need %', v_batch.batch_number, v_batch.quantity - v_batch.reserved_qty, v_alloc_qty;
              END IF;
              IF v_batch.expiry_date IS NOT NULL AND v_batch.expiry_date < CURRENT_DATE THEN
                RAISE EXCEPTION 'Batch % is expired', v_batch.batch_number;
              END IF;

              UPDATE inventory_batches SET reserved_qty = reserved_qty + v_alloc_qty WHERE id = v_batch.id;
              UPDATE distributor_inventory SET reserved_quantity = reserved_quantity + v_alloc_qty
              WHERE distributor_id = p_distributor_id AND product_id = (v_item->>'product_id')::uuid
                AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id);

              INSERT INTO packing_list_item_batches (packing_list_item_id, batch_id, batch_number, expiry_date, allocated_qty, picked_qty)
              VALUES (v_pl_item_id, v_batch.id, v_batch.batch_number, v_batch.expiry_date, v_alloc_qty, 0);
            END LOOP;
          ELSE
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
              v_alloc_qty := LEAST(v_remaining, v_batch.quantity - v_batch.reserved_qty);

              UPDATE inventory_batches SET reserved_qty = reserved_qty + v_alloc_qty WHERE id = v_batch.id;
              UPDATE distributor_inventory SET reserved_quantity = reserved_quantity + v_alloc_qty
              WHERE distributor_id = p_distributor_id AND product_id = (v_item->>'product_id')::uuid
                AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id);

              INSERT INTO packing_list_item_batches (packing_list_item_id, batch_id, batch_number, expiry_date, allocated_qty, picked_qty)
              VALUES (v_pl_item_id, v_batch.id, v_batch.batch_number, v_batch.expiry_date, v_alloc_qty, 0);

              v_remaining := v_remaining - v_alloc_qty;
            END LOOP;

            IF v_remaining > 0 THEN
              RAISE EXCEPTION 'Insufficient stock for product %: still need % units', v_item->>'product_name', v_remaining;
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
    UPDATE primary_orders SET packing_list_id = v_packing_list_id, status = 'processing'
    WHERE id = ANY(p_order_ids);
  END IF;

  -- Source traceability with order_item_id support
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

  RETURN jsonb_build_object('success', true, 'packing_list_id', v_packing_list_id, 'packing_list_number', v_packing_list_number, 'total_items', v_total_items);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 2. CREATE delete_packing_list_atomic
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_packing_list_atomic(p_packing_list_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pl record;
  v_batch record;
  v_total_released numeric := 0;
BEGIN
  SELECT * INTO v_pl FROM packing_lists WHERE id = p_packing_list_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Packing list not found'); END IF;
  IF v_pl.status != 'draft' THEN RETURN jsonb_build_object('success', false, 'error', 'Can only delete draft packing lists'); END IF;

  FOR v_batch IN
    SELECT plib.batch_id, plib.allocated_qty
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
  LOOP
    UPDATE inventory_batches SET reserved_qty = GREATEST(0, reserved_qty - v_batch.allocated_qty) WHERE id = v_batch.batch_id;
    v_total_released := v_total_released + v_batch.allocated_qty;
  END LOOP;

  IF v_pl.distributor_id IS NOT NULL THEN
    UPDATE distributor_inventory di
    SET reserved_quantity = COALESCE((
      SELECT SUM(ib.reserved_qty) FROM inventory_batches ib
      WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id
        AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)
    ), 0)
    WHERE di.distributor_id = v_pl.distributor_id
      AND di.product_id IN (SELECT DISTINCT pli.product_id FROM packing_list_items pli WHERE pli.packing_list_id = p_packing_list_id);
  END IF;

  UPDATE orders SET packing_list_id = NULL, delivery_date = NULL, delivery_status = 'pending' WHERE packing_list_id = p_packing_list_id;
  UPDATE primary_orders SET packing_list_id = NULL, status = 'confirmed' WHERE packing_list_id = p_packing_list_id;
  DELETE FROM packing_lists WHERE id = p_packing_list_id;

  RETURN jsonb_build_object('success', true, 'total_released', v_total_released);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 3. CREATE dispatch_packing_list_atomic
-- ============================================================
CREATE OR REPLACE FUNCTION public.dispatch_packing_list_atomic(p_packing_list_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pl record;
  v_batch record;
  v_total_dispatched numeric := 0;
  v_total_released numeric := 0;
  v_total_backorder numeric := 0;
  v_dispatch_qty numeric;
  v_leftover numeric;
  v_source record;
  v_item_shortfall numeric;
BEGIN
  SELECT * INTO v_pl FROM packing_lists WHERE id = p_packing_list_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Packing list not found'); END IF;

  FOR v_batch IN
    SELECT plib.batch_id, plib.allocated_qty, plib.picked_qty, pli.product_id
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
  LOOP
    v_dispatch_qty := CASE WHEN v_batch.picked_qty > 0 THEN v_batch.picked_qty ELSE v_batch.allocated_qty END;
    v_leftover := v_batch.allocated_qty - v_dispatch_qty;

    UPDATE inventory_batches
    SET quantity = quantity - v_dispatch_qty, reserved_qty = GREATEST(0, reserved_qty - v_batch.allocated_qty)
    WHERE id = v_batch.batch_id;

    v_total_dispatched := v_total_dispatched + v_dispatch_qty;
    IF v_leftover > 0 THEN v_total_released := v_total_released + v_leftover; END IF;
  END LOOP;

  IF v_pl.distributor_id IS NOT NULL THEN
    UPDATE distributor_inventory di
    SET quantity = COALESCE((SELECT SUM(ib.quantity) FROM inventory_batches ib WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)), 0),
        reserved_quantity = COALESCE((SELECT SUM(ib.reserved_qty) FROM inventory_batches ib WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)), 0)
    WHERE di.distributor_id = v_pl.distributor_id
      AND di.product_id IN (SELECT DISTINCT pli.product_id FROM packing_list_items pli WHERE pli.packing_list_id = p_packing_list_id);
  END IF;

  FOR v_source IN
    SELECT plis.order_item_id, plis.allocated_qty, pli.picked_qty as item_picked
    FROM packing_list_item_sources plis
    JOIN packing_list_items pli ON pli.id = plis.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id AND plis.order_item_id IS NOT NULL
  LOOP
    v_item_shortfall := GREATEST(0, v_source.allocated_qty - COALESCE(v_source.item_picked, 0));
    IF v_item_shortfall > 0 THEN
      UPDATE order_items SET backorder_qty = COALESCE(backorder_qty, 0) + v_item_shortfall WHERE id = v_source.order_item_id;
      IF NOT FOUND THEN
        UPDATE primary_order_items SET backorder_qty = COALESCE(backorder_qty, 0) + v_item_shortfall WHERE id = v_source.order_item_id;
      END IF;
      v_total_backorder := v_total_backorder + v_item_shortfall;
    END IF;
  END LOOP;

  UPDATE packing_lists SET status = 'dispatched', updated_at = now() WHERE id = p_packing_list_id;
  UPDATE orders SET delivery_status = 'dispatched' WHERE packing_list_id = p_packing_list_id;
  UPDATE primary_orders SET status = 'dispatched' WHERE packing_list_id = p_packing_list_id;

  RETURN jsonb_build_object('success', true, 'total_dispatched', v_total_dispatched, 'total_released', v_total_released, 'total_backorder_added', v_total_backorder);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
