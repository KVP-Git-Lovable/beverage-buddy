
CREATE OR REPLACE FUNCTION public.release_all_packing_list_reservations(
  p_packing_list_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rec RECORD;
  v_total_released INTEGER := 0;
  v_dist_id UUID;
  v_release_qty INTEGER;
  v_product_releases JSONB := '{}'::JSONB;
BEGIN
  SELECT distributor_id INTO v_dist_id
  FROM packing_lists
  WHERE id = p_packing_list_id;

  IF v_dist_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Packing list not found');
  END IF;

  FOR v_rec IN
    SELECT plib.id AS plib_id, plib.batch_id, plib.allocated_qty, plib.picked_qty,
           pli.product_id
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
      AND plib.allocated_qty > COALESCE(plib.picked_qty, 0)
    FOR UPDATE OF plib
  LOOP
    v_release_qty := v_rec.allocated_qty - COALESCE(v_rec.picked_qty, 0);

    UPDATE inventory_batches
    SET available_qty = available_qty + v_release_qty,
        reserved_qty = GREATEST(0, reserved_qty - v_release_qty)
    WHERE id = v_rec.batch_id;

    IF v_product_releases ? v_rec.product_id::text THEN
      v_product_releases := jsonb_set(
        v_product_releases,
        ARRAY[v_rec.product_id::text],
        to_jsonb((v_product_releases->>v_rec.product_id::text)::integer + v_release_qty)
      );
    ELSE
      v_product_releases := jsonb_set(
        v_product_releases,
        ARRAY[v_rec.product_id::text],
        to_jsonb(v_release_qty)
      );
    END IF;

    v_total_released := v_total_released + v_release_qty;

    UPDATE packing_list_item_batches
    SET allocated_qty = COALESCE(picked_qty, 0)
    WHERE id = v_rec.plib_id;
  END LOOP;

  FOR v_rec IN
    SELECT key::uuid AS product_id, value::integer AS released_qty
    FROM jsonb_each_text(v_product_releases)
  LOOP
    UPDATE distributor_inventory
    SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_rec.released_qty)
    WHERE distributor_id = v_dist_id
      AND product_id = v_rec.product_id;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_released', v_total_released
  );
END;
$$;
