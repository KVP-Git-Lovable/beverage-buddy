DELETE FROM public.product_uom_mapping pum
USING public.products p
WHERE pum.product_id = p.id
  AND p.base_unit_category IS NULL
  AND p.price_basis_uom_id IS NULL
  AND p.default_sales_uom_id IS NULL;