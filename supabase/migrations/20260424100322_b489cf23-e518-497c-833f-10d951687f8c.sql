ALTER TABLE public.product_uom_mapping
  ADD COLUMN IF NOT EXISTS is_price_basis boolean NOT NULL DEFAULT false;

ALTER TABLE public.primary_order_items
  ADD COLUMN IF NOT EXISTS base_qty numeric,
  ADD COLUMN IF NOT EXISTS ordered_qty numeric;

ALTER TABLE public.grn_items
  ADD COLUMN IF NOT EXISTS received_base_qty numeric,
  ADD COLUMN IF NOT EXISTS returned_base_qty numeric,
  ADD COLUMN IF NOT EXISTS conversion_to_base numeric,
  ADD COLUMN IF NOT EXISTS uom_code text,
  ADD COLUMN IF NOT EXISTS uom_id uuid REFERENCES public.uom_master(id);

CREATE UNIQUE INDEX IF NOT EXISTS product_uom_mapping_one_price_basis
  ON public.product_uom_mapping(product_id)
  WHERE is_price_basis = true;

UPDATE public.product_uom_mapping pum
SET is_price_basis = true
WHERE pum.is_default_sales = true
  AND NOT EXISTS (
    SELECT 1 FROM public.product_uom_mapping x
    WHERE x.product_id = pum.product_id AND x.is_price_basis = true
  );

UPDATE public.product_uom_mapping pum
SET is_price_basis = true
WHERE pum.is_base = true
  AND NOT EXISTS (
    SELECT 1 FROM public.product_uom_mapping x
    WHERE x.product_id = pum.product_id AND x.is_price_basis = true
  );

UPDATE public.product_uom_mapping pum
SET is_price_basis = true
WHERE pum.id = (
  SELECT x.id
  FROM public.product_uom_mapping x
  WHERE x.product_id = pum.product_id
  ORDER BY x.created_at NULLS LAST, x.id
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM public.product_uom_mapping y
  WHERE y.product_id = pum.product_id AND y.is_price_basis = true
);

CREATE OR REPLACE FUNCTION public.validate_product_uom_mapping_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
  v_base_count integer;
  v_sales_count integer;
  v_price_count integer;
  v_bad_factor integer;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  SELECT
    COUNT(*) FILTER (WHERE is_base),
    COUNT(*) FILTER (WHERE is_default_sales),
    COUNT(*) FILTER (WHERE is_price_basis),
    COUNT(*) FILTER (WHERE conversion_to_base <= 0)
  INTO v_base_count, v_sales_count, v_price_count, v_bad_factor
  FROM public.product_uom_mapping
  WHERE product_id = v_product_id
    AND COALESCE(is_active, true) = true;

  IF v_bad_factor > 0 THEN
    RAISE EXCEPTION 'All unit conversion factors must be positive';
  END IF;

  IF v_base_count > 1 THEN
    RAISE EXCEPTION 'Only one base unit is allowed per product';
  END IF;

  IF v_sales_count > 1 THEN
    RAISE EXCEPTION 'Only one default sales unit is allowed per product';
  END IF;

  IF v_price_count > 1 THEN
    RAISE EXCEPTION 'Only one price-basis unit is allowed per product';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_product_uom_mapping_state ON public.product_uom_mapping;
CREATE CONSTRAINT TRIGGER trg_validate_product_uom_mapping_state
AFTER INSERT OR UPDATE OR DELETE ON public.product_uom_mapping
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.validate_product_uom_mapping_state();

DROP FUNCTION IF EXISTS public.get_product_units(uuid);
CREATE FUNCTION public.get_product_units(p_product_id uuid)
RETURNS TABLE(
  mapping_id uuid,
  uom_id uuid,
  code text,
  name text,
  category text,
  conversion_to_base numeric,
  is_base boolean,
  is_default_sales boolean,
  is_active boolean,
  is_price_basis boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, m.id, m.code, m.name, m.category,
         p.conversion_to_base, p.is_base, p.is_default_sales,
         COALESCE(p.is_active, true) AS is_active,
         COALESCE(p.is_price_basis, false) AS is_price_basis
  FROM public.product_uom_mapping p
  JOIN public.uom_master m ON m.id = p.uom_id
  WHERE p.product_id = p_product_id
    AND COALESCE(p.is_active, true) = true
  ORDER BY p.is_base DESC, p.is_default_sales DESC, m.name;
$$;

CREATE OR REPLACE FUNCTION public.execute_stock_action_numeric(
  p_distributor_id uuid,
  p_product_id uuid,
  p_action text,
  p_quantity numeric,
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
SET search_path = public
AS $$
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
  END IF;

  RETURN public.execute_stock_action(
    p_distributor_id,
    p_product_id,
    p_action,
    ROUND(p_quantity)::integer,
    p_notes,
    p_created_by,
    p_warehouse_id,
    p_batch_no,
    p_expiry_date,
    p_reference_id,
    p_reference_number,
    p_supplier_batch_code,
    p_mfg_date
  );
END;
$$;