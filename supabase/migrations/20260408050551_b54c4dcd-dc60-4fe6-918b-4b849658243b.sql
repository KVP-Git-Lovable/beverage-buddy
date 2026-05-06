
-- Create company_product_categories table
CREATE TABLE public.company_product_categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  categories_json JSONB NOT NULL DEFAULT '{"categories": []}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

-- Enable RLS
ALTER TABLE public.company_product_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can read company product categories"
ON public.company_product_categories FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert company product categories"
ON public.company_product_categories FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update company product categories"
ON public.company_product_categories FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_company_product_categories_updated_at
BEFORE UPDATE ON public.company_product_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
