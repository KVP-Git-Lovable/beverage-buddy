
-- 1) Reconciliation: insert legacy backfill batches where aggregate available > sum of batches
DO $$
DECLARE
  rec RECORD;
  v_sku TEXT;
  v_wh_code TEXT;
  v_batch_no TEXT;
BEGIN
  FOR rec IN
    WITH agg AS (
      SELECT di.distributor_id, di.product_id, di.warehouse_id,
        (di.quantity - COALESCE(di.reserved_quantity,0) - COALESCE(di.damaged_quantity,0) - COALESCE(di.expired_quantity,0)) AS agg_avail
      FROM distributor_inventory di
    ), batches AS (
      SELECT distributor_id, product_id, warehouse_id, COALESCE(SUM(available_qty),0) AS batch_avail
      FROM inventory_batches GROUP BY 1,2,3
    )
    SELECT a.distributor_id, a.product_id, a.warehouse_id,
           (a.agg_avail - COALESCE(b.batch_avail,0)) AS gap
    FROM agg a LEFT JOIN batches b
      ON a.distributor_id=b.distributor_id AND a.product_id=b.product_id AND a.warehouse_id=b.warehouse_id
    WHERE a.agg_avail > COALESCE(b.batch_avail,0)
  LOOP
    -- Build readable batch code: LEGACY-{sku}-{wh_code}
    SELECT COALESCE(NULLIF(sku,''), SUBSTRING(rec.product_id::text,1,8))
      INTO v_sku FROM products WHERE id = rec.product_id;
    SELECT COALESCE(NULLIF(code,''), SUBSTRING(rec.warehouse_id::text,1,8))
      INTO v_wh_code FROM warehouses WHERE id = rec.warehouse_id;

    v_batch_no := 'LEGACY-' || COALESCE(v_wh_code,'WH') || '-' || COALESCE(v_sku,'PROD');

    -- Avoid colliding with an existing batch_no for same (distributor,product,warehouse)
    IF EXISTS (
      SELECT 1 FROM inventory_batches
       WHERE distributor_id=rec.distributor_id AND product_id=rec.product_id
         AND warehouse_id=rec.warehouse_id AND batch_no=v_batch_no
    ) THEN
      v_batch_no := v_batch_no || '-' || to_char(now(),'YYMMDDHH24MISS');
    END IF;

    INSERT INTO inventory_batches (
      distributor_id, product_id, warehouse_id,
      batch_no, system_batch_code, supplier_batch_code,
      quantity, available_qty, reserved_qty,
      mfg_date, expiry_date
    ) VALUES (
      rec.distributor_id, rec.product_id, rec.warehouse_id,
      v_batch_no, v_batch_no, NULL,
      rec.gap, rec.gap, 0,
      NULL, NULL
    );
  END LOOP;
END $$;

-- 2) Stability trigger: clamp available_qty to (quantity - reserved_qty) on insert/update
CREATE OR REPLACE FUNCTION public.clamp_inventory_batch_available()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_max INTEGER;
BEGIN
  v_max := GREATEST(0, COALESCE(NEW.quantity,0) - COALESCE(NEW.reserved_qty,0));
  IF NEW.available_qty IS NULL OR NEW.available_qty > v_max THEN
    NEW.available_qty := v_max;
  END IF;
  IF NEW.available_qty < 0 THEN
    NEW.available_qty := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clamp_inventory_batch_available ON public.inventory_batches;
CREATE TRIGGER trg_clamp_inventory_batch_available
BEFORE INSERT OR UPDATE OF quantity, reserved_qty, available_qty
ON public.inventory_batches
FOR EACH ROW
EXECUTE FUNCTION public.clamp_inventory_batch_available();
