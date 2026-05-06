
-- Drop all old territory write policies defensively
DROP POLICY IF EXISTS "Admins can manage territories" ON public.territories;
DROP POLICY IF EXISTS "Admins can insert territories" ON public.territories;
DROP POLICY IF EXISTS "Admins can update territories" ON public.territories;
DROP POLICY IF EXISTS "Admins can delete territories" ON public.territories;

-- Recreate using is_system_admin()
CREATE POLICY "Admins can insert territories" ON public.territories
  FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin(auth.uid()));

CREATE POLICY "Admins can update territories" ON public.territories
  FOR UPDATE TO authenticated
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));

CREATE POLICY "Admins can delete territories" ON public.territories
  FOR DELETE TO authenticated
  USING (public.is_system_admin(auth.uid()));
