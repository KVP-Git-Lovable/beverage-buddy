ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_source TEXT;
NOTIFY pgrst, 'reload schema';