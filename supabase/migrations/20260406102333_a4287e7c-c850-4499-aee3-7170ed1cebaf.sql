
-- Step 1: Add packing_list_id column
ALTER TABLE public.primary_orders 
  ADD COLUMN IF NOT EXISTS packing_list_id uuid REFERENCES public.packing_lists(id);

-- Step 2: Index for packing list lookups
CREATE INDEX IF NOT EXISTS idx_primary_orders_packing_list 
  ON public.primary_orders(packing_list_id);

-- Step 3: Drop and re-create status constraint with all values
ALTER TABLE public.primary_orders 
  DROP CONSTRAINT IF EXISTS primary_orders_status_check;

ALTER TABLE public.primary_orders 
  ADD CONSTRAINT primary_orders_status_check 
  CHECK (status IN ('draft', 'pending', 'submitted', 'confirmed', 'processing', 'allocated', 'partially_delivered', 'shipped', 'delivered', 'cancelled'));

-- Step 4: Default and NOT NULL for consistency
ALTER TABLE public.primary_orders 
  ALTER COLUMN status SET DEFAULT 'draft',
  ALTER COLUMN status SET NOT NULL;
