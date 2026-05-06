
-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_distinct_states();
DROP FUNCTION IF EXISTS public.get_distinct_districts(text);
DROP FUNCTION IF EXISTS public.get_distinct_pincodes(text, text);

-- Recreate RPC functions
CREATE OR REPLACE FUNCTION public.get_distinct_states()
RETURNS TABLE(statename text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT statename FROM pincode_master ORDER BY statename;
$$;

CREATE OR REPLACE FUNCTION public.get_distinct_districts(p_state text)
RETURNS TABLE(district text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT district FROM pincode_master WHERE statename = p_state ORDER BY district;
$$;

CREATE OR REPLACE FUNCTION public.get_distinct_pincodes(p_state text, p_district text)
RETURNS TABLE(pincode text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT pincode FROM pincode_master WHERE statename = p_state AND district = p_district ORDER BY pincode;
$$;
