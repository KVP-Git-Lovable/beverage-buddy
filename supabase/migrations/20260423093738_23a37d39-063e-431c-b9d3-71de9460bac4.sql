CREATE OR REPLACE FUNCTION public.dispatch_packing_list_atomic(p_packing_list_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pl record;
  v_batch record;
  v_total_dispatched numeric := 0;
  v_total_released numeric := 0;
  v_total_backorder numeric := 0;
  v_dispatch_qty numeric;
  v_leftover numeric;
  v_source record;
  v_item_shortfall numeric;
  v_batch_detail record;
BEGIN
  SELECT * INTO v_pl FROM packing_lists WHERE id = p_packing_list_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Packing list not found'); END IF;

  IF v_pl.status != 'ready' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only dispatch packing lists with status ready, current status: ' || v_pl.status);
  END IF;

  FOR v_batch IN
    SELECT plib.id AS plib_id, plib.batch_id, plib.allocated_qty, plib.picked_qty, pli.product_id, pli.product_name
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
  LOOP
    v_dispatch_qty := CASE WHEN COALESCE(v_batch.picked_qty, 0) > 0 THEN v_batch.picked_qty ELSE v_batch.allocated_qty END;
    v_leftover := v_batch.allocated_qty - v_dispatch_qty;

    UPDATE inventory_batches
    SET quantity = GREATEST(0, quantity - v_dispatch_qty),
        reserved_qty = GREATEST(0, reserved_qty - v_batch.allocated_qty)
    WHERE id = v_batch.batch_id;

    SELECT batch_no, expiry_date, warehouse_id INTO v_batch_detail
    FROM inventory_batches WHERE id = v_batch.batch_id;

    INSERT INTO distributor_inventory_transactions (
      distributor_id, product_id, product_name, transaction_type, balance_qty,
      reference_type, reference_id, batch_number, expiry_date, warehouse_id,
      notes, created_by
    ) VALUES (
      v_pl.distributor_id, v_batch.product_id, v_batch.product_name, 'DISPATCH',
      -v_dispatch_qty, 'packing_list', p_packing_list_id,
      v_batch_detail.batch_no, v_batch_detail.expiry_date, v_batch_detail.warehouse_id,
      'Dispatched via PL ' || v_pl.packing_list_number, auth.uid()
    );

    v_total_dispatched := v_total_dispatched + v_dispatch_qty;
    IF v_leftover > 0 THEN v_total_released := v_total_released + v_leftover; END IF;
  END LOOP;

  IF v_pl.distributor_id IS NOT NULL THEN
    UPDATE distributor_inventory di
    SET quantity = COALESCE((
          SELECT SUM(ib.quantity) FROM inventory_batches ib
          WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id
            AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)
        ), 0),
        reserved_quantity = COALESCE((
          SELECT SUM(ib.reserved_qty) FROM inventory_batches ib
          WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id
            AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)
        ), 0)
    WHERE di.distributor_id = v_pl.distributor_id
      AND di.product_id IN (SELECT DISTINCT pli.product_id FROM packing_list_items pli WHERE pli.packing_list_id = p_packing_list_id);
  END IF;

  FOR v_source IN
    SELECT plis.order_item_id, plis.allocated_qty, pli.picked_qty as item_picked, pli.ordered_qty as item_ordered
    FROM packing_list_item_sources plis
    JOIN packing_list_items pli ON pli.id = plis.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id AND plis.order_item_id IS NOT NULL
  LOOP
    v_item_shortfall := GREATEST(0, v_source.allocated_qty - LEAST(v_source.allocated_qty, COALESCE(v_source.item_picked, 0)));
    IF v_item_shortfall > 0 THEN
      UPDATE order_items SET backorder_qty = COALESCE(backorder_qty, 0) + v_item_shortfall WHERE id = v_source.order_item_id;
      IF NOT FOUND THEN
        UPDATE primary_order_items SET backorder_qty = COALESCE(backorder_qty, 0) + v_item_shortfall WHERE id = v_source.order_item_id;
      END IF;
      v_total_backorder := v_total_backorder + v_item_shortfall;
    END IF;
  END LOOP;

  UPDATE packing_lists SET status = 'dispatched', updated_at = now() WHERE id = p_packing_list_id;
  UPDATE orders SET delivery_status = 'dispatched' WHERE packing_list_id = p_packing_list_id;
  UPDATE primary_orders SET status = 'dispatched' WHERE packing_list_id = p_packing_list_id;

  RETURN jsonb_build_object('success', true, 'total_dispatched', v_total_dispatched, 'total_released', v_total_released, 'total_backorder_added', v_total_backorder);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;