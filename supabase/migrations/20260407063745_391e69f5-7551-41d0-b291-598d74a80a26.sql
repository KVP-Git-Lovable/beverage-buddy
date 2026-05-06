ALTER TABLE public.customer_portal_cart ADD COLUMN retailer_id uuid;
DELETE FROM public.customer_portal_cart WHERE retailer_id IS NULL;
ALTER TABLE public.customer_portal_cart ALTER COLUMN retailer_id SET NOT NULL;