-- Grant anon role SELECT on product tables for customer portal
GRANT SELECT ON TABLE public.products TO anon;
GRANT SELECT ON TABLE public.product_variants TO anon;
GRANT SELECT ON TABLE public.product_schemes TO anon;
GRANT SELECT ON TABLE public.product_categories TO anon;

-- Grant anon role permissions on order tables for customer portal
GRANT SELECT, INSERT ON TABLE public.orders TO anon;
GRANT SELECT, INSERT ON TABLE public.order_items TO anon;

-- Grant anon role full CRUD on cart
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_portal_cart TO anon;

-- Grant anon SELECT on product_categories for catalog filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_categories' 
    AND policyname = 'Allow anon read product_categories for portal'
  ) THEN
    CREATE POLICY "Allow anon read product_categories for portal"
    ON public.product_categories FOR SELECT TO anon USING (true);
  END IF;
END $$;