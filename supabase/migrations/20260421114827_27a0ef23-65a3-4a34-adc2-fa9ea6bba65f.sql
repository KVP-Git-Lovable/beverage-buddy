-- ============================================================
-- Phase A: Multi-UOM transactional foundation (additive only)
-- ============================================================

-- 1) UOM snapshot columns on line-item tables
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS uom_id uuid REFERENCES public.uom_master(id),
  ADD COLUMN IF NOT EXISTS uom_code text,
  ADD COLUMN IF NOT EXISTS conversion_to_base numeric;

ALTER TABLE public.primary_order_items
  ADD COLUMN IF NOT EXISTS uom_id uuid REFERENCES public.uom_master(id),
  ADD COLUMN IF NOT EXISTS uom_code text,
  ADD COLUMN IF NOT EXISTS conversion_to_base numeric;

ALTER TABLE public.packing_list_items
  ADD COLUMN IF NOT EXISTS uom_id uuid REFERENCES public.uom_master(id),
  ADD COLUMN IF NOT EXISTS uom_code text,
  ADD COLUMN IF NOT EXISTS conversion_to_base numeric,
  ADD COLUMN IF NOT EXISTS base_qty numeric;

-- 2) Per-UOM pricing on price_book_entries
ALTER TABLE public.price_book_entries
  ADD COLUMN IF NOT EXISTS uom_id uuid REFERENCES public.uom_master(id);

-- Unique: one row per (price_book, product, uom). Coalesce so legacy NULL uom_id rows still get one slot.
CREATE UNIQUE INDEX IF NOT EXISTS price_book_entries_book_product_uom_uniq
  ON public.price_book_entries (
    price_book_id,
    product_id,
    COALESCE(uom_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- 3) Lifecycle on product_uom_mapping
ALTER TABLE public.product_uom_mapping
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- (Positive-conversion check + unique (product_id, uom_id) already exist; no-op here.)

-- 4) Server-side conversion helper
CREATE OR REPLACE FUNCTION public.to_base_qty(
  p_product_id uuid,
  p_qty numeric,
  p_uom_code text
) RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_factor numeric;
BEGIN
  IF p_uom_code IS NULL OR p_qty IS NULL THEN
    RETURN p_qty;
  END IF;

  SELECT pum.conversion_to_base INTO v_factor
  FROM public.product_uom_mapping pum
  JOIN public.uom_master um ON um.id = pum.uom_id
  WHERE pum.product_id = p_product_id
    AND upper(um.code) = upper(p_uom_code)
    AND COALESCE(pum.is_active, true) = true
  LIMIT 1;

  IF v_factor IS NULL OR v_factor <= 0 THEN
    -- Safe fallback: treat as already base
    RETURN p_qty;
  END IF;

  RETURN p_qty * v_factor;
END;
$$;

-- 5) Stock-action RPC: accept optional UOM code, convert to base before any write.
--    Backward compatible: calls that omit p_uom_code behave exactly as before.
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
  p_mfg_date date DEFAULT NULL,
  p_uom_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_signed_qty INTEGER;
  v_product_name TEXT;
  v_product_unit TEXT;
  v_base_qty_num NUMERIC;
  v_base_qty INTEGER;
  v_ledger_unit TEXT;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
  END IF;

  -- Resolve UOM → base conversion (no-op if p_uom_code is null)
  v_base_qty_num := public.to_base_qty(p_product_id, p_quantity::numeric, p_uom_code);
  v_base_qty := ROUND(v_base_qty_num)::INTEGER;
  IF v_base_qty <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Converted base quantity must be positive');
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

  -- Resolve product metadata for ledger row (name/unit)
  SELECT COALESCE(v_inventory.product_name, p.name, 'Product'),
         COALESCE(v_inventory.unit, p.unit, 'pcs')
    INTO v_product_name, v_product_unit
  FROM public.products p
  WHERE p.id = p_product_id;

  IF v_product_name IS NULL THEN
    v_product_name := COALESCE(v_inventory.product_name, 'Product');
    v_product_unit := COALESCE(v_inventory.unit, 'pcs');
  END IF;

  -- Ledger unit: prefer the entered UOM code (audit trail); fall back to product base unit
  v_ledger_unit := COALESCE(NULLIF(TRIM(p_uom_code), ''), v_product_unit);

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
        SELECT p_distributor_id, p_product_id, COALESCE(p.name, 'Product'), v_base_qty,
               0, 0, 0, COALESCE(p.unit, 'pcs'), v_system_batch_code, p_expiry_date, v_wh_id
        FROM public.products p WHERE p.id = p_product_id;

        IF NOT FOUND THEN
          INSERT INTO public.distributor_inventory (
            distributor_id, product_id, product_name, quantity,
            reserved_quantity, damaged_quantity, expired_quantity,
            unit, warehouse_id
          ) VALUES (
            p_distributor_id, p_product_id, COALESCE(p_notes, 'Product'), v_base_qty,
            0, 0, 0, 'pcs', v_wh_id
          );
        END IF;

        v_new_quantity := v_base_qty;
      ELSE
        v_new_quantity := v_new_quantity + v_base_qty;
      END IF;

      INSERT INTO public.inventory_batches (
        distributor_id, product_id, batch_no, system_batch_code, supplier_batch_code,
        mfg_date, expiry_date, quantity, available_qty, warehouse_id
      ) VALUES (
        p_distributor_id, p_product_id, v_system_batch_code, v_system_batch_code, p_supplier_batch_code,
        p_mfg_date, p_expiry_date, v_base_qty, v_base_qty, v_wh_id
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
      v_signed_qty := v_base_qty;

    WHEN 'GRN' THEN
      IF v_inventory.id IS NULL THEN
        INSERT INTO public.distributor_inventory (
          distributor_id, product_id, product_name, quantity,
          reserved_quantity, damaged_quantity, expired_quantity,
          unit, batch_number, expiry_date, warehouse_id
        )
        SELECT p_distributor_id, p_product_id, COALESCE(p.name, 'Product'), v_base_qty,
               0, 0, 0, COALESCE(p.unit, 'pcs'), v_system_batch_code, p_expiry_date, v_wh_id
        FROM public.products p WHERE p.id = p_product_id;

        IF NOT FOUND THEN
          INSERT INTO public.distributor_inventory (
            distributor_id, product_id, product_name, quantity,
            reserved_quantity, damaged_quantity, expired_quantity,
            unit, warehouse_id
          ) VALUES (
            p_distributor_id, p_product_id, COALESCE(p_notes, 'Product'), v_base_qty,
            0, 0, 0, 'pcs', v_wh_id
          );
        END IF;
        v_new_quantity := v_base_qty;
      ELSE
        v_new_quantity := v_new_quantity + v_base_qty;
      END IF;

      INSERT INTO public.inventory_batches (
        distributor_id, product_id, batch_no, system_batch_code, supplier_batch_code,
        mfg_date, expiry_date, quantity, available_qty, warehouse_id
      ) VALUES (
        p_distributor_id, p_product_id, v_system_batch_code, v_system_batch_code, p_supplier_batch_code,
        p_mfg_date, p_expiry_date, v_base_qty, v_base_qty, v_wh_id
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
      v_signed_qty := v_base_qty;

    WHEN 'RESERVE' THEN
      IF v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired < v_base_qty THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available stock to reserve');
      END IF;
      v_new_reserved := v_new_reserved + v_base_qty;
      v_txn_type := 'RESERVE';
      v_movement := 'Available → Reserved';
      v_signed_qty := v_base_qty;

    WHEN 'RELEASE' THEN
      IF v_new_reserved < v_base_qty THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot release more than reserved quantity');
      END IF;
      v_new_reserved := v_new_reserved - v_base_qty;
      v_txn_type := 'RELEASE';
      v_movement := 'Reserved → Available';
      v_signed_qty := v_base_qty;

    WHEN 'MARK_DAMAGED' THEN
      v_new_available := v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired;
      IF v_new_available < v_base_qty THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available stock');
      END IF;
      v_new_damaged := v_new_damaged + v_base_qty;
      v_txn_type := 'MARK_DAMAGED';
      v_movement := 'Available → Damaged';
      v_signed_qty := v_base_qty;

    WHEN 'MARK_EXPIRED' THEN
      v_new_available := v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired;
      IF v_new_available < v_base_qty THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available stock');
      END IF;
      v_new_expired := v_new_expired + v_base_qty;
      v_txn_type := 'MARK_EXPIRED';
      v_movement := 'Available → Expired';
      v_signed_qty := v_base_qty;

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

  -- Insert into ledger using current schema (balance_qty in BASE units; unit text records the entered UOM for audit)
  INSERT INTO public.distributor_inventory_transactions (
    distributor_id, product_id, product_name, transaction_type, balance_qty,
    running_balance, unit, notes, created_by, batch_number,
    reference_type, reference_id, reference_number, warehouse_id, expiry_date
  ) VALUES (
    p_distributor_id, p_product_id, v_product_name, v_txn_type, v_signed_qty,
    v_new_quantity, v_ledger_unit, p_notes, p_created_by, v_system_batch_code,
    NULL, p_reference_id, p_reference_number, v_wh_id, p_expiry_date
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'quantity', p_quantity,
    'uom_code', p_uom_code,
    'base_quantity', v_base_qty,
    'warehouse_id', v_wh_id,
    'system_batch_code', v_system_batch_code,
    'new_total', v_new_quantity,
    'new_available', v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired,
    'new_reserved', v_new_reserved,
    'new_damaged', v_new_damaged,
    'new_expired', v_new_expired
  );
END;
$function$;

-- 6) Filter inactive UOMs from product unit list (admin can opt-in to include them)
CREATE OR REPLACE FUNCTION public.get_product_units(
  p_product_id uuid,
  p_include_inactive boolean DEFAULT false
)
RETURNS TABLE(
  mapping_id uuid,
  uom_id uuid,
  code text,
  name text,
  category text,
  conversion_to_base numeric,
  is_base boolean,
  is_default_sales boolean,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, m.id, m.code, m.name, m.category,
         p.conversion_to_base, p.is_base, p.is_default_sales,
         COALESCE(p.is_active, true) AS is_active
  FROM public.product_uom_mapping p
  JOIN public.uom_master m ON m.id = p.uom_id
  WHERE p.product_id = p_product_id
    AND (p_include_inactive OR COALESCE(p.is_active, true) = true)
  ORDER BY p.is_base DESC, m.name;
$function$;