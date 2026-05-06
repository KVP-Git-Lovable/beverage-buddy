
-- Create a helper function that checks if a user is a system admin via security_profiles
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.security_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = _user_id
      AND sp.is_system = true
  )
$$;

-- Update distributor_inventory SELECT policy to also check system admin
DROP POLICY IF EXISTS "Distributors can view their inventory" ON public.distributor_inventory;
CREATE POLICY "Distributors can view their inventory"
ON public.distributor_inventory FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM distributor_users du
    WHERE du.auth_user_id = auth.uid()
      AND du.distributor_id = distributor_inventory.distributor_id
      AND du.is_active = true
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_system_admin(auth.uid())
);

-- Update distributor_inventory UPDATE policy
DROP POLICY IF EXISTS "Admins can update inventory" ON public.distributor_inventory;
CREATE POLICY "Admins can update inventory"
ON public.distributor_inventory FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_system_admin(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_system_admin(auth.uid())
);

-- Update distributor_inventory_transactions SELECT policy
DROP POLICY IF EXISTS "Distributors can view their transactions" ON public.distributor_inventory_transactions;
CREATE POLICY "Distributors can view their transactions"
ON public.distributor_inventory_transactions FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM distributor_users du
    WHERE du.auth_user_id = auth.uid()
      AND du.distributor_id = distributor_inventory_transactions.distributor_id
      AND du.is_active = true
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_system_admin(auth.uid())
);

-- Also add INSERT policies for inventory and transactions so admins can add data
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'distributor_inventory' AND policyname = 'Admins and distributors can insert inventory') THEN
    CREATE POLICY "Admins and distributors can insert inventory"
    ON public.distributor_inventory FOR INSERT
    WITH CHECK (
      (EXISTS (
        SELECT 1 FROM distributor_users du
        WHERE du.auth_user_id = auth.uid()
          AND du.distributor_id = distributor_inventory.distributor_id
          AND du.is_active = true
      ))
      OR has_role(auth.uid(), 'admin'::app_role)
      OR is_system_admin(auth.uid())
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'distributor_inventory_transactions' AND policyname = 'Admins and distributors can insert transactions') THEN
    CREATE POLICY "Admins and distributors can insert transactions"
    ON public.distributor_inventory_transactions FOR INSERT
    WITH CHECK (
      (EXISTS (
        SELECT 1 FROM distributor_users du
        WHERE du.auth_user_id = auth.uid()
          AND du.distributor_id = distributor_inventory_transactions.distributor_id
          AND du.is_active = true
      ))
      OR has_role(auth.uid(), 'admin'::app_role)
      OR is_system_admin(auth.uid())
    );
  END IF;
END $$;
