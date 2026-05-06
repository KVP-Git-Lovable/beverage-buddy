-- Backfill stale available_qty values on existing batches
UPDATE public.inventory_batches
SET available_qty = GREATEST(0, COALESCE(quantity, 0) - COALESCE(reserved_qty, 0))
WHERE available_qty IS DISTINCT FROM GREATEST(0, COALESCE(quantity, 0) - COALESCE(reserved_qty, 0));

-- Self-healing trigger: always recompute available_qty on insert/update
CREATE OR REPLACE FUNCTION public.sync_inventory_batch_available_qty()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.available_qty := GREATEST(0, COALESCE(NEW.quantity, 0) - COALESCE(NEW.reserved_qty, 0));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_batch_available_qty ON public.inventory_batches;

CREATE TRIGGER trg_sync_inventory_batch_available_qty
BEFORE INSERT OR UPDATE OF quantity, reserved_qty, available_qty
ON public.inventory_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_batch_available_qty();