
-- Step 1: Safeguard trigger on inventory_batches
CREATE OR REPLACE FUNCTION public.ensure_inventory_batch_quantity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.quantity IS NULL OR NEW.quantity = 0)
     AND (COALESCE(NEW.available_qty, 0) > 0 OR COALESCE(NEW.reserved_qty, 0) > 0) THEN
    NEW.quantity := COALESCE(NEW.available_qty, 0) + COALESCE(NEW.reserved_qty, 0);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_inventory_batches_ensure_quantity ON public.inventory_batches;
CREATE TRIGGER trg_inventory_batches_ensure_quantity
BEFORE INSERT OR UPDATE OF quantity, available_qty, reserved_qty
ON public.inventory_batches FOR EACH ROW
EXECUTE FUNCTION public.ensure_inventory_batch_quantity();

-- Also fix any currently drifted rows
UPDATE public.inventory_batches
SET quantity = COALESCE(available_qty, 0) + COALESCE(reserved_qty, 0)
WHERE (quantity IS NULL OR quantity = 0)
  AND (COALESCE(available_qty, 0) > 0 OR COALESCE(reserved_qty, 0) > 0);

-- Step 2: packing_list_orders mapping table
CREATE TABLE IF NOT EXISTS public.packing_list_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_list_id uuid REFERENCES public.packing_lists(id) ON DELETE CASCADE NOT NULL,
  order_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plo_packing_list ON public.packing_list_orders(packing_list_id);
CREATE INDEX IF NOT EXISTS idx_plo_order ON public.packing_list_orders(order_id);
ALTER TABLE public.packing_list_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view packing_list_orders"
ON public.packing_list_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert packing_list_orders"
ON public.packing_list_orders FOR INSERT TO authenticated WITH CHECK (true);

-- Step 3: approved_qty column
ALTER TABLE public.packing_list_items ADD COLUMN IF NOT EXISTS approved_qty numeric DEFAULT 0;

-- Step 4: Patch create_packing_list_atomic to populate new table & column
CREATE OR REPLACE FUNCTION public.create_packing_list_atomic(
  p_distributor_id uuid,
  p_type text,
  p_items jsonb,
  p_sources jsonb DEFAULT '[]'::jsonb,
  p_strategy text DEFAULT 'FEFO',
  p_warehouse_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL,
  p_beat_ids uuid[] DEFAULT NULL,
  p_retailer_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_packing_list_id uuid;
  v_packing_list_no text;
  v_item jsonb;
  v_source jsonb;
  v_pli_id uuid;
  v_batch record;
  v_remaining numeric;
  v_alloc numeric;
  v_total_qty numeric := 0;
  v_total_value numeric := 0;
  v_total_shortfall numeric := 0;
  v_items_result jsonb := '[]'::jsonb;
  v_batch_allocs jsonb;
  v_available numeric;
  v_order_ids uuid[] := '{}';
  v_order_id uuid;
BEGIN
  -- Generate packing list number
  v_packing_list_no := 'PL-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4);

  -- Create packing list header
  INSERT INTO packing_lists (id, packing_list_no, type, distributor_id, warehouse_id, agent_id, status, notes, beat_ids, retailer_id)
  VALUES (gen_random_uuid(), v_packing_list_no, p_type, p_distributor_id, p_warehouse_id, p_agent_id, 'ALLOCATED', p_notes, p_beat_ids, p_retailer_id)
  RETURNING id INTO v_packing_list_id;

  -- Collect unique order IDs from sources
  IF p_sources IS NOT NULL AND jsonb_array_length(p_sources) > 0 THEN
    FOR v_source IN SELECT * FROM jsonb_array_elements(p_sources) LOOP
      v_order_id := (v_source->>'order_id')::uuid;
      IF v_order_id IS NOT NULL AND NOT (v_order_id = ANY(v_order_ids)) THEN
        v_order_ids := array_append(v_order_ids, v_order_id);
      END IF;
    END LOOP;
  END IF;

  -- Insert into packing_list_orders mapping table
  IF array_length(v_order_ids, 1) > 0 THEN
    INSERT INTO packing_list_orders (packing_list_id, order_id)
    SELECT v_packing_list_id, unnest(v_order_ids);
  END IF;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_remaining := COALESCE((v_item->>'quantity')::numeric, 0);
    v_batch_allocs := '[]'::jsonb;

    -- Create packing list item
    INSERT INTO packing_list_items (
      id, packing_list_id, product_id, product_name, category_name,
      ordered_qty, approved_qty, picked_qty, short_qty, unit, rate
    ) VALUES (
      gen_random_uuid(), v_packing_list_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      v_item->>'category_name',
      v_remaining,
      v_remaining,  -- approved_qty = ordered_qty at creation
      0, 0,
      v_item->>'unit',
      COALESCE((v_item->>'rate')::numeric, 0)
    ) RETURNING id INTO v_pli_id;

    -- Allocate from batches using strategy
    FOR v_batch IN
      SELECT ib.id, ib.batch_no, ib.expiry_date, ib.quantity, ib.reserved_qty, ib.available_qty, ib.warehouse_id
      FROM inventory_batches ib
      WHERE ib.distributor_id = p_distributor_id
        AND ib.product_id = (v_item->>'product_id')::uuid
        AND (p_warehouse_id IS NULL OR ib.warehouse_id = p_warehouse_id)
        AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_DATE)
      ORDER BY
        CASE WHEN p_strategy = 'FEFO' THEN ib.expiry_date END ASC NULLS LAST,
        CASE WHEN p_strategy = 'FIFO' THEN ib.created_at END ASC,
        CASE WHEN p_strategy = 'LIFO' THEN ib.created_at END DESC
      FOR UPDATE SKIP LOCKED
    LOOP
      EXIT WHEN v_remaining <= 0;

      v_available := GREATEST(0, COALESCE(v_batch.available_qty, v_batch.quantity - COALESCE(v_batch.reserved_qty, 0)));

      CONTINUE WHEN v_available <= 0;

      v_alloc := LEAST(v_remaining, v_available);

      -- Reserve stock on batch
      UPDATE inventory_batches
      SET reserved_qty = COALESCE(reserved_qty, 0) + v_alloc,
          available_qty = GREATEST(0, COALESCE(available_qty, quantity) - v_alloc)
      WHERE id = v_batch.id;

      -- Record batch allocation
      INSERT INTO packing_list_item_batches (packing_list_item_id, batch_id, batch_no, expiry_date, allocated_qty, warehouse_id)
      VALUES (v_pli_id, v_batch.id, v_batch.batch_no, v_batch.expiry_date, v_alloc, v_batch.warehouse_id);

      v_batch_allocs := v_batch_allocs || jsonb_build_object(
        'batch_id', v_batch.id, 'batch_no', v_batch.batch_no,
        'allocated_qty', v_alloc, 'expiry_date', v_batch.expiry_date
      );

      v_remaining := v_remaining - v_alloc;
    END LOOP;

    -- Update shortfall
    IF v_remaining > 0 THEN
      UPDATE packing_list_items SET short_qty = v_remaining, picked_qty = (v_item->>'quantity')::numeric - v_remaining
      WHERE id = v_pli_id;
      v_total_shortfall := v_total_shortfall + v_remaining;
    ELSE
      UPDATE packing_list_items SET picked_qty = (v_item->>'quantity')::numeric WHERE id = v_pli_id;
    END IF;

    v_total_qty := v_total_qty + (v_item->>'quantity')::numeric;
    v_total_value := v_total_value + ((v_item->>'quantity')::numeric * COALESCE((v_item->>'rate')::numeric, 0));

    v_items_result := v_items_result || jsonb_build_object(
      'pli_id', v_pli_id, 'product_id', v_item->>'product_id',
      'ordered_qty', (v_item->>'quantity')::numeric,
      'short_qty', v_remaining, 'allocations', v_batch_allocs
    );
  END LOOP;

  -- Process sources (link orders to packing list, update backorder)
  IF p_sources IS NOT NULL AND jsonb_array_length(p_sources) > 0 THEN
    FOR v_source IN SELECT * FROM jsonb_array_elements(p_sources) LOOP
      -- Insert source traceability
      INSERT INTO packing_list_item_sources (
        packing_list_id, order_id, order_item_id, product_id, source_qty
      ) VALUES (
        v_packing_list_id,
        (v_source->>'order_id')::uuid,
        (v_source->>'order_item_id')::uuid,
        (v_source->>'product_id')::uuid,
        COALESCE((v_source->>'source_qty')::numeric, 0)
      );

      -- Stamp packing list on order
      UPDATE orders SET packing_list_id = v_packing_list_id, status = 'processing'
      WHERE id = (v_source->>'order_id')::uuid AND (packing_list_id IS NULL OR packing_list_id = v_packing_list_id);

      -- Update backorder qty on order item
      IF (v_source->>'backorder_qty') IS NOT NULL AND (v_source->>'backorder_qty')::numeric > 0 THEN
        UPDATE order_items SET backorder_qty = (v_source->>'backorder_qty')::numeric
        WHERE id = (v_source->>'order_item_id')::uuid;
      END IF;
    END LOOP;
  END IF;

  -- Update totals on header
  UPDATE packing_lists
  SET total_qty = v_total_qty, total_value = v_total_value
  WHERE id = v_packing_list_id;

  RETURN jsonb_build_object(
    'success', true,
    'packing_list_id', v_packing_list_id,
    'packing_list_no', v_packing_list_no,
    'total_qty', v_total_qty,
    'total_value', v_total_value,
    'total_shortfall', v_total_shortfall,
    'items', v_items_result
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
