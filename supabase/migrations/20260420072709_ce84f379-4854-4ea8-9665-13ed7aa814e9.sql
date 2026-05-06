
-- Allow parent distributors to view their child distributors' inventory data (read-only)

CREATE POLICY "Parent distributors can view child inventory"
ON public.distributor_inventory
FOR SELECT
USING (public.can_view_distributor(distributor_id));

CREATE POLICY "Parent distributors can view child inventory transactions"
ON public.distributor_inventory_transactions
FOR SELECT
USING (public.can_view_distributor(distributor_id));

CREATE POLICY "Parent distributors can view child warehouses"
ON public.warehouses
FOR SELECT
USING (public.can_view_distributor(distributor_id));
