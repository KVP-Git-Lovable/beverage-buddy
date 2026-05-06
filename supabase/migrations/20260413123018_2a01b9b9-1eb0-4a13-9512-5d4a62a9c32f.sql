-- 1. Enforce NOT NULL on warehouse_id across all 3 tables
ALTER TABLE distributor_inventory ALTER COLUMN warehouse_id SET NOT NULL;
ALTER TABLE distributor_inventory_transactions ALTER COLUMN warehouse_id SET NOT NULL;
ALTER TABLE inventory_batches ALTER COLUMN warehouse_id SET NOT NULL;

-- 2. Partial unique index: only one default warehouse per distributor
CREATE UNIQUE INDEX one_default_per_distributor
ON warehouses(distributor_id) WHERE is_default = true;

-- 3. Unique constraint: one inventory row per product per warehouse per distributor
ALTER TABLE distributor_inventory
ADD CONSTRAINT distributor_inventory_dist_prod_wh_unique
UNIQUE(distributor_id, product_id, warehouse_id);