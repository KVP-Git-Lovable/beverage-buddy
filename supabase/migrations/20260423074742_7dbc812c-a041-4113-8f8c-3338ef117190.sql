ALTER TABLE public.delivery_runs DROP CONSTRAINT IF EXISTS delivery_runs_status_check;

ALTER TABLE public.delivery_runs
  ADD CONSTRAINT delivery_runs_status_check
  CHECK (status IN ('ready', 'planned', 'assigned', 'out_for_delivery', 'in_transit', 'dispatched', 'delivered', 'completed', 'cancelled'));