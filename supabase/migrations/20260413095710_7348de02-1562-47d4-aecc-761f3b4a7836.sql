
-- Step 1: Rename columns
ALTER TABLE retailer_external_unsorted RENAME COLUMN "Retailer's Name" TO company_name;
ALTER TABLE retailer_external_unsorted RENAME COLUMN "Retailer's Number" TO mobile;
ALTER TABLE retailer_external_unsorted RENAME COLUMN "City" TO city;
ALTER TABLE retailer_external_unsorted RENAME COLUMN "State" TO state;
ALTER TABLE retailer_external_unsorted RENAME COLUMN "District" TO district;
ALTER TABLE retailer_external_unsorted RENAME COLUMN "Village Visited" TO village;
ALTER TABLE retailer_external_unsorted RENAME COLUMN pin_code TO pincode;

-- Step 2: Add missing columns
ALTER TABLE retailer_external_unsorted
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS match_score integer,
  ADD COLUMN IF NOT EXISTS match_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS is_converted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_retailer_id uuid;

-- Step 3: Convert Lat/Long from TEXT to DOUBLE PRECISION
ALTER TABLE retailer_external_unsorted
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision;

UPDATE retailer_external_unsorted
SET latitude = CASE
    WHEN "Lat" IS NOT NULL AND "Lat" ~ '^-?[0-9]+\.?[0-9]*$' THEN "Lat"::double precision
    ELSE NULL
  END,
  longitude = CASE
    WHEN "Long" IS NOT NULL AND "Long" ~ '^-?[0-9]+\.?[0-9]*$' THEN "Long"::double precision
    ELSE NULL
  END;

ALTER TABLE retailer_external_unsorted DROP COLUMN "Lat";
ALTER TABLE retailer_external_unsorted DROP COLUMN "Long";

-- Step 4: Fix NULLs and constraints
UPDATE retailer_external_unsorted SET company_name = 'Unknown' WHERE company_name IS NULL;
ALTER TABLE retailer_external_unsorted ALTER COLUMN company_name SET NOT NULL;
ALTER TABLE retailer_external_unsorted ALTER COLUMN city SET NOT NULL;
ALTER TABLE retailer_external_unsorted ALTER COLUMN state SET NOT NULL;
ALTER TABLE retailer_external_unsorted ALTER COLUMN mobile DROP NOT NULL;

-- Step 5: Drop and recreate RPC functions
DROP FUNCTION IF EXISTS get_retailer_unsorted_states();
DROP FUNCTION IF EXISTS get_retailer_unsorted_districts(text);
DROP FUNCTION IF EXISTS get_retailer_unsorted_cities(text, text);

CREATE OR REPLACE FUNCTION get_retailer_unsorted_states()
RETURNS TABLE(state text, count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT state, COUNT(*) as count
  FROM retailer_external_unsorted
  WHERE state IS NOT NULL AND state != ''
  GROUP BY state
  ORDER BY state;
$$;

CREATE OR REPLACE FUNCTION get_retailer_unsorted_districts(p_state text)
RETURNS TABLE(district text, count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT district, COUNT(*) as count
  FROM retailer_external_unsorted
  WHERE state = p_state
    AND district IS NOT NULL AND district != ''
  GROUP BY district
  ORDER BY district;
$$;

CREATE OR REPLACE FUNCTION get_retailer_unsorted_cities(p_state text, p_district text)
RETURNS TABLE(city text, count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT city, COUNT(*) as count
  FROM retailer_external_unsorted
  WHERE state = p_state
    AND district = p_district
    AND city IS NOT NULL AND city != ''
  GROUP BY city
  ORDER BY city;
$$;
