-- Allow authenticated sessions to create customer portal orders routed to retailer owner
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
  AND EXISTS (
    SELECT 1
    FROM public.retailers r
    WHERE r.id = orders.retailer_id
      AND COALESCE(r.owner_id, r.user_id) = orders.user_id
  )
);

-- Allow authenticated sessions to add items to portal orders
DROP POLICY IF EXISTS "Allow authenticated insert order_items for portal" ON public.order_items;
CREATE POLICY "Allow authenticated insert order_items for portal"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.order_source = 'portal_order'
  )
);