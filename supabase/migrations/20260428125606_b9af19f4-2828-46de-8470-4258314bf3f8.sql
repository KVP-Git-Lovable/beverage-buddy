CREATE OR REPLACE FUNCTION public.enforce_category_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_category text;
  v_new_category text;
BEGIN
  SELECT m.category INTO v_new_category
  FROM public.uom_master m WHERE m.id = NEW.uom_id;

  SELECT m.category INTO v_base_category
  FROM public.product_uom_mapping p
  JOIN public.uom_master m ON m.id = p.uom_id
  WHERE p.product_id = NEW.product_id AND p.is_base = true
    AND p.id <> NEW.id
  LIMIT 1;

  -- Allow Quantity-category packaging units (PIECE / BOX / STRIP / CARTON)
  -- on Weight or Volume products. A 100g pouch is physically a PIECE that
  -- weighs 100g — the conversion_to_base column already encodes that.
  IF v_base_category IS NOT NULL
     AND v_new_category <> v_base_category
     AND v_new_category <> 'Quantity' THEN
    RAISE EXCEPTION 'Unit category % does not match product base category %', v_new_category, v_base_category;
  END IF;

  RETURN NEW;
END;
$function$;