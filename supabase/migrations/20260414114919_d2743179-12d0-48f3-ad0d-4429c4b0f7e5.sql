
-- Step 1: Reconcile reserved_quantity with actual batch totals
UPDATE distributor_inventory di
SET reserved_quantity = COALESCE(batch_totals.total_reserved, 0)
FROM (
  SELECT distributor_id, product_id, SUM(reserved_qty) as total_reserved
  FROM inventory_batches
  GROUP BY distributor_id, product_id
) batch_totals
WHERE di.distributor_id = batch_totals.distributor_id
  AND di.product_id = batch_totals.product_id
  AND di.reserved_quantity != COALESCE(batch_totals.total_reserved, 0);

-- Step 2: Zero out reserved_quantity where no reserved batches exist
UPDATE distributor_inventory di
SET reserved_quantity = 0
WHERE di.reserved_quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM inventory_batches ib
    WHERE ib.distributor_id = di.distributor_id
      AND ib.product_id = di.product_id
      AND ib.reserved_qty > 0
  );
