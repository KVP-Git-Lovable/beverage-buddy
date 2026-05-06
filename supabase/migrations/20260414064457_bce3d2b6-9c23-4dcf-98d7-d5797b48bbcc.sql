
-- 1. Drop old transaction_type_check and replace with expanded one
ALTER TABLE public.distributor_inventory_transactions
  DROP CONSTRAINT IF EXISTS distributor_inventory_transactions_transaction_type_check;

ALTER TABLE public.distributor_inventory_transactions
  ADD CONSTRAINT distributor_inventory_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'inward', 'sale', 'return_from_retailer', 'return_to_company', 'adjustment',
    'OPENING_STOCK', 'GRN', 'RESERVE', 'RELEASE', 'MARK_DAMAGED', 'MARK_EXPIRED', 'DISPATCH'
  ));

-- 2. Drop old reference_type_check and replace with expanded one
ALTER TABLE public.distributor_inventory_transactions
  DROP CONSTRAINT IF EXISTS distributor_inventory_transactions_reference_type_check;

ALTER TABLE public.distributor_inventory_transactions
  ADD CONSTRAINT distributor_inventory_transactions_reference_type_check
  CHECK (reference_type IS NULL OR reference_type IN (
    'primary_order', 'secondary_order', 'retailer_return', 'company_return', 'adjustment',
    'opening_stock', 'grn', 'dispatch', 'packing_list'
  ));

-- 3. Drop old unique constraint on inventory_batches that lacks warehouse_id
ALTER TABLE public.inventory_batches
  DROP CONSTRAINT IF EXISTS inventory_batches_distributor_product_batchno_key;
