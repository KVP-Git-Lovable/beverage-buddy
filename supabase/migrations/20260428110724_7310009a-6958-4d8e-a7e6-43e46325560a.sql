-- Backfill: ensure existing products have the basic unit mappings expected
-- by Order Entry, but ONLY for units enabled in UOM Master. Idempotent.

-- 1) For every product with at least one Weight-category mapping, add a KG
--    sibling row (conv 1000) if KG is enabled and not already mapped.
INSERT INTO public.product_uom_mapping
  (product_id, uom_id, conversion_to_base, is_base, is_default_sales, is_price_basis, is_active)
SELECT DISTINCT
  pum.product_id,
  kg.id,
  1000,
  false,
  false,
  false,
  true
FROM public.product_uom_mapping pum
JOIN public.uom_master m ON m.id = pum.uom_id AND m.category = 'Weight'
CROSS JOIN LATERAL (
  SELECT um.id
  FROM public.uom_master um
  JOIN public.enabled_units eu ON eu.uom_id = um.id
  WHERE um.code = 'KG' AND eu.enabled = true
  LIMIT 1
) kg
WHERE COALESCE(pum.is_active, true) = true
  AND NOT EXISTS (
    SELECT 1 FROM public.product_uom_mapping x
    WHERE x.product_id = pum.product_id AND x.uom_id = kg.id
  );

-- 2) For every product whose products.unit is 'piece' (case-insensitive) and
--    that has zero mappings, add a PIECE base row (conv 1) if PIECE is enabled.
INSERT INTO public.product_uom_mapping
  (product_id, uom_id, conversion_to_base, is_base, is_default_sales, is_price_basis, is_active)
SELECT
  p.id,
  pc.id,
  1,
  true,
  true,
  true,
  true
FROM public.products p
CROSS JOIN LATERAL (
  SELECT um.id
  FROM public.uom_master um
  JOIN public.enabled_units eu ON eu.uom_id = um.id
  WHERE um.code = 'PIECE' AND eu.enabled = true
  LIMIT 1
) pc
WHERE LOWER(COALESCE(p.unit, '')) IN ('piece', 'pieces', 'pcs')
  AND NOT EXISTS (
    SELECT 1 FROM public.product_uom_mapping x
    WHERE x.product_id = p.id
      AND COALESCE(x.is_active, true) = true
  );
