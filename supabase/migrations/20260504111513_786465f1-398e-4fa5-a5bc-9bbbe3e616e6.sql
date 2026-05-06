CREATE OR REPLACE FUNCTION public.bulk_apply_product_piece_setup(
  p_rows jsonb,
  p_piece_uom_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_matched int;
  v_updated int;
BEGIN
  -- Materialise the input into a temp table for joins
  CREATE TEMP TABLE _bulk_rows (sku text PRIMARY KEY, gst numeric) ON COMMIT DROP;
  INSERT INTO _bulk_rows (sku, gst)
  SELECT (elem->>'sku')::text, (elem->>'gst')::numeric
  FROM jsonb_array_elements(p_rows) AS elem
  ON CONFLICT (sku) DO NOTHING;

  SELECT COUNT(*) INTO v_total FROM _bulk_rows;

  -- Resolve sku -> product_id
  CREATE TEMP TABLE _matched (product_id uuid PRIMARY KEY, gst numeric) ON COMMIT DROP;
  INSERT INTO _matched (product_id, gst)
  SELECT p.id, b.gst
  FROM _bulk_rows b
  JOIN public.products p ON p.sku = b.sku;

  SELECT COUNT(*) INTO v_matched FROM _matched;

  -- Update product columns in bulk
  UPDATE public.products p
  SET base_unit_category = 'Quantity',
      net_weight_g = NULL,
      net_volume_ml = NULL,
      price_basis_uom_id = p_piece_uom_id,
      default_sales_uom_id = p_piece_uom_id,
      default_purchase_uom_id = p_piece_uom_id,
      gst_percentage = m.gst
  FROM _matched m
  WHERE p.id = m.product_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Replace UOM mapping: delete existing for matched products, then insert single PIECE row each
  DELETE FROM public.product_uom_mapping
  WHERE product_id IN (SELECT product_id FROM _matched);

  INSERT INTO public.product_uom_mapping
    (product_id, uom_id, conversion_to_base, is_base, is_default_sales, is_price_basis, is_default_purchase)
  SELECT product_id, p_piece_uom_id, 1, true, true, true, true
  FROM _matched;

  RETURN jsonb_build_object(
    'received', v_total,
    'matched',  v_matched,
    'updated',  v_updated,
    'skipped',  v_total - v_matched
  );
END;
$$;