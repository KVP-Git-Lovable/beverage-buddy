
-- 1. Create packing_list_item_batches table
CREATE TABLE public.packing_list_item_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  packing_list_item_id UUID NOT NULL REFERENCES public.packing_list_items(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.inventory_batches(id),
  allocated_qty INTEGER NOT NULL DEFAULT 0,
  picked_qty INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plib_item ON public.packing_list_item_batches(packing_list_item_id);
CREATE INDEX idx_plib_batch ON public.packing_list_item_batches(batch_id);

ALTER TABLE public.packing_list_item_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read packing_list_item_batches"
  ON public.packing_list_item_batches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert packing_list_item_batches"
  ON public.packing_list_item_batches FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update packing_list_item_batches"
  ON public.packing_list_item_batches FOR UPDATE TO authenticated USING (true);

-- 2. allocate_inventory_batches RPC
CREATE OR REPLACE FUNCTION public.allocate_inventory_batches(
  p_distributor_id UUID,
  p_product_id UUID,
  p_required_qty INTEGER,
  p_strategy TEXT DEFAULT 'FEFO'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_remaining INTEGER := p_required_qty;
  v_allocated INTEGER;
  v_result JSONB := '[]'::jsonb;
  v_total_available INTEGER := 0;
BEGIN
  IF p_required_qty <= 0 THEN
    RAISE EXCEPTION 'Required quantity must be positive';
  END IF;

  -- Check total available first
  SELECT COALESCE(SUM(available_qty), 0) INTO v_total_available
  FROM inventory_batches
  WHERE distributor_id = p_distributor_id
    AND product_id = p_product_id
    AND available_qty > 0;

  IF v_total_available < p_required_qty THEN
    RAISE EXCEPTION 'Insufficient batch stock. Available: %, Required: %', v_total_available, p_required_qty;
  END IF;

  -- Lock and iterate batches by strategy
  FOR v_batch IN
    SELECT id, batch_no, expiry_date, available_qty
    FROM inventory_batches
    WHERE distributor_id = p_distributor_id
      AND product_id = p_product_id
      AND available_qty > 0
    ORDER BY
      CASE WHEN p_strategy = 'FEFO' THEN expiry_date END ASC NULLS LAST,
      CASE WHEN p_strategy = 'FIFO' THEN created_at END ASC,
      CASE WHEN p_strategy = 'LIFO' THEN created_at END DESC,
      created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_allocated := LEAST(v_batch.available_qty, v_remaining);

    UPDATE inventory_batches
    SET available_qty = available_qty - v_allocated,
        reserved_qty = reserved_qty + v_allocated
    WHERE id = v_batch.id;

    v_result := v_result || jsonb_build_object(
      'batch_id', v_batch.id,
      'batch_no', v_batch.batch_no,
      'expiry_date', v_batch.expiry_date,
      'allocated_qty', v_allocated
    );

    v_remaining := v_remaining - v_allocated;
  END LOOP;

  -- Update summary row
  UPDATE distributor_inventory
  SET reserved_quantity = COALESCE(reserved_quantity, 0) + p_required_qty,
      available_quantity = GREATEST(0, COALESCE(available_quantity, quantity) - p_required_qty)
  WHERE distributor_id = p_distributor_id
    AND product_id = p_product_id;

  RETURN v_result;
END;
$$;

-- 3. release_batch_reservation RPC
CREATE OR REPLACE FUNCTION public.release_batch_reservation(
  p_batch_id UUID,
  p_qty INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Update summary
  UPDATE distributor_inventory
  SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_qty),
      available_quantity = COALESCE(available_quantity, 0) + p_qty
  WHERE distributor_id = v_batch.distributor_id
    AND product_id = v_batch.product_id;
END;
$$;

-- 4. dispatch_batch_stock RPC
CREATE OR REPLACE FUNCTION public.dispatch_batch_stock(
  p_distributor_id UUID,
  p_product_id UUID,
  p_batch_id UUID,
  p_qty INTEGER,
  p_packing_list_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_name TEXT;
BEGIN
  -- Deduct from batch reserved
  UPDATE inventory_batches
  SET reserved_qty = GREATEST(0, reserved_qty - p_qty)
  WHERE id = p_batch_id;

  -- Deduct from summary
  UPDATE distributor_inventory
  SET quantity = GREATEST(0, quantity - p_qty),
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_qty)
  WHERE distributor_id = p_distributor_id
    AND product_id = p_product_id;

  -- Get product name for ledger
  SELECT product_name INTO v_product_name
  FROM distributor_inventory
  WHERE distributor_id = p_distributor_id
    AND product_id = p_product_id
  LIMIT 1;

  -- Insert ledger entry
  INSERT INTO distributor_inventory_transactions (
    distributor_id, product_id, product_name, transaction_type,
    quantity, reference_number, notes
  ) VALUES (
    p_distributor_id, p_product_id, COALESCE(v_product_name, 'Unknown'),
    'DISPATCH', p_qty,
    p_packing_list_id::text,
    'Dispatched via packing list'
  );
END;
$$;
