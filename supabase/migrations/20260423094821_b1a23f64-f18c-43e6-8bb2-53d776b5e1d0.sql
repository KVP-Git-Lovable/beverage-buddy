ALTER TABLE public.primary_orders DROP CONSTRAINT IF EXISTS primary_orders_status_check;

ALTER TABLE public.primary_orders
  ADD CONSTRAINT primary_orders_status_check
  CHECK (status = ANY (ARRAY[
    'draft','pending','submitted','confirmed','processing',
    'allocated','packed','dispatched','shipped',
    'partially_delivered','delivered','completed','cancelled','rejected'
  ]));