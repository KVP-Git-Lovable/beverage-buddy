
-- 1. Index for delta sync watermark queries
CREATE INDEX IF NOT EXISTS idx_products_updated_at
  ON public.products (updated_at);

-- 2. Lightweight delta sync RPC for offline product catalog
DROP FUNCTION IF EXISTS public.sync_products_lite_delta(timestamptz, integer);

CREATE OR REPLACE FUNCTION public.sync_products_lite_delta(
  p_since timestamptz,
  p_limit integer DEFAULT 2000
)
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  brand text,
  category_name text,
  unit text,
  base_unit text,
  gst_percentage numeric,
  rate numeric,
  is_active boolean,
  is_focused_product boolean,
  hsn_code text,
  sku_image_url text,
  search_keywords text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.sku,
    p.name,
    p.brand,
    c.name AS category_name,
    p.unit,
    p.base_unit,
    p.gst_percentage,
    p.rate,
    COALESCE(p.is_active, true) AS is_active,
    COALESCE(p.is_focused_product, false) AS is_focused_product,
    p.hsn_code,
    p.sku_image_url,
    lower(
      COALESCE(p.name,'') || ' ' ||
      COALESCE(p.sku,'') || ' ' ||
      COALESCE(p.brand,'') || ' ' ||
      COALESCE(c.name,'') || ' ' ||
      COALESCE(p.hsn_code,'')
    ) AS search_keywords,
    p.updated_at
  FROM public.products p
  LEFT JOIN public.product_categories c ON c.id = p.category_id
  WHERE p.updated_at > COALESCE(p_since, 'epoch'::timestamptz)
  ORDER BY p.updated_at ASC
  LIMIT GREATEST(COALESCE(p_limit, 2000), 1);
$$;

GRANT EXECUTE ON FUNCTION public.sync_products_lite_delta(timestamptz, integer)
  TO authenticated, anon;

-- 3. Heavy product details RPC (lazy fetched per product)
DROP FUNCTION IF EXISTS public.get_product_details(uuid);

CREATE OR REPLACE FUNCTION public.get_product_details(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'product', to_jsonb(p.*) || jsonb_build_object(
      'category', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('id', c.id, 'name', c.name) END
    ),
    'variants', COALESCE((
      SELECT jsonb_agg(to_jsonb(v.*))
      FROM public.product_variants v
      WHERE v.product_id = p.id
        AND COALESCE(v.is_active, true) = true
    ), '[]'::jsonb),
    'schemes', COALESCE((
      SELECT jsonb_agg(to_jsonb(s.*))
      FROM public.product_schemes s
      WHERE s.product_id = p.id
        AND COALESCE(s.is_active, true) = true
    ), '[]'::jsonb)
  )
  FROM public.products p
  LEFT JOIN public.product_categories c ON c.id = p.category_id
  WHERE p.id = p_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_details(uuid)
  TO authenticated, anon;
