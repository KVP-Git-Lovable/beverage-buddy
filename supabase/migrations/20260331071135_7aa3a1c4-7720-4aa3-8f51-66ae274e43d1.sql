
CREATE TABLE public.customer_portal_voice_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID NOT NULL REFERENCES public.retailers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  variant_id UUID,
  variant_name TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'KG',
  rate NUMERIC NOT NULL DEFAULT 0,
  sku TEXT,
  search_term TEXT,
  confidence TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_portal_voice_orders ENABLE ROW LEVEL SECURITY;

-- Allow anon to read/write (customer portal uses anon key)
CREATE POLICY "anon_select_voice_orders" ON public.customer_portal_voice_orders
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_voice_orders" ON public.customer_portal_voice_orders
  FOR INSERT TO anon WITH CHECK (retailer_id IS NOT NULL);

CREATE POLICY "anon_update_voice_orders" ON public.customer_portal_voice_orders
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_voice_orders" ON public.customer_portal_voice_orders
  FOR DELETE TO anon USING (true);

-- Index for fast lookups by retailer
CREATE INDEX idx_voice_orders_retailer ON public.customer_portal_voice_orders(retailer_id);
