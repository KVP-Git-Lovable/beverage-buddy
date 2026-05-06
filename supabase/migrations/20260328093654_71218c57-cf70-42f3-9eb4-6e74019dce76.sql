-- Grant anon INSERT on visits so customer portal can create visits
GRANT INSERT ON public.visits TO anon;

-- Grant anon UPDATE on orders so we can set visit_id after creating visit
GRANT UPDATE ON public.orders TO anon;

-- Ensure anon can select visits (needed for conflict check)
GRANT SELECT ON public.visits TO anon;