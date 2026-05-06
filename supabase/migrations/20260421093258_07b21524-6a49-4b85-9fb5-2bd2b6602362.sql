-- Add UPDATE policy for internal/field staff (non-portal users)
CREATE POLICY "Field staff can update distributors"
ON public.distributors
FOR UPDATE
TO authenticated
USING (get_distributor_id_for_auth_user() IS NULL)
WITH CHECK (get_distributor_id_for_auth_user() IS NULL);

-- Add DELETE policy for internal/field staff
CREATE POLICY "Field staff can delete distributors"
ON public.distributors
FOR DELETE
TO authenticated
USING (get_distributor_id_for_auth_user() IS NULL);

-- Ensure updated_at auto-bumps on every update
CREATE OR REPLACE FUNCTION public.set_distributors_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_distributors_updated_at ON public.distributors;
CREATE TRIGGER trg_distributors_updated_at
BEFORE UPDATE ON public.distributors
FOR EACH ROW
EXECUTE FUNCTION public.set_distributors_updated_at();