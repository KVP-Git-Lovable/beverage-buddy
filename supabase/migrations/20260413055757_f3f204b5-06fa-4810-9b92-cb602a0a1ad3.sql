-- Fix past conversions: mark external retailers as converted when matching internal retailer exists
UPDATE retailer_external_db e
SET is_converted = true,
    converted_retailer_id = r.id
FROM retailers r
WHERE LOWER(TRIM(e.company_name)) = LOWER(TRIM(r.name))
  AND e.is_converted = false;