-- Helper function to determine which portal(s) a user belongs to
CREATE OR REPLACE FUNCTION public.get_user_type(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_distributor boolean := false;
  v_is_field boolean := false;
BEGIN
  -- Distributor identity: row in distributor_users linked via auth_user_id, active
  SELECT EXISTS (
    SELECT 1 FROM public.distributor_users
    WHERE auth_user_id = p_user_id
      AND is_active = true
  ) INTO v_is_distributor;

  -- Field-sales identity: row in user_profiles with an assigned security profile
  -- (this is how internal staff / admins / reps are provisioned)
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = p_user_id
      AND security_profile_id IS NOT NULL
  ) INTO v_is_field;

  IF v_is_distributor AND v_is_field THEN
    RETURN 'both';
  ELSIF v_is_distributor THEN
    RETURN 'distributor';
  ELSIF v_is_field THEN
    RETURN 'field_sales';
  ELSE
    RETURN 'none';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_type(uuid) TO authenticated, anon;