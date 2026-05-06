-- Trigram extension for fast ILIKE search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indexes on products
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
  ON public.products USING gin (sku gin_trgm_ops);

-- Indexes on product_variants
CREATE INDEX IF NOT EXISTS idx_product_variants_name_trgm
  ON public.product_variants USING gin (variant_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_variants_sku_trgm
  ON public.product_variants USING gin (sku gin_trgm_ops);

-- Drop any prior overload
DROP FUNCTION IF EXISTS public.search_products_for_order(text, text, integer);

-- Server-side product search returning matched products + their active variants
CREATE OR REPLACE FUNCTION public.search_products_for_order(
  p_query text,
  p_category text DEFAULT NULL,
  p_limit integer DEFAULT 30
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
      AND (
        q.term = ''
        OR p.name ILIKE '%' || q.term || '%'
        OR p.sku ILIKE '%' || q.term || '%'
        OR (pv.variant_name ILIKE '%' || q.term || '%' AND COALESCE(pv.is_active, true) = true)
        OR (pv.sku ILIKE '%' || q.term || '%' AND COALESCE(pv.is_active, true) = true)
      )
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

GRANT EXECUTE ON FUNCTION public.search_products_for_order(text, text, integer) TO anon, authenticated;