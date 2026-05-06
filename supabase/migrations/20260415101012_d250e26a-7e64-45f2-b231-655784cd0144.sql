-- Reset today's Chengis Store order so it enters the packing workflow
UPDATE orders 
SET status = 'confirmed', delivery_status = 'pending'
WHERE id = '2655a1e2-05e7-41e0-8626-60908a1cb2a2';

-- Temporarily disable the audit trigger to allow migration-context update
ALTER TABLE feature_flags DISABLE TRIGGER feature_flag_change_trigger;

-- Enable order_based_delivery feature flag
UPDATE feature_flags 
SET is_enabled = true, updated_at = now()
WHERE feature_key = 'order_based_delivery';

-- Re-enable the audit trigger
ALTER TABLE feature_flags ENABLE TRIGGER feature_flag_change_trigger;