-- Trigram + supporting indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
  ON public.products USING gin (sku gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_active_category
  ON public.products (is_active, category_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_pum_product_active
  ON public.product_uom_mapping (product_id, is_active)
  WHERE is_active = true;

-- Drop any prior signatures
DROP FUNCTION IF EXISTS public.search_products_for_order(text, text, int);
DROP FUNCTION IF EXISTS public.search_products_for_order(text, text, int, boolean);
DROP FUNCTION IF EXISTS public.search_products_for_order(text, text, integer, boolean);

CREATE OR REPLACE FUNCTION public.search_products_for_order(
  p_query      text    DEFAULT '',
  p_category   text    DEFAULT '',
  p_limit      int     DEFAULT 40,
  p_is_focused boolean DEFAULT NULL
)
RETURNS TABLE (
  id                  uuid,
  sku                 text,
  name                text,
  rate                numeric,
  unit                text,
  closing_stock       numeric,
  is_active           boolean,
  category_name       text,
  is_focused_product  boolean,
  variants            jsonb,
  default_uom_code    text,
  allowed_uom_codes   text[]
)
LANGUAGE sql
STABLE
SET statement_timeout = '5s'
SET search_path = public
AS $$
  WITH matched_products AS (
    SELECT
      p.id, p.sku, p.name, p.rate, p.unit,
      p.closing_stock::numeric AS closing_stock,
      p.is_active, p.is_focused_product,
      c.name AS category_name
    FROM public.products p
    LEFT JOIN public.product_categories c ON c.id = p.category_id
    WHERE
      p.is_active = true
      AND (p_is_focused IS NULL OR COALESCE(p.is_focused_product, false) = p_is_focused)
      AND (
        p_category IS NULL OR p_category = '' OR p_category ILIKE 'all'
        OR c.name ILIKE p_category
      )
      AND (
        p_query IS NULL OR p_query = ''
        OR p.name ILIKE '%' || p_query || '%'
        OR p.sku  ILIKE '%' || p_query || '%'
      )
    ORDER BY
      CASE WHEN p_query IS NULL OR p_query = '' THEN COALESCE(p.is_focused_product, false)::int ELSE 0 END DESC,
      p.name ASC
    LIMIT p_limit
  ),
  uom_data AS (
    SELECT
      pum.product_id,
      MAX(CASE WHEN pum.is_default_sales = true THEN um.code END) AS default_uom_code,
      array_agg(DISTINCT um.code ORDER BY um.code)
        FILTER (WHERE pum.is_active = true) AS allowed_uom_codes
    FROM public.product_uom_mapping pum
    JOIN public.uom_master um ON um.id = pum.uom_id
    WHERE pum.product_id IN (SELECT id FROM matched_products)
    GROUP BY pum.product_id
  ),
  variant_data AS (
    SELECT
      pv.product_id,
      jsonb_agg(jsonb_build_object(
        'id', pv.id,
        'variant_name', pv.variant_name,
        'sku', pv.sku,
        'price', pv.price,
        'is_active', pv.is_active,
        'is_focused_product', pv.is_focused_product
      )) AS variants
    FROM public.product_variants pv
    WHERE pv.product_id IN (SELECT id FROM matched_products)
      AND pv.is_active = true
    GROUP BY pv.product_id
  )
  SELECT
    mp.id, mp.sku, mp.name, mp.rate, mp.unit,
    mp.closing_stock, mp.is_active, mp.category_name,
    mp.is_focused_product,
    COALESCE(vd.variants, '[]'::jsonb)              AS variants,
    COALESCE(ud.default_uom_code, mp.unit)          AS default_uom_code,
    COALESCE(ud.allowed_uom_codes, ARRAY[mp.unit])  AS allowed_uom_codes
  FROM matched_products mp
  LEFT JOIN uom_data     ud ON ud.product_id = mp.id
  LEFT JOIN variant_data vd ON vd.product_id = mp.id
  ORDER BY mp.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.search_products_for_order(text, text, int, boolean) TO authenticated, anon, service_role;