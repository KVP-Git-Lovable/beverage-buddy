-- Allow anon role to read price books for customer portal
CREATE POLICY "Allow anon read price_books" ON public.price_books
FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read price_book_entries" ON public.price_book_entries
FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read distributor_price_books" ON public.distributor_price_books
FOR SELECT TO anon USING (true);

-- Also allow anon to read distributors for name lookup
CREATE POLICY "Allow anon read distributors for portal" ON public.distributors
FOR SELECT TO anon USING (true);