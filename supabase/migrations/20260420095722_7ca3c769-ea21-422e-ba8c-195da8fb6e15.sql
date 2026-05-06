CREATE POLICY "po_dist_insert"
ON public.primary_orders
FOR INSERT
TO authenticated
WITH CHECK (
  get_distributor_id_for_auth_user() IS NOT NULL
  AND distributor_id = get_distributor_id_for_auth_user()
  AND source_distributor_id = get_distributor_id_for_auth_user()
);

CREATE POLICY "po_dist_update"
ON public.primary_orders
FOR UPDATE
TO authenticated
USING (
  get_distributor_id_for_auth_user() IS NOT NULL
  AND source_distributor_id = get_distributor_id_for_auth_user()
)
WITH CHECK (
  get_distributor_id_for_auth_user() IS NOT NULL
  AND distributor_id = get_distributor_id_for_auth_user()
  AND source_distributor_id = get_distributor_id_for_auth_user()
);