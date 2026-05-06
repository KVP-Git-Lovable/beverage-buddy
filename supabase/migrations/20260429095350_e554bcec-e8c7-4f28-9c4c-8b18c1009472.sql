-- Phase 1: Product Master schema additions

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS gst_percentage numeric,
  ADD COLUMN IF NOT EXISTS default_purchase_uom_id uuid REFERENCES public.uom_master(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opening_stock numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_level numeric;

ALTER TABLE public.product_uom_mapping
  ADD COLUMN IF NOT EXISTS is_default_purchase boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_uom_default_purchase
  ON public.product_uom_mapping (product_id)
  WHERE is_default_purchase = true;

UPDATE public.product_uom_mapping pum
SET is_default_purchase = true
WHERE is_default_sales = true
  AND NOT EXISTS (
    SELECT 1 FROM public.product_uom_mapping x
    WHERE x.product_id = pum.product_id
      AND x.is_default_purchase = true
  );

UPDATE public.products p
SET default_purchase_uom_id = (
  SELECT pum.uom_id
  FROM public.product_uom_mapping pum
  WHERE pum.product_id = p.id
    AND pum.is_default_purchase = true
  LIMIT 1
)
WHERE p.default_purchase_uom_id IS NULL;