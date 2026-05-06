
-- 1. Create helper: resolve auth.uid() → distributor_id
CREATE OR REPLACE FUNCTION public.get_distributor_id_for_auth_user()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT distributor_id
  FROM public.distributor_users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1
$$;

-- 2. Create helper: can current user view a given distributor? (self + direct children)
CREATE OR REPLACE FUNCTION public.can_view_distributor(_distributor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.distributors
    WHERE id = _distributor_id
      AND (
        -- Self: the distributor the user belongs to
        id = public.get_distributor_id_for_auth_user()
        OR
        -- Direct child: parent_id matches the user's distributor
        parent_id = public.get_distributor_id_for_auth_user()
      )
  )
$$;

-- 3. Drop all existing permissive policies on distributors
DROP POLICY IF EXISTS "Allow anon read distributors for portal" ON public.distributors;
DROP POLICY IF EXISTS "Authenticated users can delete distributors" ON public.distributors;
DROP POLICY IF EXISTS "Authenticated users can insert distributors" ON public.distributors;
DROP POLICY IF EXISTS "Authenticated users can update distributors" ON public.distributors;
DROP POLICY IF EXISTS "Authenticated users can view all distributors" ON public.distributors;
DROP POLICY IF EXISTS "Admins can manage distributors" ON public.distributors;

-- 4. Admin full access (ALL operations)
CREATE POLICY "Admins full access on distributors"
ON public.distributors
FOR ALL
TO authenticated
USING (public.is_system_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.is_system_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Authenticated field staff can SELECT all distributors
-- (needed for admin panel, field rep assignment, etc.)
-- Only applies when user is NOT a distributor portal user (no entry in distributor_users)
CREATE POLICY "Field staff can view all distributors"
ON public.distributors
FOR SELECT
TO authenticated
USING (
  public.get_distributor_id_for_auth_user() IS NULL
);

-- 6. Distributor portal users: SELECT self + direct children only
CREATE POLICY "Portal users view own and child distributors"
ON public.distributors
FOR SELECT
TO authenticated
USING (
  public.can_view_distributor(id)
);

-- 7. Distributor portal users: UPDATE own record only (not children)
CREATE POLICY "Portal users update own distributor only"
ON public.distributors
FOR UPDATE
TO authenticated
USING (
  id = public.get_distributor_id_for_auth_user()
)
WITH CHECK (
  id = public.get_distributor_id_for_auth_user()
);

-- 8. INSERT: admin-only (covered by policy #4)
-- 9. DELETE: admin-only (covered by policy #4)
-- No additional INSERT/DELETE policies needed for non-admin users
