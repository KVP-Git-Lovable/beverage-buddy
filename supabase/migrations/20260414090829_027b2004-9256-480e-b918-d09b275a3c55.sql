
-- 1. Add warehouse_id to packing_lists
ALTER TABLE public.packing_lists
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id);

-- 2. Drop old signature to avoid overloading
DROP FUNCTION IF EXISTS public.allocate_inventory_batches(uuid, uuid, integer, text);

-- 3. Recreate with warehouse filter + expiry exclusion
CREATE OR REPLACE FUNCTION public.allocate_inventory_batches(
  p_distributor_id uuid,
  p_product_id uuid,
  p_required_qty integer,
  p_strategy text DEFAULT 'FEFO',
  p_warehouse_id uuid DEFAULT NULL
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
      AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
      AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
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
