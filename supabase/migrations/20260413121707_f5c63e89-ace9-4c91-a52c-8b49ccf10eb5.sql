
-- 1. Create warehouses table
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(distributor_id, name)
);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage warehouses"
  ON public.warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Add warehouse_id columns
ALTER TABLE public.distributor_inventory
  ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id);

ALTER TABLE public.distributor_inventory_transactions
  ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id);

ALTER TABLE public.inventory_batches
  ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id);

-- 3. Data migration: create default warehouse per distributor and backfill
DO $$
DECLARE
  r RECORD;
  wh_id UUID;
BEGIN
  -- Get distinct distributor_ids from inventory
  FOR r IN
    SELECT DISTINCT distributor_id FROM distributor_inventory
    UNION
    SELECT DISTINCT distributor_id FROM distributor_inventory_transactions
    UNION
    SELECT DISTINCT distributor_id FROM inventory_batches
  LOOP
    -- Create default warehouse
    INSERT INTO warehouses (distributor_id, name, code, is_default)
    VALUES (r.distributor_id, 'Main Warehouse', 'MAIN', true)
    ON CONFLICT (distributor_id, name) DO NOTHING
    RETURNING id INTO wh_id;

    -- If already existed, fetch its id
    IF wh_id IS NULL THEN
      SELECT id INTO wh_id FROM warehouses
      WHERE distributor_id = r.distributor_id AND name = 'Main Warehouse';
    END IF;

    -- Backfill
    UPDATE distributor_inventory SET warehouse_id = wh_id
    WHERE distributor_id = r.distributor_id AND warehouse_id IS NULL;

    UPDATE distributor_inventory_transactions SET warehouse_id = wh_id
    WHERE distributor_id = r.distributor_id AND warehouse_id IS NULL;

    UPDATE inventory_batches SET warehouse_id = wh_id
    WHERE distributor_id = r.distributor_id AND warehouse_id IS NULL;
  END LOOP;
END;
$$;

-- 4. Update batch uniqueness to include warehouse_id
-- Drop old constraint if exists, add new one
DO $$
BEGIN
  -- Try dropping the old unique constraint (may have different names)
  BEGIN
    ALTER TABLE inventory_batches DROP CONSTRAINT IF EXISTS inventory_batches_distributor_id_product_id_batch_no_key;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE inventory_batches DROP CONSTRAINT IF EXISTS idx_unique_batch;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE inventory_batches DROP CONSTRAINT IF EXISTS inventory_batches_distributor_id_product_id_batch_no_warehou;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

ALTER TABLE inventory_batches
  ADD CONSTRAINT inventory_batches_dist_prod_batch_wh_unique
  UNIQUE(distributor_id, product_id, batch_no, warehouse_id);

-- 5. Create index for warehouse lookups
CREATE INDEX IF NOT EXISTS idx_warehouses_distributor ON warehouses(distributor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON distributor_inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transactions_warehouse ON distributor_inventory_transactions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_batches_warehouse ON inventory_batches(warehouse_id);

-- 6. Replace execute_stock_action with warehouse support
DROP FUNCTION IF EXISTS public.execute_stock_action(UUID, UUID, TEXT, INTEGER, TEXT, UUID, TEXT, DATE, UUID, TEXT);

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
  p_reference_number TEXT DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL
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
  v_wh_id UUID;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
  END IF;

  -- Resolve warehouse: use provided or fall back to default
  v_wh_id := p_warehouse_id;
  IF v_wh_id IS NULL THEN
    SELECT id INTO v_wh_id FROM warehouses
    WHERE distributor_id = p_distributor_id AND is_default = true
    LIMIT 1;
  END IF;

  -- If still no warehouse, create a default one
  IF v_wh_id IS NULL THEN
    INSERT INTO warehouses (distributor_id, name, code, is_default)
    VALUES (p_distributor_id, 'Main Warehouse', 'MAIN', true)
    ON CONFLICT (distributor_id, name) DO NOTHING
    RETURNING id INTO v_wh_id;

    IF v_wh_id IS NULL THEN
      SELECT id INTO v_wh_id FROM warehouses
      WHERE distributor_id = p_distributor_id AND name = 'Main Warehouse';
    END IF;
  END IF;

  -- Lock the inventory row for update (now warehouse-aware)
  SELECT * INTO v_inventory
  FROM distributor_inventory
  WHERE distributor_id = p_distributor_id AND product_id = p_product_id AND warehouse_id = v_wh_id
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
      -- Guard: one-time per product per distributor per warehouse
      IF EXISTS (
        SELECT 1 FROM distributor_inventory_transactions
        WHERE distributor_id = p_distributor_id
          AND product_id = p_product_id
          AND warehouse_id = v_wh_id
          AND transaction_type = 'OPENING_STOCK'
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Opening stock already exists for this product in this warehouse');
      END IF;

      IF v_inventory.id IS NULL THEN
        INSERT INTO distributor_inventory (
          distributor_id, product_id, product_name, quantity,
          reserved_quantity, available_quantity, damaged_quantity, expired_quantity,
          unit, batch_number, expiry_date, warehouse_id
        )
        SELECT p_distributor_id, p_product_id, COALESCE(p.name, 'Product'), p_quantity,
               0, p_quantity, 0, 0,
               COALESCE(p.unit, 'pcs'), p_batch_no, p_expiry_date, v_wh_id
        FROM products p WHERE p.id = p_product_id;

        IF NOT FOUND THEN
          INSERT INTO distributor_inventory (
            distributor_id, product_id, product_name, quantity,
            reserved_quantity, available_quantity, damaged_quantity, expired_quantity,
            unit, warehouse_id
          ) VALUES (
            p_distributor_id, p_product_id, COALESCE(p_notes, 'Product'), p_quantity,
            0, p_quantity, 0, 0, 'pcs', v_wh_id
          );
        END IF;
      ELSE
        v_new_quantity := v_new_quantity + p_quantity;
      END IF;

      -- Insert batch if batch_no provided
      IF p_batch_no IS NOT NULL AND p_batch_no != '' THEN
        INSERT INTO inventory_batches (distributor_id, product_id, batch_no, expiry_date, available_qty, warehouse_id)
        VALUES (p_distributor_id, p_product_id, p_batch_no, p_expiry_date, p_quantity, v_wh_id)
        ON CONFLICT (distributor_id, product_id, batch_no, warehouse_id)
        DO UPDATE SET available_qty = inventory_batches.available_qty + EXCLUDED.available_qty
        RETURNING id INTO v_batch_id;
      END IF;

      v_txn_type := 'OPENING_STOCK';
      v_movement := 'NULL → Available';

    WHEN 'GRN' THEN
      IF v_inventory.id IS NULL THEN
        INSERT INTO distributor_inventory (
          distributor_id, product_id, product_name, quantity,
          reserved_quantity, available_quantity, damaged_quantity, expired_quantity,
          unit, batch_number, expiry_date, warehouse_id
        )
        SELECT p_distributor_id, p_product_id, COALESCE(p.name, 'Product'), p_quantity,
               0, p_quantity, 0, 0,
               COALESCE(p.unit, 'pcs'), p_batch_no, p_expiry_date, v_wh_id
        FROM products p WHERE p.id = p_product_id;

        IF NOT FOUND THEN
          INSERT INTO distributor_inventory (
            distributor_id, product_id, product_name, quantity,
            reserved_quantity, available_quantity, damaged_quantity, expired_quantity,
            unit, warehouse_id
          ) VALUES (
            p_distributor_id, p_product_id, COALESCE(p_notes, 'Product'), p_quantity,
            0, p_quantity, 0, 0, 'pcs', v_wh_id
          );
        END IF;
      ELSE
        v_new_quantity := v_new_quantity + p_quantity;
      END IF;

      -- Insert/update batch
      IF p_batch_no IS NOT NULL AND p_batch_no != '' THEN
        INSERT INTO inventory_batches (distributor_id, product_id, batch_no, expiry_date, available_qty, warehouse_id)
        VALUES (p_distributor_id, p_product_id, p_batch_no, p_expiry_date, p_quantity, v_wh_id)
        ON CONFLICT (distributor_id, product_id, batch_no, warehouse_id)
        DO UPDATE SET available_qty = inventory_batches.available_qty + EXCLUDED.available_qty
        RETURNING id INTO v_batch_id;
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

  -- Update inventory summary row
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
    batch_number, expiry_date, notes, created_by, warehouse_id
  ) VALUES (
    p_distributor_id, p_product_id, v_txn_type, p_quantity,
    CASE WHEN v_inventory.id IS NOT NULL THEN v_new_quantity ELSE p_quantity END,
    p_reference_id, p_reference_number,
    p_batch_no, p_expiry_date,
    COALESCE(p_notes, '') || ' [' || v_movement || ']', p_created_by, v_wh_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'quantity', p_quantity,
    'new_available', CASE WHEN v_inventory.id IS NOT NULL THEN v_new_quantity - v_new_reserved ELSE p_quantity END,
    'movement', v_movement,
    'batch_id', v_batch_id,
    'warehouse_id', v_wh_id
  );
END;
$$;
