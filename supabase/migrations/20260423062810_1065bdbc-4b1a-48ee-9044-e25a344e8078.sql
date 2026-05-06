-- Heal packing lists that have a driver assignment + delivery run linked
-- but were never advanced past 'draft'/'picking'/'packed' due to the prior bug.
UPDATE public.packing_lists pl
SET status = 'ready',
    updated_at = now()
WHERE pl.status IN ('draft', 'picking', 'packed')
  AND EXISTS (
    SELECT 1
    FROM public.delivery_run_packing_lists drpl
    WHERE drpl.packing_list_id = pl.id
  );