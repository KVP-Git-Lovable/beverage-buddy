
-- Allow distributor users to SELECT their own packing lists
CREATE POLICY "pl_distributor_select"
ON public.packing_lists
FOR SELECT
TO authenticated
USING (
  distributor_id = (SELECT get_distributor_id_for_auth_user())
);

-- Allow distributor users to INSERT packing lists for their distributor
CREATE POLICY "pl_distributor_insert"
ON public.packing_lists
FOR INSERT
TO authenticated
WITH CHECK (
  distributor_id = (SELECT get_distributor_id_for_auth_user())
);

-- Allow distributor users to UPDATE their own packing lists
CREATE POLICY "pl_distributor_update"
ON public.packing_lists
FOR UPDATE
TO authenticated
USING (
  distributor_id = (SELECT get_distributor_id_for_auth_user())
)
WITH CHECK (
  distributor_id = (SELECT get_distributor_id_for_auth_user())
);

-- Remove conflicting staff-only insert policy on packing_list_items
-- (the broader "Authenticated users can manage packing_list_items" policy already covers all operations)
DROP POLICY IF EXISTS "pli_staff_insert" ON public.packing_list_items;
