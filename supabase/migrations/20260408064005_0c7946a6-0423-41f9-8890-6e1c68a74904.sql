CREATE POLICY "Allow anon update customer_portal_cart"
  ON public.customer_portal_cart
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);