-- Allow anon to read orders (for customer portal order history)
CREATE POLICY "Allow anon read orders for portal"
ON public.orders
FOR SELECT
TO anon
USING (true);

-- Allow anon to insert orders (for customer portal order placement)
CREATE POLICY "Allow anon insert orders for portal"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to read order_items for portal
CREATE POLICY "Allow anon read order_items for portal"
ON public.order_items
FOR SELECT
TO anon
USING (true);

-- Allow anon to insert order_items for portal
CREATE POLICY "Allow anon insert order_items for portal"
ON public.order_items
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to read products for catalog
CREATE POLICY "Allow anon read products for portal"
ON public.products
FOR SELECT
TO anon
USING (true);

-- Allow anon to read product_variants for catalog
CREATE POLICY "Allow anon read product_variants for portal"
ON public.product_variants
FOR SELECT
TO anon
USING (true);

-- Allow anon to read product_schemes for catalog
CREATE POLICY "Allow anon read product_schemes for portal"
ON public.product_schemes
FOR SELECT
TO anon
USING (true);