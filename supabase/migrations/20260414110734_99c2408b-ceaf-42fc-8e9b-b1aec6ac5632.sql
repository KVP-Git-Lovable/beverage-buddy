
-- One-time cleanup: release orphaned reserved stock
UPDATE inventory_batches ib
SET reserved_qty = 0
WHERE ib.reserved_qty > 0
  AND NOT EXISTS (
    SELECT 1
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    JOIN packing_lists pl ON pl.id = pli.packing_list_id
    WHERE plib.batch_id = ib.id
      AND pl.status NOT IN ('cancelled', 'dispatched')
  );
