
-- 1. Recreate the missing sequence used by generate_invoice_number()
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

-- Seed it past any existing invoice numbers so we don't collide
SELECT setval('public.invoice_number_seq',
  GREATEST(
    COALESCE((
      SELECT MAX(NULLIF(regexp_replace(invoice_number, '^INV\d{4}-', ''), '')::bigint)
      FROM public.orders
      WHERE invoice_number ~ '^INV\d{4}-\d+$'
    ), 0),
    1
  )
);

-- 2. Repair sync_order_with_items: remove the obsolete beat_name column
CREATE OR REPLACE FUNCTION public.sync_order_with_items(p_order jsonb, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_existing_order_id uuid;
  v_items_count int := 0;
BEGIN
  v_order_id := NULLIF(p_order->>'id', '')::uuid;

  IF v_order_id IS NOT NULL THEN
    SELECT id INTO v_existing_order_id FROM orders WHERE id = v_order_id;
  END IF;

  IF v_existing_order_id IS NOT NULL THEN
    SELECT count(*) INTO v_items_count FROM order_items WHERE order_id = v_existing_order_id;

    IF v_items_count = 0 AND jsonb_array_length(p_items) > 0 THEN
      INSERT INTO order_items (
        order_id, product_id, product_name, quantity,
        rate, total, hsn_code, unit
      )
      SELECT
        v_existing_order_id,
        NULLIF(item->>'product_id','')::uuid,
        item->>'product_name',
        COALESCE((item->>'quantity')::numeric, 0),
        COALESCE((item->>'rate')::numeric, COALESCE((item->>'price')::numeric, 0)),
        COALESCE((item->>'total')::numeric, 0),
        item->>'hsn_code',
        item->>'unit'
      FROM jsonb_array_elements(p_items) AS item;
    END IF;

    RETURN jsonb_build_object('order_id', v_existing_order_id, 'status', 'existing', 'items_inserted', v_items_count = 0);
  END IF;

  INSERT INTO orders (
    id, user_id, retailer_id, retailer_name, visit_id,
    order_date, total_amount, status, payment_method,
    is_credit_order, credit_pending_amount, credit_paid_amount,
    previous_pending_cleared, invoice_number, idempotency_key,
    created_at, updated_at
  ) VALUES (
    COALESCE(v_order_id, gen_random_uuid()),
    NULLIF(p_order->>'user_id', '')::uuid,
    NULLIF(p_order->>'retailer_id', '')::uuid,
    p_order->>'retailer_name',
    NULLIF(p_order->>'visit_id', '')::uuid,
    COALESCE(p_order->>'order_date', CURRENT_DATE::text)::date,
    COALESCE((p_order->>'total_amount')::numeric, 0),
    COALESCE(p_order->>'status', 'confirmed'),
    p_order->>'payment_method',
    COALESCE((p_order->>'is_credit_order')::boolean, false),
    COALESCE((p_order->>'credit_pending_amount')::numeric, 0),
    COALESCE((p_order->>'credit_paid_amount')::numeric, 0),
    COALESCE((p_order->>'previous_pending_cleared')::numeric, 0),
    NULLIF(p_order->>'invoice_number', ''),
    p_order->>'idempotency_key',
    COALESCE((p_order->>'created_at')::timestamptz, now()),
    now()
  )
  RETURNING id INTO v_order_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO order_items (
      order_id, product_id, product_name, quantity,
      rate, total, hsn_code, unit
    )
    SELECT
      v_order_id,
      NULLIF(item->>'product_id','')::uuid,
      item->>'product_name',
      COALESCE((item->>'quantity')::numeric, 0),
      COALESCE((item->>'rate')::numeric, COALESCE((item->>'price')::numeric, 0)),
      COALESCE((item->>'total')::numeric, 0),
      item->>'hsn_code',
      item->>'unit'
    FROM jsonb_array_elements(p_items) AS item;
  END IF;

  RETURN jsonb_build_object('order_id', v_order_id, 'status', 'created', 'items_inserted', true);

EXCEPTION WHEN unique_violation THEN
  SELECT id INTO v_order_id FROM orders WHERE id = NULLIF(p_order->>'id','')::uuid;
  RETURN jsonb_build_object('order_id', COALESCE(v_order_id, gen_random_uuid()), 'status', 'conflict', 'items_inserted', false);
END;
$function$;

-- 3. Bulk prefetch RPC for all enabled product UOM mappings.
-- Called once on order entry page load to eliminate per-product RPC delay.
CREATE OR REPLACE FUNCTION public.get_all_product_units()
 RETURNS TABLE(
   product_id uuid,
   mapping_id uuid,
   uom_id uuid,
   code text,
   name text,
   category text,
   conversion_to_base numeric,
   is_base boolean,
   is_default_sales boolean,
   is_active boolean,
   is_price_basis boolean,
   is_default_purchase boolean
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.product_id, p.id, m.id, m.code, m.name, m.category,
         p.conversion_to_base, p.is_base, p.is_default_sales,
         COALESCE(p.is_active, true) AS is_active,
         COALESCE(p.is_price_basis, false) AS is_price_basis,
         COALESCE(p.is_default_purchase, false) AS is_default_purchase
  FROM public.product_uom_mapping p
  JOIN public.uom_master m ON m.id = p.uom_id
  LEFT JOIN public.enabled_units eu ON eu.uom_id = m.id
  WHERE COALESCE(p.is_active, true) = true
    AND (COALESCE(p.is_base, false) = true OR COALESCE(eu.enabled, true) = true)
  ORDER BY p.product_id, p.is_base DESC, p.is_default_sales DESC, m.name;
$function$;

GRANT EXECUTE ON FUNCTION public.get_all_product_units() TO anon, authenticated;
