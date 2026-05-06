ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS net_weight_g numeric NULL,
  ADD COLUMN IF NOT EXISTS net_volume_ml numeric NULL,
  ADD COLUMN IF NOT EXISTS base_unit_category text NULL,
  ADD COLUMN IF NOT EXISTS price_basis_uom_id uuid NULL REFERENCES public.uom_master(id),
  ADD COLUMN IF NOT EXISTS default_sales_uom_id uuid NULL REFERENCES public.uom_master(id);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_base_unit_category_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_base_unit_category_check
  CHECK (base_unit_category IS NULL OR base_unit_category IN ('Weight','Volume','Quantity'));