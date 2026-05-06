-- Allow authenticated users to also read retailer notifications (customer portal broadcasts)
CREATE POLICY "Authenticated can read retailer notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (retailer_id IS NOT NULL);

-- Allow authenticated users to update (mark as read) retailer notifications
CREATE POLICY "Authenticated can update retailer notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (retailer_id IS NOT NULL)
WITH CHECK (retailer_id IS NOT NULL);