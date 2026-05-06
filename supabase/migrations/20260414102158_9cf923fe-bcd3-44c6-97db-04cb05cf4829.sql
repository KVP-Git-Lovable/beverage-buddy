
CREATE OR REPLACE FUNCTION get_unsorted_state_analytics()
RETURNS TABLE(
  state_name TEXT,
  total_districts BIGINT,
  total_pincodes BIGINT,
  total_retailers BIGINT,
  converted_retailers BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    UPPER(TRIM(state)) AS state_name,
    COUNT(DISTINCT district),
    COUNT(DISTINCT pincode),
    COUNT(*),
    COUNT(*) FILTER (WHERE is_converted = true)
  FROM retailer_external_unsorted
  WHERE state IS NOT NULL AND TRIM(state) != ''
  GROUP BY UPPER(TRIM(state))
  ORDER BY 1;
$$;
