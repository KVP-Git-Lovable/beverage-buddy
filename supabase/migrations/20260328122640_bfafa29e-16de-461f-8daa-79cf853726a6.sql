-- Make invoice number generation collision-safe for orders
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_val BIGINT;
  year_part TEXT;
  candidate TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

  LOOP
    next_val := nextval('public.invoice_number_seq');
    candidate := 'INV' || year_part || '-' || LPAD(next_val::TEXT, 3, '0');

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.invoice_number = candidate
    );
  END LOOP;

  RETURN candidate;
END;
$$;

-- Ensure sequence is never behind existing invoice numbers
SELECT setval(
  'public.invoice_number_seq',
  GREATEST(
    COALESCE(
      (
        SELECT MAX((regexp_match(invoice_number, '^INV[0-9]{4}-([0-9]+)$'))[1]::BIGINT)
        FROM public.orders
        WHERE invoice_number ~ '^INV[0-9]{4}-[0-9]+$'
      ),
      0
    ),
    (SELECT last_value FROM public.invoice_number_seq)
  ),
  true
);

-- Regenerate invoice number when missing/blank/duplicate on insert
CREATE OR REPLACE FUNCTION public.set_order_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL
     OR BTRIM(NEW.invoice_number) = ''
     OR EXISTS (
       SELECT 1
       FROM public.orders o
       WHERE o.invoice_number = NEW.invoice_number
     ) THEN
    NEW.invoice_number := public.generate_invoice_number();
  END IF;

  RETURN NEW;
END;
$$;