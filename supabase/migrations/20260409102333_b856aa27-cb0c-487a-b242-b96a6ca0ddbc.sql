
-- Allow staff/admin users to insert packing lists
CREATE POLICY "pl_staff_insert" ON public.packing_lists
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT get_distributor_id_for_auth_user()) IS NULL
  );

-- Allow staff/admin users to insert packing list items
CREATE POLICY "pli_staff_insert" ON public.packing_list_items
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT get_distributor_id_for_auth_user()) IS NULL
  );
