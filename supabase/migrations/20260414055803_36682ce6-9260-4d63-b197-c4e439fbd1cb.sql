CREATE OR REPLACE FUNCTION public.execute_stock_action(
  p_distributor_id UUID,
  p_product_id UUID,
  p_action TEXT,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL,
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
  v_wh_id UUID;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
  END IF;

  v_wh_id := p_warehouse_id;
  IF v_wh_id IS NULL THEN
    SELECT id INTO v_wh_id
    FROM public.warehouses
    WHERE distributor_id = p_distributor_id
      AND is_default = true
    LIMIT 1;
  END IF;

  IF v_wh_id IS NULL THEN
    INSERT INTO public.warehouses (distributor_id, name, code, is_default)
    VALUES (p_distributor_id, 'Main Warehouse', 'MAIN', true)
    ON CONFLICT (distributor_id, name) DO NOTHING
    RETURNING id INTO v_wh_id;

    IF v_wh_id IS NULL THEN
      SELECT id INTO v_wh_id
      FROM public.warehouses
      WHERE distributor_id = p_distributor_id
        AND name = 'Main Warehouse'
      LIMIT 1;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.warehouses
    WHERE id = v_wh_id
      AND distributor_id = p_distributor_id
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

  CASE p_action
    WHEN 'OPENING_STOCK' THEN
      IF v_inventory.id IS NULL THEN
        INSERT INTO public.distributor_inventory (
          distributor_id,
          product_id,
          product_name,
          quantity,
          reserved_quantity,
          damaged_quantity,
          expired_quantity,
          unit,
          batch_number,
          expiry_date,
          warehouse_id
        )
        SELECT
          p_distributor_id,
          p_product_id,
          COALESCE(p.name, 'Product'),
          p_quantity,
          0,
          0,
          0,
          COALESCE(p.unit, 'pcs'),
          p_batch_no,
          p_expiry_date,
          v_wh_id
        FROM public.products p
        WHERE p.id = p_product_id;

        IF NOT FOUND THEN
          INSERT INTO public.distributor_inventory (
            distributor_id,
            product_id,
            product_name,
            quantity,
            reserved_quantity,
            damaged_quantity,
            expired_quantity,
            unit,
            warehouse_id
          ) VALUES (
            p_distributor_id,
            p_product_id,
            COALESCE(p_notes, 'Product'),
            p_quantity,
            0,
            0,
            0,
            'pcs',
            v_wh_id
          );
        END IF;
      ELSE
        v_new_quantity := v_new_quantity + p_quantity;
      END IF;

      IF p_batch_no IS NOT NULL AND p_batch_no <> '' THEN
        INSERT INTO public.inventory_batches (
          distributor_id,
          product_id,
          batch_no,
          expiry_date,
          available_qty,
          warehouse_id
        ) VALUES (
          p_distributor_id,
          p_product_id,
          p_batch_no,
          p_expiry_date,
          p_quantity,
          v_wh_id
        )
        ON CONFLICT (distributor_id, product_id, batch_no, warehouse_id)
        DO UPDATE SET available_qty = public.inventory_batches.available_qty + EXCLUDED.available_qty
        RETURNING id INTO v_batch_id;
      END IF;

      v_txn_type := 'OPENING_STOCK';
      v_movement := 'NULL → Available';

    WHEN 'GRN' THEN
      IF v_inventory.id IS NULL THEN
        INSERT INTO public.distributor_inventory (
          distributor_id,
          product_id,
          product_name,
          quantity,
          reserved_quantity,
          damaged_quantity,
          expired_quantity,
          unit,
          batch_number,
          expiry_date,
          warehouse_id
        )
        SELECT
          p_distributor_id,
          p_product_id,
          COALESCE(p.name, 'Product'),
          p_quantity,
          0,
          0,
          0,
          COALESCE(p.unit, 'pcs'),
          p_batch_no,
          p_expiry_date,
          v_wh_id
        FROM public.products p
        WHERE p.id = p_product_id;

        IF NOT FOUND THEN
          INSERT INTO public.distributor_inventory (
            distributor_id,
            product_id,
            product_name,
            quantity,
            reserved_quantity,
            damaged_quantity,
            expired_quantity,
            unit,
            warehouse_id
          ) VALUES (
            p_distributor_id,
            p_product_id,
            COALESCE(p_notes, 'Product'),
            p_quantity,
            0,
            0,
            0,
            'pcs',
            v_wh_id
          );
        END IF;
      ELSE
        v_new_quantity := v_new_quantity + p_quantity;
      END IF;

      IF p_batch_no IS NOT NULL AND p_batch_no <> '' THEN
        INSERT INTO public.inventory_batches (
          distributor_id,
          product_id,
          batch_no,
          expiry_date,
          available_qty,
          warehouse_id
        ) VALUES (
          p_distributor_id,
          p_product_id,
          p_batch_no,
          p_expiry_date,
          p_quantity,
          v_wh_id
        )
        ON CONFLICT (distributor_id, product_id, batch_no, warehouse_id)
        DO UPDATE SET available_qty = public.inventory_batches.available_qty + EXCLUDED.available_qty
        RETURNING id INTO v_batch_id;
      END IF;

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

  IF v_inventory.id IS NOT NULL THEN
    v_new_available := v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired;

    UPDATE public.distributor_inventory
    SET quantity = v_new_quantity,
        reserved_quantity = v_new_reserved,
        damaged_quantity = v_new_damaged,
        expired_quantity = v_new_expired,
        updated_at = now()
    WHERE id = v_inventory.id;
  END IF;

  INSERT INTO public.distributor_inventory_transactions (
    distributor_id,
    product_id,
    transaction_type,
    quantity,
    notes,
    created_by,
    batch_id,
    reference_type,
    reference_id,
    reference_number,
    warehouse_id
  ) VALUES (
    p_distributor_id,
    p_product_id,
    v_txn_type,
    p_quantity,
    p_notes,
    p_created_by,
    v_batch_id,
    NULL,
    p_reference_id,
    p_reference_number,
    v_wh_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'quantity', p_quantity,
    'warehouse_id', v_wh_id,
    'new_total', v_new_quantity,
    'new_available', v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired,
    'new_reserved', v_new_reserved,
    'new_damaged', v_new_damaged,
    'new_expired', v_new_expired
  );
END;
$$;