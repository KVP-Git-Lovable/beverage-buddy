-- Step 1: Add source column
ALTER TABLE retailer_external_db ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Step 2: Bulk insert with deduplication
INSERT INTO retailer_external_db (
  company_name, address, city, pincode, state,
  mobile, email, website, category,
  latitude, longitude, source
)
SELECT
  COALESCE(NULLIF(TRIM(u.company_name), ''), 'Unknown Store'),
  u.address,
  COALESCE(NULLIF(TRIM(u.city), ''), 'Unknown'),
  u.pincode,
  COALESCE(NULLIF(TRIM(u.state), ''), 'Unknown'),
  u.mobile, u.email, u.website, u.category,
  u.latitude, u.longitude,
  'unsorted_import'
FROM retailer_external_unsorted u
WHERE NOT EXISTS (
  SELECT 1 FROM retailer_external_db e
  WHERE e.mobile IS NOT NULL AND e.mobile != ''
    AND u.mobile IS NOT NULL AND u.mobile != ''
    AND e.mobile = u.mobile
)
AND NOT EXISTS (
  SELECT 1 FROM retailer_external_db e
  WHERE e.company_name = COALESCE(NULLIF(TRIM(u.company_name), ''), 'Unknown Store')
    AND e.pincode IS NOT NULL AND u.pincode IS NOT NULL
    AND e.pincode = u.pincode
);