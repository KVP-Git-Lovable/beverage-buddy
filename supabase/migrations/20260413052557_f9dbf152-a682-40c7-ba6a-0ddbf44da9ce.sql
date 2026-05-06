
-- Add damaged and expired quantity columns
ALTER TABLE public.distributor_inventory
  ADD COLUMN IF NOT EXISTS damaged_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expired_quantity INTEGER NOT NULL DEFAULT 0;

-- Create opening stock entries table
CREATE TABLE IF NOT EXISTS public.opening_stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.opening_stock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view opening stock entries"
  ON public.opening_stock_entries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert opening stock entries"
  ON public.opening_stock_entries FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create atomic stock action RPC
CREATE OR REPLACE FUNCTION public.execute_stock_action(
  p_distributor_id UUID,
  p_product_id UUID,
  p_action TEXT,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
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
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
  END IF;

  -- Lock the row for update
  SELECT * INTO v_inventory
  FROM distributor_inventory
  WHERE distributor_id = p_distributor_id AND product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND AND p_action != 'OPENING_STOCK' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found in inventory');
  END IF;

  -- Initialize defaults from current row or zeros
  v_new_quantity := COALESCE(v_inventory.quantity, 0);
  v_new_reserved := COALESCE(v_inventory.reserved_quantity, 0);
  v_new_damaged := COALESCE(v_inventory.damaged_quantity, 0);
  v_new_expired := COALESCE(v_inventory.expired_quantity, 0);

  CASE p_action
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

    WHEN 'OPENING_STOCK' THEN
      IF v_inventory.id IS NULL THEN
        -- Insert new inventory row
        INSERT INTO distributor_inventory (distributor_id, product_id, product_name, quantity, reserved_quantity, available_quantity, damaged_quantity, expired_quantity)
        VALUES (p_distributor_id, p_product_id, COALESCE(p_notes, 'Product'), p_quantity, 0, p_quantity, 0, 0);
      ELSE
        v_new_quantity := v_new_quantity + p_quantity;
      END IF;
      v_txn_type := 'OPENING_STOCK';
      v_movement := 'NULL → Available';

    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Unknown action: ' || p_action);
  END CASE;

  -- Update inventory row (skip for new OPENING_STOCK inserts)
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
    running_balance, notes, created_by
  ) VALUES (
    p_distributor_id, p_product_id, v_txn_type, p_quantity,
    v_new_quantity, COALESCE(p_notes, '') || ' [' || v_movement || ']', p_created_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'quantity', p_quantity,
    'new_available', v_new_quantity - v_new_reserved,
    'movement', v_movement
  );
END;
$$;
