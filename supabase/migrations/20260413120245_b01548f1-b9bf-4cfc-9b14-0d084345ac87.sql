
-- Step 1a: Replace allocate_inventory_batches with partial allocation support
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

  -- Update summary row
  IF v_total_allocated > 0 THEN
    UPDATE distributor_inventory
    SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_total_allocated,
        available_quantity = GREATEST(0, COALESCE(available_quantity, quantity) - v_total_allocated)
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

-- Step 1b: Replace dispatch_batch_stock with FOR UPDATE locking and validation
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
  v_batch RECORD;
  v_product_name TEXT;
BEGIN
  -- Lock and fetch the batch row
  SELECT id, reserved_qty, batch_no
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

  -- Deduct from batch
  UPDATE inventory_batches
  SET reserved_qty = reserved_qty - p_qty
  WHERE id = p_batch_id;

  -- Deduct from summary
  UPDATE distributor_inventory
  SET quantity = GREATEST(0, quantity - p_qty),
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_qty)
  WHERE distributor_id = p_distributor_id
    AND product_id = p_product_id;

  -- Get product name for ledger
  SELECT name INTO v_product_name FROM products WHERE id = p_product_id;

  -- Insert ledger entry
  INSERT INTO distributor_inventory_transactions (
    distributor_id, product_id, product_name, transaction_type,
    quantity, reference_type, reference_id, notes
  ) VALUES (
    p_distributor_id, p_product_id, v_product_name, 'DISPATCH',
    p_qty, 'packing_list', p_packing_list_id::TEXT,
    'Batch ' || v_batch.batch_no || ' dispatched'
  );
END;
$$;

-- Step 1c: Add product_name column (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'distributor_inventory_transactions'
      AND column_name = 'product_name'
  ) THEN
    ALTER TABLE public.distributor_inventory_transactions ADD COLUMN product_name TEXT;
  END IF;
END $$;

-- Step 1d: Add balance_qty column (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'distributor_inventory_transactions'
      AND column_name = 'balance_qty'
  ) THEN
    ALTER TABLE public.distributor_inventory_transactions ADD COLUMN balance_qty INTEGER;
  END IF;
END $$;

-- Step 1e: Add unique constraint for batch merge (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_batches_distributor_product_batchno_key'
  ) THEN
    ALTER TABLE public.inventory_batches
    ADD CONSTRAINT inventory_batches_distributor_product_batchno_key
    UNIQUE (distributor_id, product_id, batch_no);
  END IF;
EXCEPTION WHEN unique_violation THEN
  -- Duplicates exist, skip constraint
  RAISE NOTICE 'Cannot add unique constraint — duplicate batch entries exist';
END $$;

-- Step 1f: Index on transactions(product_id)
CREATE INDEX IF NOT EXISTS idx_dit_product_id
ON public.distributor_inventory_transactions (product_id);

-- Step 1g: Negative stock protection trigger
CREATE OR REPLACE FUNCTION public.prevent_negative_batch_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.available_qty < 0 THEN
    RAISE EXCEPTION 'available_qty cannot be negative for batch %', NEW.batch_no;
  END IF;
  IF NEW.reserved_qty < 0 THEN
    RAISE EXCEPTION 'reserved_qty cannot be negative for batch %', NEW.batch_no;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_negative_batch_stock ON public.inventory_batches;
CREATE TRIGGER trg_prevent_negative_batch_stock
  BEFORE UPDATE ON public.inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_negative_batch_stock();

-- Step 6: Running balance trigger
CREATE OR REPLACE FUNCTION public.calc_transaction_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev_balance INTEGER;
  v_inward BOOLEAN;
BEGIN
  -- Get previous balance for this product+distributor
  SELECT balance_qty INTO v_prev_balance
  FROM distributor_inventory_transactions
  WHERE distributor_id = NEW.distributor_id
    AND product_id = NEW.product_id
    AND id != NEW.id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  v_prev_balance := COALESCE(v_prev_balance, 0);

  -- Determine direction
  v_inward := NEW.transaction_type IN ('GRN', 'OPENING_STOCK', 'RETURN', 'ADJUSTMENT_IN');

  IF v_inward THEN
    NEW.balance_qty := v_prev_balance + NEW.quantity;
  ELSE
    NEW.balance_qty := v_prev_balance - NEW.quantity;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_transaction_balance ON public.distributor_inventory_transactions;
CREATE TRIGGER trg_calc_transaction_balance
  BEFORE INSERT ON public.distributor_inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.calc_transaction_balance();
