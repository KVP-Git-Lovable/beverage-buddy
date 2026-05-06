
-- Add portal columns to retailers
ALTER TABLE public.retailers ADD COLUMN IF NOT EXISTS portal_enabled boolean DEFAULT false;
ALTER TABLE public.retailers ADD COLUMN IF NOT EXISTS portal_pin text;

-- Create customer portal cart table
CREATE TABLE public.customer_portal_cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL REFERENCES public.retailers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  variant_id uuid,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'pieces',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'voice', 'photo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_portal_cart ENABLE ROW LEVEL SECURITY;

-- Allow public access (portal uses localStorage auth, no Supabase Auth)
CREATE POLICY "Allow all access to customer_portal_cart" ON public.customer_portal_cart FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.customer_portal_cart TO anon, authenticated;
