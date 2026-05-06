
-- 1. can_access_packing_list() helper
CREATE OR REPLACE FUNCTION public.can_access_packing_list(_packing_list_id uuid)
RETURNS boolean AS $$
DECLARE v_dist_id uuid;
BEGIN
  v_dist_id := public.get_distributor_id_for_auth_user();
  IF v_dist_id IS NULL THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.packing_lists pl
    WHERE pl.id = _packing_list_id
      AND (pl.distributor_id = v_dist_id
           OR pl.distributor_id IN (SELECT id FROM public.distributors WHERE parent_id = v_dist_id))
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Drop and recreate packing_lists policies
DROP POLICY IF EXISTS "Users can create packing lists" ON public.packing_lists;
DROP POLICY IF EXISTS "Users can delete draft packing lists" ON public.packing_lists;
DROP POLICY IF EXISTS "Users can update packing lists" ON public.packing_lists;
DROP POLICY IF EXISTS "Users can view packing lists" ON public.packing_lists;
DROP POLICY IF EXISTS "Authenticated users can view packing lists" ON public.packing_lists;
DROP POLICY IF EXISTS "Authenticated users can create packing lists" ON public.packing_lists;
DROP POLICY IF EXISTS "Authenticated users can update packing lists" ON public.packing_lists;
DROP POLICY IF EXISTS "Authenticated users can delete packing lists" ON public.packing_lists;

CREATE POLICY "pl_admin_all" ON public.packing_lists FOR ALL TO authenticated
USING ((SELECT public.is_system_admin(auth.uid()))) WITH CHECK ((SELECT public.is_system_admin(auth.uid())));

CREATE POLICY "pl_staff_select" ON public.packing_lists FOR SELECT TO authenticated
USING ((SELECT public.get_distributor_id_for_auth_user()) IS NULL);

CREATE POLICY "pl_dist_select" ON public.packing_lists FOR SELECT TO authenticated
USING ((SELECT public.get_distributor_id_for_auth_user()) IS NOT NULL
  AND (distributor_id = (SELECT public.get_distributor_id_for_auth_user())
       OR distributor_id IN (SELECT id FROM public.distributors WHERE parent_id = (SELECT public.get_distributor_id_for_auth_user()))));

CREATE POLICY "pl_dist_insert" ON public.packing_lists FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_distributor_id_for_auth_user()) IS NOT NULL
  AND distributor_id = (SELECT public.get_distributor_id_for_auth_user()));

CREATE POLICY "pl_dist_update" ON public.packing_lists FOR UPDATE TO authenticated
USING ((SELECT public.get_distributor_id_for_auth_user()) IS NOT NULL AND distributor_id = (SELECT public.get_distributor_id_for_auth_user()))
WITH CHECK (distributor_id = (SELECT public.get_distributor_id_for_auth_user()));

CREATE POLICY "pl_staff_insert" ON public.packing_lists FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_distributor_id_for_auth_user()) IS NULL AND NOT (SELECT public.is_system_admin(auth.uid())));

CREATE POLICY "pl_staff_update" ON public.packing_lists FOR UPDATE TO authenticated
USING ((SELECT public.get_distributor_id_for_auth_user()) IS NULL AND NOT (SELECT public.is_system_admin(auth.uid())))
WITH CHECK ((SELECT public.get_distributor_id_for_auth_user()) IS NULL AND NOT (SELECT public.is_system_admin(auth.uid())));

-- 3. Drop and recreate packing_list_items policies
DROP POLICY IF EXISTS "Users can create packing list items" ON public.packing_list_items;
DROP POLICY IF EXISTS "Users can delete packing list items" ON public.packing_list_items;
DROP POLICY IF EXISTS "Users can update packing list items" ON public.packing_list_items;
DROP POLICY IF EXISTS "Users can view packing list items" ON public.packing_list_items;
DROP POLICY IF EXISTS "Authenticated users can view packing list items" ON public.packing_list_items;
DROP POLICY IF EXISTS "Authenticated users can create packing list items" ON public.packing_list_items;
DROP POLICY IF EXISTS "Authenticated users can update packing list items" ON public.packing_list_items;
DROP POLICY IF EXISTS "Authenticated users can delete packing list items" ON public.packing_list_items;

CREATE POLICY "pli_admin_all" ON public.packing_list_items FOR ALL TO authenticated
USING ((SELECT public.is_system_admin(auth.uid()))) WITH CHECK ((SELECT public.is_system_admin(auth.uid())));

CREATE POLICY "pli_select" ON public.packing_list_items FOR SELECT TO authenticated
USING (public.can_access_packing_list(packing_list_id));

CREATE POLICY "pli_insert" ON public.packing_list_items FOR INSERT TO authenticated
WITH CHECK (public.can_access_packing_list(packing_list_id));

CREATE POLICY "pli_update" ON public.packing_list_items FOR UPDATE TO authenticated
USING (public.can_access_packing_list(packing_list_id)) WITH CHECK (public.can_access_packing_list(packing_list_id));

CREATE POLICY "pli_delete" ON public.packing_list_items FOR DELETE TO authenticated
USING (public.can_access_packing_list(packing_list_id));

-- 4. Fix primary_orders RLS
DROP POLICY IF EXISTS "Distributors can view their primary orders" ON public.primary_orders;
DROP POLICY IF EXISTS "Distributors can update their primary orders" ON public.primary_orders;
DROP POLICY IF EXISTS "Distributors can create primary orders" ON public.primary_orders;
DROP POLICY IF EXISTS "Users can view primary orders" ON public.primary_orders;
DROP POLICY IF EXISTS "Users can create primary orders" ON public.primary_orders;
DROP POLICY IF EXISTS "Users can update primary orders" ON public.primary_orders;

CREATE POLICY "po_admin_all" ON public.primary_orders FOR ALL TO authenticated
USING ((SELECT public.is_system_admin(auth.uid()))) WITH CHECK ((SELECT public.is_system_admin(auth.uid())));

CREATE POLICY "po_staff_select" ON public.primary_orders FOR SELECT TO authenticated
USING ((SELECT public.get_distributor_id_for_auth_user()) IS NULL AND NOT (SELECT public.is_system_admin(auth.uid())));

CREATE POLICY "po_dist_select" ON public.primary_orders FOR SELECT TO authenticated
USING ((SELECT public.get_distributor_id_for_auth_user()) IS NOT NULL
  AND (source_distributor_id = (SELECT public.get_distributor_id_for_auth_user())
       OR target_distributor_id = (SELECT public.get_distributor_id_for_auth_user())));

CREATE POLICY "po_dist_insert" ON public.primary_orders FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_distributor_id_for_auth_user()) IS NOT NULL
  AND source_distributor_id = (SELECT public.get_distributor_id_for_auth_user()));

CREATE POLICY "po_dist_update" ON public.primary_orders FOR UPDATE TO authenticated
USING ((SELECT public.get_distributor_id_for_auth_user()) IS NOT NULL
  AND (source_distributor_id = (SELECT public.get_distributor_id_for_auth_user())
       OR target_distributor_id = (SELECT public.get_distributor_id_for_auth_user())))
WITH CHECK (source_distributor_id = (SELECT public.get_distributor_id_for_auth_user())
  OR target_distributor_id = (SELECT public.get_distributor_id_for_auth_user()));

CREATE POLICY "po_staff_insert" ON public.primary_orders FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_distributor_id_for_auth_user()) IS NULL AND NOT (SELECT public.is_system_admin(auth.uid())));

CREATE POLICY "po_staff_update" ON public.primary_orders FOR UPDATE TO authenticated
USING ((SELECT public.get_distributor_id_for_auth_user()) IS NULL AND NOT (SELECT public.is_system_admin(auth.uid())))
WITH CHECK ((SELECT public.get_distributor_id_for_auth_user()) IS NULL AND NOT (SELECT public.is_system_admin(auth.uid())));

-- 5. Status transition trigger
CREATE OR REPLACE FUNCTION public.validate_primary_order_status_transition()
RETURNS trigger AS $$
DECLARE
  valid_transitions jsonb := '{"draft":["pending","cancelled"],"pending":["submitted","cancelled"],"submitted":["confirmed","cancelled","rejected"],"confirmed":["processing","cancelled"],"processing":["allocated","cancelled"],"allocated":["packed"],"packed":["dispatched","shipped"],"shipped":["partially_delivered","delivered"],"dispatched":["partially_delivered","delivered"],"partially_delivered":["delivered"]}'::jsonb;
BEGIN
  IF (SELECT public.is_system_admin(auth.uid())) THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NOT (valid_transitions ? OLD.status) THEN RETURN NEW; END IF;
  IF NOT (valid_transitions->OLD.status @> to_jsonb(NEW.status)) THEN
    RAISE EXCEPTION 'Invalid status transition: % to %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_primary_order_status ON public.primary_orders;
CREATE TRIGGER trg_validate_primary_order_status
  BEFORE UPDATE ON public.primary_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_primary_order_status_transition();

NOTIFY pgrst, 'reload schema';
