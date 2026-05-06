DROP POLICY IF EXISTS "pl_dist_update" ON public.packing_lists;

CREATE POLICY "pl_dist_update"
ON public.packing_lists
FOR UPDATE
TO authenticated
USING (
  (SELECT public.get_distributor_id_for_auth_user()) IS NOT NULL
  AND (
    distributor_id = (SELECT public.get_distributor_id_for_auth_user())
    OR distributor_id IN (
      SELECT id
      FROM public.distributors
      WHERE parent_id = (SELECT public.get_distributor_id_for_auth_user())
    )
  )
)
WITH CHECK (
  (SELECT public.get_distributor_id_for_auth_user()) IS NOT NULL
  AND (
    distributor_id = (SELECT public.get_distributor_id_for_auth_user())
    OR distributor_id IN (
      SELECT id
      FROM public.distributors
      WHERE parent_id = (SELECT public.get_distributor_id_for_auth_user())
    )
  )
);