
-- 1. Add SELECT policy for distributor_inventory_transactions
CREATE POLICY "Distributors can view their transactions"
ON public.distributor_inventory_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM distributor_users du
    WHERE du.auth_user_id = auth.uid()
      AND du.distributor_id = distributor_inventory_transactions.distributor_id
      AND du.is_active = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Fix allocate_inventory_batches: remove available_quantity write
CREATE OR REPLACE FUNCTION public.allocate_inventory_batches(
  p_distributor_id uuid,
  p_product_id uuid,
  p_required_qty integer,
  p_strategy text DEFAULT 'FEFO'
)
RETURNS jsonb
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
    ORDER BY
      CASE WHEN p_strategy = 'FEFO' THEN expiry_date END ASC NULLS LAST,
      CASE WHEN p_strategy = 'FIFO' THEN created_at END ASC,
      CASE WHEN p_strategy = 'LIFO' THEN created_at END DESC
    FOR UPDATE;
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

  -- Update summary row: only touch reserved_quantity (available_quantity is generated)
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

-- 3. Fix release_batch_reservation: remove available_quantity write
CREATE OR REPLACE FUNCTION public.release_batch_reservation(p_batch_id uuid, p_qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch RECORD;
BEGIN
  SELECT id, distributor_id, product_id, reserved_qty
  INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch not found: %', p_batch_id;
  END IF;

  UPDATE inventory_batches
  SET reserved_qty = GREATEST(0, reserved_qty - p_qty),
      available_qty = available_qty + p_qty
  WHERE id = p_batch_id;

  -- Update summary: only touch reserved_quantity (available_quantity is generated)
  UPDATE distributor_inventory
  SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_qty)
  WHERE distributor_id = v_batch.distributor_id
    AND product_id = v_batch.product_id;
END;
$$;

-- 4. Fix dispatch_batch_stock: ensure warehouse_id is included in ledger insert
CREATE OR REPLACE FUNCTION public.dispatch_batch_stock(
  p_distributor_id uuid,
  p_product_id uuid,
  p_batch_id uuid,
  p_qty integer,
  p_packing_list_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch RECORD;
  v_product_name TEXT;
  v_wh_id UUID;
BEGIN
  SELECT id, reserved_qty, batch_no, warehouse_id
  INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch not found: %', p_batch_id;
  END IF;

  IF v_batch.reserved_qty < p_qty THEN
    RAISE EXCEPTION 'Insufficient reserved stock in batch %: has %, needs %',
      v_batch.batch_no, v_batch.reserved_qty, p_qty;
  END IF;

  v_wh_id := v_batch.warehouse_id;

  UPDATE inventory_batches
  SET reserved_qty = reserved_qty - p_qty
  WHERE id = p_batch_id;

  -- Deduct from summary (available_quantity is generated, don't touch it)
  UPDATE distributor_inventory
  SET quantity = GREATEST(0, quantity - p_qty),
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_qty)
  WHERE distributor_id = p_distributor_id
    AND product_id = p_product_id;

  SELECT name INTO v_product_name FROM products WHERE id = p_product_id;

  -- Insert ledger entry with warehouse_id (NOT NULL column)
  INSERT INTO distributor_inventory_transactions (
    distributor_id, product_id, product_name, transaction_type,
    quantity, reference_type, reference_id, notes, warehouse_id, batch_number
  ) VALUES (
    p_distributor_id, p_product_id, v_product_name, 'DISPATCH',
    p_qty, 'packing_list', p_packing_list_id,
    'Batch ' || v_batch.batch_no || ' dispatched', v_wh_id, v_batch.batch_no
  );
END;
$$;
