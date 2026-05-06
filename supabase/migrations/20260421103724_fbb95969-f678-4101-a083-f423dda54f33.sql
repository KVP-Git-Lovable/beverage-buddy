CREATE OR REPLACE FUNCTION public.calc_transaction_balance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_prev_balance INTEGER;
  v_inward BOOLEAN;
  v_movement INTEGER;
BEGIN
  -- Movement amount comes in via balance_qty (callers pass a positive integer).
  v_movement := COALESCE(NEW.balance_qty, 0);

  -- Get previous running balance for this product+distributor (per-warehouse)
  SELECT running_balance INTO v_prev_balance
  FROM public.distributor_inventory_transactions
  WHERE distributor_id = NEW.distributor_id
    AND product_id = NEW.product_id
    AND COALESCE(warehouse_id::text, '') = COALESCE(NEW.warehouse_id::text, '')
    AND id != NEW.id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  v_prev_balance := COALESCE(v_prev_balance, 0);

  -- Inward types add to the running balance; everything else subtracts.
  v_inward := NEW.transaction_type IN ('GRN', 'OPENING_STOCK', 'RETURN', 'ADJUSTMENT_IN', 'RELEASE');

  IF v_inward THEN
    NEW.running_balance := v_prev_balance + ABS(v_movement);
  ELSE
    NEW.running_balance := v_prev_balance - ABS(v_movement);
  END IF;

  RETURN NEW;
END;
$function$;