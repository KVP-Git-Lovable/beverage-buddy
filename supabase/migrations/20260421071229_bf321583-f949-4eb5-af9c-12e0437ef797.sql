-- =========================================
-- Part B: Scalable Batch Number Management
-- + Part A: Fix opening stock multi-batch
-- =========================================

-- 1. Extend inventory_batches with new columns
ALTER TABLE public.inventory_batches
  ADD COLUMN IF NOT EXISTS system_batch_code text,
  ADD COLUMN IF NOT EXISTS supplier_batch_code text,
  ADD COLUMN IF NOT EXISTS mfg_date date;

-- 2. Backfill system_batch_code from existing batch_no for legacy rows
UPDATE public.inventory_batches
SET system_batch_code = batch_no
WHERE system_batch_code IS NULL;

-- 3. Add UNIQUE (warehouse_id, product_id, system_batch_code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_batches_wh_prod_syscode_unique'
  ) THEN
    ALTER TABLE public.inventory_batches
      ADD CONSTRAINT inventory_batches_wh_prod_syscode_unique
      UNIQUE (warehouse_id, product_id, system_batch_code);
  END IF;
END $$;

-- 4. Helper: generate_system_batch_code
CREATE OR REPLACE FUNCTION public.generate_system_batch_code(
  p_warehouse_id uuid,
  p_product_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wh_code text;
  v_prod_code text;
  v_date_part text;
  v_prefix text;
  v_seq int;
  v_code text;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(code), ''), 'WH') INTO v_wh_code
  FROM public.warehouses WHERE id = p_warehouse_id;
  IF v_wh_code IS NULL THEN v_wh_code := 'WH'; END IF;

  SELECT COALESCE(NULLIF(TRIM(sku), ''), 'PRD') INTO v_prod_code
  FROM public.products WHERE id = p_product_id;
  IF v_prod_code IS NULL THEN v_prod_code := 'PRD'; END IF;

  v_date_part := to_char(p_date, 'YYMMDD');
  v_prefix := v_wh_code || '-' || v_date_part || '-' || v_prod_code || '-';

  -- Find max sequence with this prefix in this wh+product
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(system_batch_code, '^' || v_prefix, ''), '') AS int)
  ), 0)
  INTO v_seq
  FROM public.inventory_batches
  WHERE warehouse_id = p_warehouse_id
    AND product_id = p_product_id
    AND system_batch_code LIKE v_prefix || '%'
    AND system_batch_code ~ ('^' || v_prefix || '[0-9]+$');

  v_seq := v_seq + 1;
  v_code := v_prefix || lpad(v_seq::text, 3, '0');
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_system_batch_code(uuid, uuid, date) TO authenticated, anon;

-- 5. Relax check_opening_stock_exists to always allow new batches
CREATE OR REPLACE FUNCTION public.check_opening_stock_exists(
  p_distributor_id uuid,
  p_product_id uuid,
  p_warehouse_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Multi-batch opening stock now allowed; never block from UI.
  RETURN false;
END;
$$;

-- 6. Rewrite execute_stock_action: fix opening stock multi-batch + auto-generate batch + supplier_batch_code
CREATE OR REPLACE FUNCTION public.execute_stock_action(
  p_distributor_id uuid,
  p_product_id uuid,
  p_action text,
  p_quantity integer,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_warehouse_id uuid DEFAULT NULL,
  p_batch_no text DEFAULT NULL,
  p_expiry_date date DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_supplier_batch_code text DEFAULT NULL,
  p_mfg_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  v_system_batch_code TEXT;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
  END IF;

  v_wh_id := p_warehouse_id;
  IF v_wh_id IS NULL THEN
    SELECT id INTO v_wh_id
    FROM public.warehouses
    WHERE distributor_id = p_distributor_id AND is_default = true
    LIMIT 1;
  END IF;

  IF v_wh_id IS NULL THEN
    INSERT INTO public.warehouses (distributor_id, name, code, is_default)
    VALUES (p_distributor_id, 'Main Warehouse', 'MAIN', true)
    ON CONFLICT (distributor_id, name) DO NOTHING
    RETURNING id INTO v_wh_id;

    IF v_wh_id IS NULL THEN
      SELECT id INTO v_wh_id FROM public.warehouses
      WHERE distributor_id = p_distributor_id AND name = 'Main Warehouse'
      LIMIT 1;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.warehouses
    WHERE id = v_wh_id AND distributor_id = p_distributor_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid warehouse for this distributor');
  END IF;

  SELECT * INTO v_inventory
  FROM public.distributor_inventory
  WHERE distributor_id = p_distributor_id
    AND product_id = p_product_id
    AND warehouse_id = v_wh_id
  FOR UPDATE;

  IF NOT FOUND AND p_action NOT IN ('OPENING_STOCK', 'GRN') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found in inventory');
  END IF;

  v_new_quantity := COALESCE(v_inventory.quantity, 0);
  v_new_reserved := COALESCE(v_inventory.reserved_quantity, 0);
  v_new_damaged := COALESCE(v_inventory.damaged_quantity, 0);
  v_new_expired := COALESCE(v_inventory.expired_quantity, 0);

  -- For OPENING_STOCK / GRN, resolve / auto-generate the system batch code
  IF p_action IN ('OPENING_STOCK', 'GRN') THEN
    IF p_batch_no IS NULL OR TRIM(p_batch_no) = '' THEN
      v_system_batch_code := public.generate_system_batch_code(v_wh_id, p_product_id, CURRENT_DATE);
    ELSE
      v_system_batch_code := TRIM(p_batch_no);
    END IF;
  ELSE
    v_system_batch_code := p_batch_no;
  END IF;

  CASE p_action
    WHEN 'OPENING_STOCK' THEN
      IF v_inventory.id IS NULL THEN
        INSERT INTO public.distributor_inventory (
          distributor_id, product_id, product_name, quantity,
          reserved_quantity, damaged_quantity, expired_quantity,
          unit, batch_number, expiry_date, warehouse_id
        )
        SELECT p_distributor_id, p_product_id, COALESCE(p.name, 'Product'), p_quantity,
               0, 0, 0, COALESCE(p.unit, 'pcs'), v_system_batch_code, p_expiry_date, v_wh_id
        FROM public.products p WHERE p.id = p_product_id;

        IF NOT FOUND THEN
          INSERT INTO public.distributor_inventory (
            distributor_id, product_id, product_name, quantity,
            reserved_quantity, damaged_quantity, expired_quantity,
            unit, warehouse_id
          ) VALUES (
            p_distributor_id, p_product_id, COALESCE(p_notes, 'Product'), p_quantity,
            0, 0, 0, 'pcs', v_wh_id
          );
        END IF;

        v_new_quantity := p_quantity;
      ELSE
        v_new_quantity := v_new_quantity + p_quantity;
      END IF;

      INSERT INTO public.inventory_batches (
        distributor_id, product_id, batch_no, system_batch_code, supplier_batch_code,
        mfg_date, expiry_date, quantity, available_qty, warehouse_id
      ) VALUES (
        p_distributor_id, p_product_id, v_system_batch_code, v_system_batch_code, p_supplier_batch_code,
        p_mfg_date, p_expiry_date, p_quantity, p_quantity, v_wh_id
      )
      ON CONFLICT (distributor_id, product_id, batch_no, warehouse_id)
      DO UPDATE SET
        available_qty = public.inventory_batches.available_qty + EXCLUDED.available_qty,
        quantity = public.inventory_batches.quantity + EXCLUDED.quantity,
        supplier_batch_code = COALESCE(EXCLUDED.supplier_batch_code, public.inventory_batches.supplier_batch_code),
        mfg_date = COALESCE(EXCLUDED.mfg_date, public.inventory_batches.mfg_date),
        expiry_date = COALESCE(EXCLUDED.expiry_date, public.inventory_batches.expiry_date)
      RETURNING id INTO v_batch_id;

      v_txn_type := 'OPENING_STOCK';
      v_movement := 'NULL → Available';

    WHEN 'GRN' THEN
      IF v_inventory.id IS NULL THEN
        INSERT INTO public.distributor_inventory (
          distributor_id, product_id, product_name, quantity,
          reserved_quantity, damaged_quantity, expired_quantity,
          unit, batch_number, expiry_date, warehouse_id
        )
        SELECT p_distributor_id, p_product_id, COALESCE(p.name, 'Product'), p_quantity,
               0, 0, 0, COALESCE(p.unit, 'pcs'), v_system_batch_code, p_expiry_date, v_wh_id
        FROM public.products p WHERE p.id = p_product_id;

        IF NOT FOUND THEN
          INSERT INTO public.distributor_inventory (
            distributor_id, product_id, product_name, quantity,
            reserved_quantity, damaged_quantity, expired_quantity,
            unit, warehouse_id
          ) VALUES (
            p_distributor_id, p_product_id, COALESCE(p_notes, 'Product'), p_quantity,
            0, 0, 0, 'pcs', v_wh_id
          );
        END IF;
        v_new_quantity := p_quantity;
      ELSE
        v_new_quantity := v_new_quantity + p_quantity;
      END IF;

      INSERT INTO public.inventory_batches (
        distributor_id, product_id, batch_no, system_batch_code, supplier_batch_code,
        mfg_date, expiry_date, quantity, available_qty, warehouse_id
      ) VALUES (
        p_distributor_id, p_product_id, v_system_batch_code, v_system_batch_code, p_supplier_batch_code,
        p_mfg_date, p_expiry_date, p_quantity, p_quantity, v_wh_id
      )
      ON CONFLICT (distributor_id, product_id, batch_no, warehouse_id)
      DO UPDATE SET
        available_qty = public.inventory_batches.available_qty + EXCLUDED.available_qty,
        quantity = public.inventory_batches.quantity + EXCLUDED.quantity,
        supplier_batch_code = COALESCE(EXCLUDED.supplier_batch_code, public.inventory_batches.supplier_batch_code),
        mfg_date = COALESCE(EXCLUDED.mfg_date, public.inventory_batches.mfg_date),
        expiry_date = COALESCE(EXCLUDED.expiry_date, public.inventory_batches.expiry_date)
      RETURNING id INTO v_batch_id;

      v_txn_type := 'GRN';
      v_movement := 'Inward → Available';

    WHEN 'RESERVE' THEN
      IF v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available stock to reserve');
      END IF;
      v_new_reserved := v_new_reserved + p_quantity;
      v_txn_type := 'RESERVE';
      v_movement := 'Available → Reserved';

    WHEN 'RELEASE' THEN
      IF v_new_reserved < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot release more than reserved quantity');
      END IF;
      v_new_reserved := v_new_reserved - p_quantity;
      v_txn_type := 'RELEASE';
      v_movement := 'Reserved → Available';

    WHEN 'MARK_DAMAGED' THEN
      v_new_available := v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired;
      IF v_new_available < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available stock');
      END IF;
      v_new_damaged := v_new_damaged + p_quantity;
      v_txn_type := 'MARK_DAMAGED';
      v_movement := 'Available → Damaged';

    WHEN 'MARK_EXPIRED' THEN
      v_new_available := v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired;
      IF v_new_available < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available stock');
      END IF;
      v_new_expired := v_new_expired + p_quantity;
      v_txn_type := 'MARK_EXPIRED';
      v_movement := 'Available → Expired';

    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Unknown action: ' || p_action);
  END CASE;

  -- Update aggregate row when it existed
  IF v_inventory.id IS NOT NULL THEN
    UPDATE public.distributor_inventory
    SET quantity = v_new_quantity,
        reserved_quantity = v_new_reserved,
        damaged_quantity = v_new_damaged,
        expired_quantity = v_new_expired,
        updated_at = now()
    WHERE id = v_inventory.id;
  END IF;

  INSERT INTO public.distributor_inventory_transactions (
    distributor_id, product_id, transaction_type, quantity,
    notes, created_by, batch_number, reference_type, reference_id,
    reference_number, warehouse_id
  ) VALUES (
    p_distributor_id, p_product_id, v_txn_type, p_quantity,
    p_notes, p_created_by, v_system_batch_code, NULL, p_reference_id,
    p_reference_number, v_wh_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'quantity', p_quantity,
    'warehouse_id', v_wh_id,
    'system_batch_code', v_system_batch_code,
    'new_total', v_new_quantity,
    'new_available', v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired,
    'new_reserved', v_new_reserved,
    'new_damaged', v_new_damaged,
    'new_expired', v_new_expired
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_stock_action(uuid, uuid, text, integer, text, uuid, uuid, text, date, uuid, text, text, date) TO authenticated, anon;