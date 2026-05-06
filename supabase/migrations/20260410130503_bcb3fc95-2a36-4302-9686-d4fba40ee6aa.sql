
-- Phase 1A: Controlled Fulfillment Enhancement

-- 1. Add approval columns to primary_order_items
ALTER TABLE public.primary_order_items
  ADD COLUMN IF NOT EXISTS approved_qty INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rejected_qty INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS backorder_qty INTEGER DEFAULT 0;

-- 2. Add approval columns to order_items (secondary)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS approved_qty INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rejected_qty INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS backorder_qty INTEGER DEFAULT 0;

-- 3. Add backorder linking to primary_orders
ALTER TABLE public.primary_orders
  ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES public.primary_orders(id),
  ADD COLUMN IF NOT EXISTS is_backorder BOOLEAN DEFAULT false;

-- 4. Add backorder linking to orders (secondary)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES public.orders(id),
  ADD COLUMN IF NOT EXISTS is_backorder BOOLEAN DEFAULT false;

-- 5. Create packing_list_item_sources table
CREATE TABLE IF NOT EXISTS public.packing_list_item_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  packing_list_item_id UUID NOT NULL REFERENCES public.packing_list_items(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('primary', 'secondary')),
  allocated_qty INTEGER NOT NULL CHECK (allocated_qty > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.packing_list_item_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view packing list item sources"
  ON public.packing_list_item_sources FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert packing list item sources"
  ON public.packing_list_item_sources FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX idx_plis_packing_list_item_id ON public.packing_list_item_sources(packing_list_item_id);
CREATE INDEX idx_plis_order_item_id ON public.packing_list_item_sources(order_item_id);

-- 6. Create delivery_exceptions table
CREATE TABLE IF NOT EXISTS public.delivery_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_run_id UUID NOT NULL REFERENCES public.delivery_runs(id) ON DELETE CASCADE,
  packing_list_id UUID NOT NULL REFERENCES public.packing_lists(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('partial_delivery', 'failed_delivery', 'damaged', 'refused')),
  description TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view delivery exceptions"
  ON public.delivery_exceptions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert delivery exceptions"
  ON public.delivery_exceptions FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update delivery exceptions"
  ON public.delivery_exceptions FOR UPDATE
  TO authenticated USING (true);

-- 7. Add delivery mode fields to delivery_runs
ALTER TABLE public.delivery_runs
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS dispatch_date DATE,
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS transporter_name TEXT,
  ADD COLUMN IF NOT EXISTS tracking_id TEXT,
  ADD COLUMN IF NOT EXISTS lr_number TEXT,
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_number TEXT;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
