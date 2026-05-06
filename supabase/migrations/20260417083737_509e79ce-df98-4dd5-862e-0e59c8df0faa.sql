CREATE OR REPLACE FUNCTION public.get_state_analytics()
 RETURNS TABLE(state_name text, total_districts bigint, total_pincodes bigint, total_retailers bigint, converted_retailers bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    SELECT 
      regexp_replace(UPPER(TRIM(state)), '\s*&\s*', ' AND ', 'g') AS state_norm,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_converted = true) AS converted
    FROM retailer_external_db
    WHERE state IS NOT NULL AND TRIM(state) != ''
    GROUP BY regexp_replace(UPPER(TRIM(state)), '\s*&\s*', ' AND ', 'g')
  ) r ON regexp_replace(UPPER(TRIM(p.statename)), '\s*&\s*', ' AND ', 'g') = r.state_norm
  GROUP BY p.statename, r.total, r.converted
  ORDER BY p.statename;
$function$;