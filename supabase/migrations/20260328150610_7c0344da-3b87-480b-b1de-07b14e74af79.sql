-- Backfill existing portal orders from pending to confirmed
UPDATE public.orders SET status = 'confirmed' WHERE order_source = 'portal_order' AND status = 'pending';

-- Update visits linked to portal orders to productive status
UPDATE public.visits SET status = 'completed'
WHERE id IN (
  SELECT DISTINCT visit_id FROM public.orders 
  WHERE order_source = 'portal_order' AND visit_id IS NOT NULL
) AND status IN ('planned', 'in_progress');