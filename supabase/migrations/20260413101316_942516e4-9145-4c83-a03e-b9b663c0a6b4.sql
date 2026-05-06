
-- 1a. Add product_id to distributor_inventory
ALTER TABLE distributor_inventory ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE distributor_inventory ADD COLUMN IF NOT EXISTS damaged_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE distributor_inventory ADD COLUMN IF NOT EXISTS expired_quantity INTEGER NOT NULL DEFAULT 0;

-- Backfill product_id from product_name
UPDATE distributor_inventory di
SET product_id = p.id
FROM products p
WHERE p.name = di.product_name
  AND di.product_id IS NULL;

-- 1b. Add product_id to distributor_inventory_transactions
ALTER TABLE distributor_inventory_transactions ADD COLUMN IF NOT EXISTS product_id UUID;

-- Backfill transactions product_id using reference_id (primary_order) + quantity matching
UPDATE distributor_inventory_transactions dit
SET product_id = poi.product_id
FROM primary_order_items poi
WHERE dit.reference_id = poi.order_id
  AND dit.quantity = poi.quantity
  AND dit.product_id IS NULL;

-- For any remaining unmatched transactions, try to match via the inventory table
UPDATE distributor_inventory_transactions dit
SET product_id = di.product_id
FROM distributor_inventory di
WHERE di.distributor_id = dit.distributor_id
  AND dit.product_id IS NULL
  AND di.product_id IS NOT NULL;

-- 1c. Create inventory_batches table
CREATE TABLE IF NOT EXISTS public.inventory_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  distributor_id UUID NOT NULL,
  product_id UUID NOT NULL,
  batch_no TEXT NOT NULL,
  expiry_date DATE,
  available_qty INTEGER NOT NULL DEFAULT 0,
  reserved_qty INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inventory batches"
  ON public.inventory_batches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert inventory batches"
  ON public.inventory_batches FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory batches"
  ON public.inventory_batches FOR UPDATE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_lookup 
  ON inventory_batches (distributor_id, product_id, batch_no);

-- 1d. Create check_opening_stock_exists function
CREATE OR REPLACE FUNCTION public.check_opening_stock_exists(
  p_distributor_id UUID,
  p_product_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM distributor_inventory_transactions
    WHERE distributor_id = p_distributor_id
      AND product_id = p_product_id
      AND transaction_type = 'OPENING_STOCK'
  );
END;
$$;

-- 1e. Drop and recreate execute_stock_action with batch support + GRN + guard
DROP FUNCTION IF EXISTS public.execute_stock_action(UUID, UUID, TEXT, INTEGER, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.execute_stock_action(
  p_distributor_id UUID,
  p_product_id UUID,
  p_action TEXT,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_batch_no TEXT DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory RECORD;
  v_new_available INTEGER;
  v_new_reserved INTEGER;
  v_new_damaged INTEGER;
  v_new_expired INTEGER;
  v_new_quantity INTEGER;
  v_txn_type TEXT;
  v_movement TEXT;
  v_batch_id UUID;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
  END IF;

  -- Lock the inventory row for update
  SELECT * INTO v_inventory
  FROM distributor_inventory
  WHERE distributor_id = p_distributor_id AND product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND AND p_action NOT IN ('OPENING_STOCK', 'GRN') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found in inventory');
  END IF;

  -- Initialize defaults
  v_new_quantity := COALESCE(v_inventory.quantity, 0);
  v_new_reserved := COALESCE(v_inventory.reserved_quantity, 0);
  v_new_damaged := COALESCE(v_inventory.damaged_quantity, 0);
  v_new_expired := COALESCE(v_inventory.expired_quantity, 0);

  CASE p_action
    WHEN 'OPENING_STOCK' THEN
      -- Guard: one-time per product per distributor
      IF EXISTS (
        SELECT 1 FROM distributor_inventory_transactions
        WHERE distributor_id = p_distributor_id
          AND product_id = p_product_id
          AND transaction_type = 'OPENING_STOCK'
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Opening stock already exists for this product');
      END IF;

      IF v_inventory.id IS NULL THEN
        -- Get product name for the summary row
        INSERT INTO distributor_inventory (
          distributor_id, product_id, product_name, quantity, 
          reserved_quantity, available_quantity, damaged_quantity, expired_quantity,
          unit, batch_number, expiry_date
        )
        SELECT p_distributor_id, p_product_id, COALESCE(p.name, 'Product'), p_quantity,
               0, p_quantity, 0, 0,
               COALESCE(p.unit, 'pcs'), p_batch_no, p_expiry_date
        FROM products p WHERE p.id = p_product_id;
        
        -- If product not found in products table, insert with notes as name
        IF NOT FOUND THEN
          INSERT INTO distributor_inventory (
            distributor_id, product_id, product_name, quantity,
            reserved_quantity, available_quantity, damaged_quantity, expired_quantity,
            unit
          ) VALUES (
            p_distributor_id, p_product_id, COALESCE(p_notes, 'Product'), p_quantity,
            0, 0 + p_quantity, 0, 0, 'pcs'
          );
        END IF;
      ELSE
        v_new_quantity := v_new_quantity + p_quantity;
      END IF;

      -- Insert batch if batch_no provided
      IF p_batch_no IS NOT NULL AND p_batch_no != '' THEN
        INSERT INTO inventory_batches (distributor_id, product_id, batch_no, expiry_date, available_qty)
        VALUES (p_distributor_id, p_product_id, p_batch_no, p_expiry_date, p_quantity)
        RETURNING id INTO v_batch_id;
      END IF;

      v_txn_type := 'OPENING_STOCK';
      v_movement := 'NULL → Available';

    WHEN 'GRN' THEN
      IF v_inventory.id IS NULL THEN
        -- Create new inventory row
        INSERT INTO distributor_inventory (
          distributor_id, product_id, product_name, quantity,
          reserved_quantity, available_quantity, damaged_quantity, expired_quantity,
          unit, batch_number, expiry_date
        )
        SELECT p_distributor_id, p_product_id, COALESCE(p.name, 'Product'), p_quantity,
               0, p_quantity, 0, 0,
               COALESCE(p.unit, 'pcs'), p_batch_no, p_expiry_date
        FROM products p WHERE p.id = p_product_id;
        
        IF NOT FOUND THEN
          INSERT INTO distributor_inventory (
            distributor_id, product_id, product_name, quantity,
            reserved_quantity, available_quantity, damaged_quantity, expired_quantity,
            unit
          ) VALUES (
            p_distributor_id, p_product_id, COALESCE(p_notes, 'Product'), p_quantity,
            0, p_quantity, 0, 0, 'pcs'
          );
        END IF;
      ELSE
        v_new_quantity := v_new_quantity + p_quantity;
      END IF;

      -- Insert batch if batch_no provided
      IF p_batch_no IS NOT NULL AND p_batch_no != '' THEN
        -- Check if batch exists and update, otherwise insert
        UPDATE inventory_batches
        SET available_qty = available_qty + p_quantity
        WHERE distributor_id = p_distributor_id
          AND product_id = p_product_id
          AND batch_no = p_batch_no;
        
        IF NOT FOUND THEN
          INSERT INTO inventory_batches (distributor_id, product_id, batch_no, expiry_date, available_qty)
          VALUES (p_distributor_id, p_product_id, p_batch_no, p_expiry_date, p_quantity)
          RETURNING id INTO v_batch_id;
        END IF;
      END IF;

      v_txn_type := 'GRN';
      v_movement := 'Inward → Available';

    WHEN 'RESERVE' THEN
      v_new_available := COALESCE(v_inventory.available_quantity, v_new_quantity - v_new_reserved);
      IF v_new_available < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available stock. Available: ' || v_new_available);
      END IF;
      v_new_reserved := v_new_reserved + p_quantity;
      v_txn_type := 'RESERVED';
      v_movement := 'Available → Reserved';

    WHEN 'RELEASE' THEN
      IF v_new_reserved < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient reserved stock. Reserved: ' || v_new_reserved);
      END IF;
      v_new_reserved := v_new_reserved - p_quantity;
      v_txn_type := 'RELEASED';
      v_movement := 'Reserved → Available';

    WHEN 'MARK_DAMAGED' THEN
      v_new_available := COALESCE(v_inventory.available_quantity, v_new_quantity - v_new_reserved);
      IF v_new_available < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available stock. Available: ' || v_new_available);
      END IF;
      v_new_quantity := v_new_quantity - p_quantity;
      v_new_damaged := v_new_damaged + p_quantity;
      v_txn_type := 'DAMAGE';
      v_movement := 'Available → Damaged';

    WHEN 'MARK_EXPIRED' THEN
      v_new_available := COALESCE(v_inventory.available_quantity, v_new_quantity - v_new_reserved);
      IF v_new_available < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available stock. Available: ' || v_new_available);
      END IF;
      v_new_quantity := v_new_quantity - p_quantity;
      v_new_expired := v_new_expired + p_quantity;
      v_txn_type := 'EXPIRY';
      v_movement := 'Available → Expired';

    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Unknown action: ' || p_action);
  END CASE;

  -- Update inventory summary row (skip for new inserts in OPENING_STOCK/GRN)
  IF v_inventory.id IS NOT NULL THEN
    UPDATE distributor_inventory
    SET quantity = v_new_quantity,
        reserved_quantity = v_new_reserved,
        available_quantity = v_new_quantity - v_new_reserved,
        damaged_quantity = v_new_damaged,
        expired_quantity = v_new_expired,
        updated_at = now()
    WHERE id = v_inventory.id;
  END IF;

  -- Log transaction
  INSERT INTO distributor_inventory_transactions (
    distributor_id, product_id, transaction_type, quantity,
    running_balance, reference_id, reference_number, 
    batch_number, expiry_date, notes, created_by
  ) VALUES (
    p_distributor_id, p_product_id, v_txn_type, p_quantity,
    CASE WHEN v_inventory.id IS NOT NULL THEN v_new_quantity ELSE p_quantity END,
    p_reference_id, p_reference_number,
    p_batch_no, p_expiry_date,
    COALESCE(p_notes, '') || ' [' || v_movement || ']', p_created_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'quantity', p_quantity,
    'new_available', CASE WHEN v_inventory.id IS NOT NULL THEN v_new_quantity - v_new_reserved ELSE p_quantity END,
    'movement', v_movement,
    'batch_id', v_batch_id
  );
END;
$$;
