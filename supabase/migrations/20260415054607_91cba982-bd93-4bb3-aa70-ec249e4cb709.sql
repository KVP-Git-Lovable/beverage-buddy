-- 1. Create packing_list_item_batches table
CREATE TABLE public.packing_list_item_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  packing_list_item_id UUID NOT NULL REFERENCES public.packing_list_items(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.inventory_batches(id) ON DELETE RESTRICT,
  batch_number TEXT,
  expiry_date DATE,
  allocated_qty NUMERIC NOT NULL DEFAULT 0,
  picked_qty NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_plib_pli_id ON public.packing_list_item_batches(packing_list_item_id);
CREATE INDEX idx_plib_batch_id ON public.packing_list_item_batches(batch_id);

ALTER TABLE public.packing_list_item_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access on packing_list_item_batches"
  ON public.packing_list_item_batches
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Create packing_list_item_sources table
CREATE TABLE public.packing_list_item_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  packing_list_item_id UUID NOT NULL REFERENCES public.packing_list_items(id) ON DELETE CASCADE,
  order_id UUID,
  order_item_id UUID,
  product_id UUID,
  allocated_qty NUMERIC NOT NULL DEFAULT 0,
  backorder_qty NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_plis_pli_id ON public.packing_list_item_sources(packing_list_item_id);
CREATE INDEX idx_plis_order_item_id ON public.packing_list_item_sources(order_item_id);

ALTER TABLE public.packing_list_item_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access on packing_list_item_sources"
  ON public.packing_list_item_sources
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Add total_items column to packing_lists
ALTER TABLE public.packing_lists ADD COLUMN IF NOT EXISTS total_items INTEGER NOT NULL DEFAULT 0;