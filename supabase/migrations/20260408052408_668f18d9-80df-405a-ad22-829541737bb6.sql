
-- Step 1: Fix RLS SELECT policy to include child orders
DROP POLICY IF EXISTS "po_dist_select" ON public.primary_orders;
CREATE POLICY "po_dist_select" ON public.primary_orders
FOR SELECT TO authenticated
USING (
  (get_distributor_id_for_auth_user() IS NOT NULL)
  AND (
    source_distributor_id = get_distributor_id_for_auth_user()
    OR target_distributor_id = get_distributor_id_for_auth_user()
    OR (
      EXISTS (
        SELECT 1 FROM distributors
        WHERE id = primary_orders.source_distributor_id
        AND parent_id = get_distributor_id_for_auth_user()
      )
      AND (target_distributor_id IS NULL OR target_distributor_id = get_distributor_id_for_auth_user())
    )
  )
);

-- Step 2: Fix RLS UPDATE policy to include child orders
DROP POLICY IF EXISTS "po_dist_update" ON public.primary_orders;
CREATE POLICY "po_dist_update" ON public.primary_orders
FOR UPDATE TO authenticated
USING (
  (get_distributor_id_for_auth_user() IS NOT NULL)
  AND (
    source_distributor_id = get_distributor_id_for_auth_user()
    OR target_distributor_id = get_distributor_id_for_auth_user()
    OR (
      EXISTS (
        SELECT 1 FROM distributors
        WHERE id = primary_orders.source_distributor_id
        AND parent_id = get_distributor_id_for_auth_user()
      )
      AND (target_distributor_id IS NULL OR target_distributor_id = get_distributor_id_for_auth_user())
    )
  )
);

-- Step 3: Fix stale USS orders — USS distributors whose parent has a parent (i.e. USS under SS)
-- These should target their direct parent, not NULL
UPDATE primary_orders po
SET target_distributor_id = d.parent_id
FROM distributors d
WHERE po.source_distributor_id = d.id
  AND d.parent_id IS NOT NULL
  AND po.target_distributor_id IS NULL
  AND EXISTS (
    SELECT 1 FROM distributors parent WHERE parent.id = d.parent_id AND parent.parent_id IS NOT NULL
  );
