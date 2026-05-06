-- Add missing transaction_type column to distributor_inventory_transactions
ALTER TABLE public.distributor_inventory_transactions
ADD COLUMN IF NOT EXISTS transaction_type text;

-- Add missing unit column to distributor_inventory
ALTER TABLE public.distributor_inventory
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'pcs';

-- Backfill transaction_type from reference_type where possible
UPDATE public.distributor_inventory_transactions
SET transaction_type = reference_type
WHERE transaction_type IS NULL AND reference_type IS NOT NULL;

-- Create index on transaction_type for check_opening_stock_exists performance
CREATE INDEX IF NOT EXISTS idx_dit_transaction_type
ON public.distributor_inventory_transactions (distributor_id, product_id, warehouse_id, transaction_type);