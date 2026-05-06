-- Allow anon role to insert visits for customer portal orders
CREATE POLICY "Allow anon insert visits for portal"
ON public.visits
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon role to select visits for conflict check
CREATE POLICY "Allow anon select visits for portal"
ON public.visits
FOR SELECT
TO anon
USING (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';