CREATE POLICY "Allow anon phone lookup for customer portal"
ON public.retailers
FOR SELECT
TO anon
USING (true);

-- Also allow anon to read/write customer_portal_cart
CREATE POLICY "Allow anon read customer_portal_cart"
ON public.customer_portal_cart
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon insert customer_portal_cart"
ON public.customer_portal_cart
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon update customer_portal_cart"
ON public.customer_portal_cart
FOR UPDATE
TO anon
USING (true);

CREATE POLICY "Allow anon delete customer_portal_cart"
ON public.customer_portal_cart
FOR DELETE
TO anon
USING (true);