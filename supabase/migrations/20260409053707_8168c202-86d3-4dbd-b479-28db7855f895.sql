
ALTER TABLE public.primary_orders
ADD COLUMN IF NOT EXISTS packing_list_id UUID
REFERENCES public.packing_lists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_primary_orders_unassigned
ON public.primary_orders(packing_list_id)
WHERE packing_list_id IS NULL;
