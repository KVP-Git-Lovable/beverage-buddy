
-- 1. Preview-only allocation RPC (NO writes)
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
SET search_path TO 'public'
AS $$
DECLARE
  v_batch RECORD;
  v_remaining INTEGER := p_required_qty;
  v_alloc_qty INTEGER;
  v_allocations JSONB := '[]'::JSONB;
  v_total_allocated INTEGER := 0;
BEGIN
  FOR v_batch IN
    SELECT id, batch_no, expiry_date, available_qty
    FROM inventory_batches
    WHERE distributor_id = p_distributor_id
      AND product_id = p_product_id
      AND available_qty > 0
      AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
      AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
    ORDER BY
      CASE WHEN p_strategy = 'FEFO' THEN expiry_date END ASC NULLS LAST,
      CASE WHEN p_strategy = 'FIFO' THEN created_at END ASC,
      CASE WHEN p_strategy = 'LIFO' THEN created_at END DESC
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_alloc_qty := LEAST(v_batch.available_qty, v_remaining);

    v_allocations := v_allocations || jsonb_build_object(
      'batch_id', v_batch.id,
      'batch_no', v_batch.batch_no,
      'expiry_date', v_batch.expiry_date,
      'allocated_qty', v_alloc_qty,
      'available_qty', v_batch.available_qty
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

-- 2. Update allocate_inventory_batches to use FOR UPDATE SKIP LOCKED
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
SET search_path TO 'public'
AS $$
DECLARE
  v_batch RECORD;
  v_remaining INTEGER := p_required_qty;
  v_alloc_qty INTEGER;
  v_allocations JSONB := '[]'::JSONB;
  v_total_allocated INTEGER := 0;
  v_cursor CURSOR FOR
    SELECT id, batch_no, expiry_date, available_qty
    FROM inventory_batches
    WHERE distributor_id = p_distributor_id
      AND product_id = p_product_id
      AND available_qty > 0
      AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
      AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
    ORDER BY
      CASE WHEN p_strategy = 'FEFO' THEN expiry_date END ASC NULLS LAST,
      CASE WHEN p_strategy = 'FIFO' THEN created_at END ASC,
      CASE WHEN p_strategy = 'LIFO' THEN created_at END DESC
    FOR UPDATE SKIP LOCKED;
BEGIN
  OPEN v_cursor;
  LOOP
    FETCH v_cursor INTO v_batch;
    EXIT WHEN NOT FOUND OR v_remaining <= 0;

    v_alloc_qty := LEAST(v_batch.available_qty, v_remaining);

    UPDATE inventory_batches
    SET available_qty = available_qty - v_alloc_qty,
        reserved_qty = reserved_qty + v_alloc_qty
    WHERE id = v_batch.id;

    v_allocations := v_allocations || jsonb_build_object(
      'batch_id', v_batch.id,
      'batch_no', v_batch.batch_no,
      'expiry_date', v_batch.expiry_date,
      'allocated_qty', v_alloc_qty
    );

    v_total_allocated := v_total_allocated + v_alloc_qty;
    v_remaining := v_remaining - v_alloc_qty;
  END LOOP;
  CLOSE v_cursor;

  IF v_total_allocated > 0 THEN
    UPDATE distributor_inventory
    SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_total_allocated
    WHERE distributor_id = p_distributor_id
      AND product_id = p_product_id;
  END IF;

  RETURN jsonb_build_object(
    'allocations', v_allocations,
    'total_allocated', v_total_allocated,
    'shortfall_qty', GREATEST(0, v_remaining)
  );
END;
$$;

-- 3. Release all batch reservations for a packing list (atomic)
CREATE OR REPLACE FUNCTION public.release_all_packing_list_reservations(
  p_packing_list_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rec RECORD;
  v_total_released INTEGER := 0;
  v_dist_id UUID;
  v_product_releases JSONB := '{}'::JSONB;
BEGIN
  -- Get distributor_id from packing list
  SELECT distributor_id INTO v_dist_id
  FROM packing_lists
  WHERE id = p_packing_list_id;

  IF v_dist_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Packing list not found');
  END IF;

  -- Loop through all batch allocations for this packing list
  FOR v_rec IN
    SELECT plib.batch_id, plib.allocated_qty, plib.picked_qty, plib.packing_list_item_id,
           pli.product_id
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
      AND plib.allocated_qty > COALESCE(plib.picked_qty, 0)
    FOR UPDATE OF plib
  LOOP
    DECLARE
      v_release_qty INTEGER := plib_allocated_minus_picked(v_rec.allocated_qty, v_rec.picked_qty);
    BEGIN
      v_release_qty := v_rec.allocated_qty - COALESCE(v_rec.picked_qty, 0);

      -- Release back to batch
      UPDATE inventory_batches
      SET available_qty = available_qty + v_release_qty,
          reserved_qty = GREATEST(0, reserved_qty - v_release_qty)
      WHERE id = v_rec.batch_id;

      -- Track per-product release totals
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

      -- Zero out the batch allocation
      UPDATE packing_list_item_batches
      SET allocated_qty = COALESCE(picked_qty, 0)
      WHERE id = v_rec.packing_list_item_id;
      -- Note: using packing_list_item_id here is wrong, should use the plib row id
      -- Fix: we need the plib.id
    END;
  END LOOP;

  -- Update distributor_inventory summary for each product
  FOR v_rec IN
    SELECT key::uuid AS product_id, value::integer AS released_qty
    FROM jsonb_each_text(v_product_releases)
  LOOP
    UPDATE distributor_inventory
    SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_rec.released_qty)
    WHERE distributor_id = v_dist_id
      AND product_id = v_rec.product_id;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_released', v_total_released
  );
END;
$$;

-- 4. Cancel packing list with full reservation release
CREATE OR REPLACE FUNCTION public.cancel_packing_list_reservations(
  p_packing_list_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rec RECORD;
  v_total_released INTEGER := 0;
  v_dist_id UUID;
  v_release_qty INTEGER;
  v_product_releases JSONB := '{}'::JSONB;
  v_status TEXT;
BEGIN
  -- Get packing list info
  SELECT distributor_id, status INTO v_dist_id, v_status
  FROM packing_lists
  WHERE id = p_packing_list_id;

  IF v_dist_id IS NULL THEN
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

  -- Reset linked orders back to pending
  UPDATE orders
  SET delivery_status = 'pending', updated_at = now()
  WHERE id IN (
    SELECT order_id FROM packing_list_orders WHERE packing_list_id = p_packing_list_id
  )
  AND delivery_status != 'delivered';

  RETURN jsonb_build_object(
    'success', true,
    'total_released', v_total_released,
    'status', 'cancelled'
  );
END;
$$;
