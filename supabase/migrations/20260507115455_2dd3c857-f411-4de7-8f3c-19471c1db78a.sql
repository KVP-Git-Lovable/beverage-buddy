DROP FUNCTION IF EXISTS public.search_products_for_order(text, text, integer);
DROP FUNCTION IF EXISTS public.search_products_for_order(text, text, integer, boolean);

CREATE OR REPLACE FUNCTION public.search_products_for_order(
  p_query text,
  p_category text DEFAULT NULL,
  p_limit integer DEFAULT 30,
  p_is_focused boolean DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  rate numeric,
  unit text,
  closing_stock integer,
  is_active boolean,
  category_name text,
  is_focused_product boolean,
  default_uom_code text,
  allowed_uom_codes text[],
  variants jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH q AS (
    SELECT COALESCE(NULLIF(trim(p_query), ''), '') AS term
  ),
  matched AS (
    SELECT DISTINCT p.id
    FROM public.products p
    LEFT JOIN public.product_variants pv ON pv.product_id = p.id
    LEFT JOIN public.product_categories pc ON pc.id = p.category_id
    , q
    WHERE COALESCE(p.is_active, true) = true
      AND (p_category IS NULL OR p_category = 'all' OR pc.name = p_category)
      AND (p_is_focused IS NULL OR COALESCE(p.is_focused_product, false) = p_is_focused)
      AND (
        q.term = ''
        OR p.name ILIKE '%' || q.term || '%'
        OR p.sku ILIKE '%' || q.term || '%'
        OR (pv.variant_name ILIKE '%' || q.term || '%' AND COALESCE(pv.is_active, true) = true)
        OR (pv.sku ILIKE '%' || q.term || '%' AND COALESCE(pv.is_active, true) = true)
      )
  ),
  uom_rows AS (
    SELECT
      pum.product_id,
      um.code,
      pum.is_base,
      pum.is_default_sales
    FROM public.product_uom_mapping pum
    JOIN public.uom_master um ON um.id = pum.uom_id
    LEFT JOIN public.enabled_units eu ON eu.uom_id = um.id
    WHERE COALESCE(pum.is_active, true) = true
      AND (COALESCE(pum.is_base, false) = true OR COALESCE(eu.enabled, true) = true)
  ),
  uom AS (
    SELECT
      product_id,
      (
        SELECT code FROM uom_rows ur2
        WHERE ur2.product_id = ur.product_id
        ORDER BY (ur2.is_default_sales)::int DESC, (ur2.is_base)::int DESC, ur2.code
        LIMIT 1
      ) AS default_uom_code,
      array_agg(code ORDER BY (is_base)::int DESC, code) AS allowed_uom_codes
    FROM uom_rows ur
    GROUP BY product_id
  )
  SELECT
    p.id,
    p.sku,
    p.name,
    p.rate,
    p.unit,
    p.closing_stock,
    p.is_active,
    pc.name AS category_name,
    p.is_focused_product,
    COALESCE(uom.default_uom_code, p.unit) AS default_uom_code,
    COALESCE(uom.allowed_uom_codes, ARRAY[p.unit]::text[]) AS allowed_uom_codes,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pv.id,
            'variant_name', pv.variant_name,
            'sku', pv.sku,
            'price', pv.price,
            'is_active', pv.is_active,
            'is_focused_product', pv.is_focused_product
          )
          ORDER BY pv.variant_name
        )
        FROM public.product_variants pv
        WHERE pv.product_id = p.id
          AND COALESCE(pv.is_active, true) = true
      ),
      '[]'::jsonb
    ) AS variants
  FROM public.products p
  LEFT JOIN public.product_categories pc ON pc.id = p.category_id
  LEFT JOIN uom ON uom.product_id = p.id
  JOIN matched m ON m.id = p.id
  , q
  ORDER BY
    CASE WHEN q.term <> '' AND p.name ILIKE q.term || '%' THEN 0
         WHEN q.term <> '' AND p.sku ILIKE q.term || '%' THEN 1
         ELSE 2
    END,
    p.name
  LIMIT GREATEST(1, LEAST(p_limit, 100));
$$;

GRANT EXECUTE ON FUNCTION public.search_products_for_order(text, text, integer, boolean) TO anon, authenticated;