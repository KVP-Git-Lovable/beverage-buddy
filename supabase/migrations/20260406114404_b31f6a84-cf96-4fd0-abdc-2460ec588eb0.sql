
CREATE TABLE public.packing_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  packing_list_id UUID NOT NULL REFERENCES public.packing_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  unit TEXT,
  ordered_qty NUMERIC NOT NULL DEFAULT 0,
  picked_qty NUMERIC NOT NULL DEFAULT 0,
  short_qty NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.packing_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view packing list items"
  ON public.packing_list_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create packing list items"
  ON public.packing_list_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update packing list items"
  ON public.packing_list_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete packing list items"
  ON public.packing_list_items FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX idx_packing_list_items_packing_list_id ON public.packing_list_items(packing_list_id);
