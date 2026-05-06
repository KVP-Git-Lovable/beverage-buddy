
-- ============================================================
-- MIGRATION: Structural Alignment of Packing List + Inventory
-- ============================================================

-- STEP 1: Add quantity column and populate
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 0;
UPDATE inventory_batches SET quantity = COALESCE(available_qty, 0) + COALESCE(reserved_qty, 0) WHERE quantity = 0;

-- ============================================================
-- STEP 2: Rewrite create_packing_list_atomic
-- ============================================================
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
            -- MANUAL ALLOCATION
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
            -- AUTO ALLOCATION (FEFO/FIFO/LIFO)
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

  RETURN jsonb_build_object('success', true, 'packing_list_id', v_packing_list_id, 'packing_list_number', v_packing_list_number, 'total_items', v_total_items);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- STEP 3: Rewrite cancel_packing_list_reservations
-- ============================================================
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
  v_status TEXT;
  v_order_type TEXT;
BEGIN
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
    v_release_qty := v_rec.allocated_qty;

    IF v_release_qty > 0 THEN
      UPDATE inventory_batches
      SET reserved_qty = GREATEST(0, reserved_qty - v_release_qty)
      WHERE id = v_rec.batch_id;

      v_total_released := v_total_released + v_release_qty;
    END IF;
  END LOOP;

  -- Update distributor_inventory by recalculating from batches
  IF v_dist_id IS NOT NULL THEN
    UPDATE distributor_inventory di
    SET reserved_quantity = COALESCE((
      SELECT SUM(ib.reserved_qty) FROM inventory_batches ib
      WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id
        AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)
    ), 0)
    WHERE di.distributor_id = v_dist_id
      AND di.product_id IN (SELECT DISTINCT pli.product_id FROM packing_list_items pli WHERE pli.packing_list_id = p_packing_list_id);
  END IF;

  -- Reset backorder_qty on source order items
  FOR v_rec IN
    SELECT plis.order_item_id
    FROM packing_list_item_sources plis
    JOIN packing_list_items pli ON pli.id = plis.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id AND plis.order_item_id IS NOT NULL
  LOOP
    UPDATE order_items SET backorder_qty = 0 WHERE id = v_rec.order_item_id;
    UPDATE primary_order_items SET backorder_qty = 0 WHERE id = v_rec.order_item_id;
  END LOOP;

  -- Update packing list status to cancelled
  UPDATE packing_lists
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_packing_list_id;

  -- Reset linked orders
  IF v_order_type = 'primary' THEN
    UPDATE primary_orders
    SET packing_list_id = NULL, status = 'confirmed'
    WHERE packing_list_id = p_packing_list_id AND status != 'delivered';
  ELSE
    UPDATE orders
    SET packing_list_id = NULL, delivery_status = 'pending', updated_at = now()
    WHERE packing_list_id = p_packing_list_id AND delivery_status != 'delivered';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_released', v_total_released,
    'status', 'cancelled'
  );
END;
$$;

-- ============================================================
-- STEP 4: Rewrite delete_packing_list_atomic
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_packing_list_atomic(
  p_packing_list_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pl record;
  v_batch record;
  v_total_released numeric := 0;
  v_rec record;
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
    UPDATE inventory_batches
    SET reserved_qty = GREATEST(0, reserved_qty - v_batch.allocated_qty)
    WHERE id = v_batch.batch_id;
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

  -- Reset backorder_qty on source order items
  FOR v_rec IN
    SELECT plis.order_item_id
    FROM packing_list_item_sources plis
    JOIN packing_list_items pli ON pli.id = plis.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id AND plis.order_item_id IS NOT NULL
  LOOP
    UPDATE order_items SET backorder_qty = 0 WHERE id = v_rec.order_item_id;
    UPDATE primary_order_items SET backorder_qty = 0 WHERE id = v_rec.order_item_id;
  END LOOP;

  UPDATE orders SET packing_list_id = NULL, delivery_date = NULL, delivery_status = 'pending' WHERE packing_list_id = p_packing_list_id;
  UPDATE primary_orders SET packing_list_id = NULL, status = 'confirmed' WHERE packing_list_id = p_packing_list_id;
  DELETE FROM packing_lists WHERE id = p_packing_list_id;

  RETURN jsonb_build_object('success', true, 'total_released', v_total_released);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- STEP 5: Rewrite dispatch_packing_list_atomic
-- ============================================================
CREATE OR REPLACE FUNCTION public.dispatch_packing_list_atomic(
  p_packing_list_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_batch_detail record;
BEGIN
  SELECT * INTO v_pl FROM packing_lists WHERE id = p_packing_list_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Packing list not found'); END IF;

  -- SAFETY GUARD: prevent double dispatch
  IF v_pl.status != 'ready' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only dispatch packing lists with status ready, current status: ' || v_pl.status);
  END IF;

  FOR v_batch IN
    SELECT plib.id AS plib_id, plib.batch_id, plib.allocated_qty, plib.picked_qty, pli.product_id, pli.product_name
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
  LOOP
    v_dispatch_qty := CASE WHEN COALESCE(v_batch.picked_qty, 0) > 0 THEN v_batch.picked_qty ELSE v_batch.allocated_qty END;
    v_leftover := v_batch.allocated_qty - v_dispatch_qty;

    -- Deduct dispatched quantity from total stock
    UPDATE inventory_batches
    SET quantity = GREATEST(0, quantity - v_dispatch_qty),
        reserved_qty = GREATEST(0, reserved_qty - v_batch.allocated_qty)
    WHERE id = v_batch.batch_id;

    -- Get batch details for ledger entry
    SELECT batch_no, expiry_date, warehouse_id INTO v_batch_detail
    FROM inventory_batches WHERE id = v_batch.batch_id;

    -- INSERT dispatch transaction into ledger
    INSERT INTO distributor_inventory_transactions (
      distributor_id, product_id, product_name, transaction_type, quantity,
      reference_type, reference_id, batch_number, expiry_date, warehouse_id,
      notes, created_by
    ) VALUES (
      v_pl.distributor_id, v_batch.product_id, v_batch.product_name, 'DISPATCH',
      -v_dispatch_qty, 'packing_list', p_packing_list_id,
      v_batch_detail.batch_no, v_batch_detail.expiry_date, v_batch_detail.warehouse_id,
      'Dispatched via PL ' || v_pl.packing_list_number, auth.uid()
    );

    v_total_dispatched := v_total_dispatched + v_dispatch_qty;
    IF v_leftover > 0 THEN v_total_released := v_total_released + v_leftover; END IF;
  END LOOP;

  -- Recalculate distributor_inventory from batches
  IF v_pl.distributor_id IS NOT NULL THEN
    UPDATE distributor_inventory di
    SET quantity = COALESCE((
          SELECT SUM(ib.quantity) FROM inventory_batches ib
          WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id
            AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)
        ), 0),
        reserved_quantity = COALESCE((
          SELECT SUM(ib.reserved_qty) FROM inventory_batches ib
          WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id
            AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)
        ), 0)
    WHERE di.distributor_id = v_pl.distributor_id
      AND di.product_id IN (SELECT DISTINCT pli.product_id FROM packing_list_items pli WHERE pli.packing_list_id = p_packing_list_id);
  END IF;

  -- Backorder handling per source (order_item level)
  FOR v_source IN
    SELECT plis.order_item_id, plis.allocated_qty, pli.picked_qty as item_picked, pli.ordered_qty as item_ordered
    FROM packing_list_item_sources plis
    JOIN packing_list_items pli ON pli.id = plis.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id AND plis.order_item_id IS NOT NULL
  LOOP
    -- Proportional shortfall: source_allocated vs total_item_picked ratio
    v_item_shortfall := GREATEST(0, v_source.allocated_qty - LEAST(v_source.allocated_qty, COALESCE(v_source.item_picked, 0)));
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

-- ============================================================
-- STEP 6: Rewrite preview_inventory_allocation
-- ============================================================
CREATE OR REPLACE FUNCTION public.preview_inventory_allocation(
  p_distributor_id UUID,
  p_product_id UUID,
  p_required_qty INTEGER,
  p_strategy TEXT DEFAULT 'FEFO',
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_remaining INTEGER := p_required_qty;
  v_alloc_qty INTEGER;
  v_allocations JSONB := '[]'::JSONB;
  v_total_allocated INTEGER := 0;
  v_available INTEGER;
BEGIN
  FOR v_batch IN
    SELECT id, batch_no, expiry_date, quantity, reserved_qty
    FROM inventory_batches
    WHERE distributor_id = p_distributor_id
      AND product_id = p_product_id
      AND (quantity - reserved_qty) > 0
      AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
      AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
    ORDER BY
      CASE WHEN p_strategy = 'FEFO' THEN expiry_date END ASC NULLS LAST,
      CASE WHEN p_strategy = 'FIFO' THEN created_at END ASC,
      CASE WHEN p_strategy = 'LIFO' THEN created_at END DESC
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_available := v_batch.quantity - v_batch.reserved_qty;
    v_alloc_qty := LEAST(v_available, v_remaining);

    v_allocations := v_allocations || jsonb_build_object(
      'batch_id', v_batch.id,
      'batch_no', v_batch.batch_no,
      'expiry_date', v_batch.expiry_date,
      'allocated_qty', v_alloc_qty,
      'available_qty', v_available
    );

    v_total_allocated := v_total_allocated + v_alloc_qty;
    v_remaining := v_remaining - v_alloc_qty;
  END LOOP;

  RETURN jsonb_build_object(
    'allocations', v_allocations,
    'total_allocated', v_total_allocated,
    'shortfall_qty', GREATEST(0, v_remaining)
  );
END;
$$;

-- ============================================================
-- STEP 7: Rewrite allocate_inventory_batches (same logic as preview but used for commit)
-- ============================================================
CREATE OR REPLACE FUNCTION public.allocate_inventory_batches(
  p_distributor_id UUID,
  p_product_id UUID,
  p_required_qty INTEGER,
  p_strategy TEXT DEFAULT 'FEFO',
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_remaining INTEGER := p_required_qty;
  v_alloc_qty INTEGER;
  v_allocations JSONB := '[]'::JSONB;
  v_total_allocated INTEGER := 0;
  v_available INTEGER;
BEGIN
  FOR v_batch IN
    SELECT id, batch_no, expiry_date, quantity, reserved_qty
    FROM inventory_batches
    WHERE distributor_id = p_distributor_id
      AND product_id = p_product_id
      AND (quantity - reserved_qty) > 0
      AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
      AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
    ORDER BY
      CASE WHEN p_strategy = 'FEFO' THEN expiry_date END ASC NULLS LAST,
      CASE WHEN p_strategy = 'FIFO' THEN created_at END ASC,
      CASE WHEN p_strategy = 'LIFO' THEN created_at END DESC
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_available := v_batch.quantity - v_batch.reserved_qty;
    v_alloc_qty := LEAST(v_available, v_remaining);

    v_allocations := v_allocations || jsonb_build_object(
      'batch_id', v_batch.id,
      'batch_no', v_batch.batch_no,
      'expiry_date', v_batch.expiry_date,
      'allocated_qty', v_alloc_qty,
      'available_qty', v_available
    );

    v_total_allocated := v_total_allocated + v_alloc_qty;
    v_remaining := v_remaining - v_alloc_qty;
  END LOOP;

  RETURN jsonb_build_object(
    'allocations', v_allocations,
    'total_allocated', v_total_allocated,
    'shortfall_qty', GREATEST(0, v_remaining)
  );
END;
$$;

-- ============================================================
-- STEP 8: Create update_picking_atomic RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_picking_atomic(
  p_batch_row_id UUID,
  p_picked_qty NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pli_id UUID;
  v_total_picked NUMERIC;
  v_total_allocated NUMERIC;
  v_short_qty NUMERIC;
BEGIN
  -- Update the batch row
  UPDATE packing_list_item_batches
  SET picked_qty = p_picked_qty
  WHERE id = p_batch_row_id
  RETURNING packing_list_item_id INTO v_pli_id;

  IF v_pli_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch row not found');
  END IF;

  -- Sum all batches for the parent item
  SELECT COALESCE(SUM(picked_qty), 0), COALESCE(SUM(allocated_qty), 0)
  INTO v_total_picked, v_total_allocated
  FROM packing_list_item_batches
  WHERE packing_list_item_id = v_pli_id;

  v_short_qty := GREATEST(0, v_total_allocated - v_total_picked);

  -- Update parent item
  UPDATE packing_list_items
  SET picked_qty = v_total_picked, short_qty = v_short_qty
  WHERE id = v_pli_id;

  RETURN jsonb_build_object('success', true, 'total_picked', v_total_picked, 'short_qty', v_short_qty);
END;
$$;

-- ============================================================
-- STEP 9: Create release_shortfall_on_packed RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_shortfall_on_packed(
  p_packing_list_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_total_released NUMERIC := 0;
  v_shortfall NUMERIC;
  v_dist_id UUID;
BEGIN
  SELECT distributor_id INTO v_dist_id FROM packing_lists WHERE id = p_packing_list_id;

  FOR v_rec IN
    SELECT plib.id, plib.batch_id, plib.allocated_qty, plib.picked_qty, pli.product_id
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
  LOOP
    v_shortfall := v_rec.allocated_qty - COALESCE(v_rec.picked_qty, 0);
    IF v_shortfall > 0 THEN
      -- Release unpicked reserved stock
      UPDATE inventory_batches
      SET reserved_qty = GREATEST(0, reserved_qty - v_shortfall)
      WHERE id = v_rec.batch_id;

      -- Reduce allocated to match picked
      UPDATE packing_list_item_batches
      SET allocated_qty = COALESCE(picked_qty, 0)
      WHERE id = v_rec.id;

      v_total_released := v_total_released + v_shortfall;
    END IF;
  END LOOP;

  -- Recalculate distributor_inventory
  IF v_dist_id IS NOT NULL THEN
    UPDATE distributor_inventory di
    SET reserved_quantity = COALESCE((
      SELECT SUM(ib.reserved_qty) FROM inventory_batches ib
      WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id
        AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)
    ), 0)
    WHERE di.distributor_id = v_dist_id
      AND di.product_id IN (SELECT DISTINCT pli.product_id FROM packing_list_items pli WHERE pli.packing_list_id = p_packing_list_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'total_released', v_total_released);
END;
$$;
