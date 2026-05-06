
-- Create external_retailer_lists table
CREATE TABLE public.external_retailer_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.external_retailer_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lists"
  ON public.external_retailer_lists FOR SELECT
  TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Users can create own lists"
  ON public.external_retailer_lists FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own lists"
  ON public.external_retailer_lists FOR UPDATE
  TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own lists"
  ON public.external_retailer_lists FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- Create external_retailer_list_items table
CREATE TABLE public.external_retailer_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.external_retailer_lists(id) ON DELETE CASCADE,
  external_retailer_id BIGINT NOT NULL,
  pincode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(list_id, external_retailer_id)
);

ALTER TABLE public.external_retailer_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own list items"
  ON public.external_retailer_list_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.external_retailer_lists WHERE id = list_id AND created_by = auth.uid())
  );

CREATE POLICY "Users can insert own list items"
  ON public.external_retailer_list_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.external_retailer_lists WHERE id = list_id AND created_by = auth.uid())
  );

CREATE POLICY "Users can delete own list items"
  ON public.external_retailer_list_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.external_retailer_lists WHERE id = list_id AND created_by = auth.uid())
  );

-- Add conversion columns to retailer_external_db
ALTER TABLE public.retailer_external_db
  ADD COLUMN IF NOT EXISTS is_converted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_retailer_id UUID;
