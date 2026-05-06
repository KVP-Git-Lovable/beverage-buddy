
-- Fix the one orphan record with an invalid type_id
UPDATE public.distributors
SET type_id = NULL
WHERE id = '3049f21b-95a1-436e-a433-483c9c465481'
  AND type_id = '36f27f5e-adab-4b4f-b83f-2792289f4c8e';

-- Add the foreign key constraint
ALTER TABLE public.distributors
  ADD CONSTRAINT distributors_type_id_fkey
  FOREIGN KEY (type_id) REFERENCES public.distributor_types(id)
  ON DELETE RESTRICT;
