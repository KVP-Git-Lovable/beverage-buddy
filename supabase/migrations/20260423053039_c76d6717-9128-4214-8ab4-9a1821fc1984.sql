ALTER TABLE public.packing_list_item_batches
  ADD COLUMN IF NOT EXISTS packed_qty numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS packed_by  uuid;

CREATE OR REPLACE FUNCTION public.validate_batch_packed_qty()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.packed_qty IS NULL THEN
    NEW.packed_qty := 0;
  END IF;
  IF NEW.packed_qty < 0 THEN
    RAISE EXCEPTION 'packed_qty cannot be negative';
  END IF;
  IF NEW.packed_qty > COALESCE(NEW.picked_qty, 0) THEN
    RAISE EXCEPTION 'packed_qty (%) cannot exceed picked_qty (%)', NEW.packed_qty, NEW.picked_qty;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_batch_packed_qty ON public.packing_list_item_batches;
CREATE TRIGGER trg_validate_batch_packed_qty
  BEFORE INSERT OR UPDATE ON public.packing_list_item_batches
  FOR EACH ROW EXECUTE FUNCTION public.validate_batch_packed_qty();