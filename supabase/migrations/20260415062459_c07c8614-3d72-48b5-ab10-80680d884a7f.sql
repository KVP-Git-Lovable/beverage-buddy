
-- 1. Re-sync existing data: set quantity from available_qty + reserved_qty where quantity is 0 or NULL
UPDATE inventory_batches
SET quantity = COALESCE(available_qty, 0) + COALESCE(reserved_qty, 0)
WHERE (quantity IS NULL OR quantity = 0) AND COALESCE(available_qty, 0) > 0;

-- 2. Prevent future drift: trigger to auto-set quantity from available_qty on insert
CREATE OR REPLACE FUNCTION public.sync_inventory_batch_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If quantity is not provided (0 or NULL) but available_qty is, derive quantity
  IF (NEW.quantity IS NULL OR NEW.quantity = 0) AND COALESCE(NEW.available_qty, 0) > 0 THEN
    NEW.quantity := COALESCE(NEW.available_qty, 0) + COALESCE(NEW.reserved_qty, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_batch_quantity ON inventory_batches;
CREATE TRIGGER trg_sync_inventory_batch_quantity
  BEFORE INSERT ON inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_inventory_batch_quantity();
