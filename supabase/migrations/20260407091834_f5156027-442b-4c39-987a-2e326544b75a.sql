
ALTER TABLE public.customer_portal_cart 
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'pieces';

-- Remove any existing duplicates before adding unique constraint
DELETE FROM public.customer_portal_cart a
USING public.customer_portal_cart b
WHERE a.id > b.id
  AND a.retailer_id = b.retailer_id
  AND a.product_id = b.product_id;

ALTER TABLE public.customer_portal_cart 
  ADD CONSTRAINT customer_portal_cart_retailer_product_unique 
  UNIQUE (retailer_id, product_id);

NOTIFY pgrst, 'reload schema';
