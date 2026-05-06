-- Add missing UPDATE and DELETE policies for distributor_types
CREATE POLICY "Allow update for all users"
ON public.distributor_types
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow delete for all users"
ON public.distributor_types
FOR DELETE
USING (true);