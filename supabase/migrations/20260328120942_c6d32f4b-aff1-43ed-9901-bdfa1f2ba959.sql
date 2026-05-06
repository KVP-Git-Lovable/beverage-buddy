DROP POLICY IF EXISTS "Allow authenticated insert orders for portal" ON public.orders;
CREATE POLICY "Allow authenticated insert orders for portal"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  order_source = 'portal_order'
  AND retailer_id IS NOT NULL
  AND user_id IS NOT NULL
  AND subtotal IS NOT NULL
  AND total_amount IS NOT NULL
  AND (status IS NULL OR status IN ('pending','confirmed'))
);