CREATE POLICY "Authenticated users can update retailer_external_db"
ON public.retailer_external_db
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);