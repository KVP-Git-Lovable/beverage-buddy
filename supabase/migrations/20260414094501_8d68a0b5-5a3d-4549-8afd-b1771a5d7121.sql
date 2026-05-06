CREATE OR REPLACE FUNCTION public.get_state_analytics()
RETURNS TABLE(
  state_name TEXT,
  total_districts BIGINT,
  total_pincodes BIGINT,
  total_retailers BIGINT,
  converted_retailers BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.statename AS state_name,
    COUNT(DISTINCT p.district) AS total_districts,
    COUNT(DISTINCT p.pincode) AS total_pincodes,
    COALESCE(r.total, 0) AS total_retailers,
    COALESCE(r.converted, 0) AS converted_retailers
  FROM (
    SELECT DISTINCT statename, district, pincode 
    FROM pincode_master 
    WHERE statename IS NOT NULL AND statename != '' AND statename != 'NA'
  ) p
  LEFT JOIN (
    SELECT UPPER(TRIM(state)) AS state_upper,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE is_converted = true) AS converted
    FROM retailer_external_db
    WHERE state IS NOT NULL AND TRIM(state) != ''
    GROUP BY UPPER(TRIM(state))
  ) r ON p.statename = r.state_upper
  GROUP BY p.statename, r.total, r.converted
  ORDER BY p.statename;
$$;