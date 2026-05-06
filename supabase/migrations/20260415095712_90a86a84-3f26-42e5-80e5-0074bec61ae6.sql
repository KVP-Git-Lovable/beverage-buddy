
-- 1A: Add missing packing_list_id column
ALTER TABLE packing_list_items 
  ADD COLUMN IF NOT EXISTS packing_list_id uuid REFERENCES packing_lists(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pli_packing_list_id ON packing_list_items(packing_list_id);

-- 1B: Add DELETE RLS policies
CREATE POLICY "pl_distributor_delete" ON packing_lists
  FOR DELETE TO authenticated
  USING (distributor_id = (SELECT get_distributor_id_for_auth_user()));

CREATE POLICY "pl_staff_delete" ON packing_lists
  FOR DELETE TO authenticated
  USING ((SELECT get_distributor_id_for_auth_user()) IS NULL);

-- 1C: Drop the old overloaded create_packing_list_atomic
DROP FUNCTION IF EXISTS public.create_packing_list_atomic(
  text, uuid, uuid, uuid, text, text[], uuid, jsonb, jsonb, text
);

-- 1D: Cleanup orphaned data
DELETE FROM packing_lists 
WHERE status = 'draft' 
  AND id NOT IN (SELECT DISTINCT packing_list_id FROM packing_list_items WHERE packing_list_id IS NOT NULL)
  AND total_items <= 0;

DELETE FROM packing_list_items WHERE packing_list_id IS NULL;
