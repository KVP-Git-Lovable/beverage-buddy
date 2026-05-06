-- Step 1: Link retailer to KVP distributor
UPDATE public.retailers
SET distributor_id = 'aaecae93-4167-481d-ad24-0162eee5283a'
WHERE id = '5925524c-5c13-4ccb-800f-0590e99e8dd0'
  AND (distributor_id IS NULL OR distributor_id != 'aaecae93-4167-481d-ad24-0162eee5283a');

-- Step 2: Fix existing portal orders with NULL distributor_id
UPDATE public.orders
SET distributor_id = 'aaecae93-4167-481d-ad24-0162eee5283a'
WHERE retailer_id = '5925524c-5c13-4ccb-800f-0590e99e8dd0'
  AND distributor_id IS NULL
  AND order_source = 'portal_order';