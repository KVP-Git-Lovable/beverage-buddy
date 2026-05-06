ALTER TABLE public.counter_sales
  ADD COLUMN IF NOT EXISTS subtotal numeric NULL,
  ADD COLUMN IF NOT EXISTS cgst_amount numeric NULL,
  ADD COLUMN IF NOT EXISTS sgst_amount numeric NULL,
  ADD COLUMN IF NOT EXISTS tax_amount numeric NULL;