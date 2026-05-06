
ALTER TABLE primary_orders
  ADD COLUMN source_distributor_id uuid REFERENCES distributors(id),
  ADD COLUMN target_distributor_id uuid REFERENCES distributors(id);

-- Backfill existing orders
UPDATE primary_orders SET source_distributor_id = distributor_id WHERE source_distributor_id IS NULL;

-- Now enforce NOT NULL
ALTER TABLE primary_orders ALTER COLUMN source_distributor_id SET NOT NULL;

NOTIFY pgrst, 'reload schema';
