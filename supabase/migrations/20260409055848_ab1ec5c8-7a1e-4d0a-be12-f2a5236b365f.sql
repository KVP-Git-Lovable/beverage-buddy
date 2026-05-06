
-- Drop if exists to avoid conflicts
DROP POLICY IF EXISTS "primary_orders_staff_select" ON public.primary_orders;
DROP POLICY IF EXISTS "primary_orders_staff_update" ON public.primary_orders;

-- Primary Orders — Staff SELECT policy
CREATE POLICY "primary_orders_staff_select"
ON public.primary_orders
FOR SELECT TO authenticated
USING (
  get_distributor_id_for_auth_user() IS NULL
);

-- Primary Orders — Staff UPDATE policy
CREATE POLICY "primary_orders_staff_update"
ON public.primary_orders
FOR UPDATE TO authenticated
USING (
  get_distributor_id_for_auth_user() IS NULL
)
WITH CHECK (
  get_distributor_id_for_auth_user() IS NULL
);
