
-- Create distributor_types table
CREATE TABLE public.distributor_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  parent_allowed BOOLEAN NOT NULL DEFAULT false,
  parent_type_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  legacy_mapping TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Self-referencing FK — RESTRICT delete
ALTER TABLE public.distributor_types
  ADD CONSTRAINT distributor_types_parent_type_code_fkey
  FOREIGN KEY (parent_type_code) REFERENCES public.distributor_types(code) ON DELETE RESTRICT;

-- Add type_id FK to distributors — RESTRICT delete
ALTER TABLE public.distributors
  ADD COLUMN type_id UUID REFERENCES public.distributor_types(id) ON DELETE RESTRICT;

-- Enable RLS
ALTER TABLE public.distributor_types ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can view distributor types"
  ON public.distributor_types FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can insert distributor types"
  ON public.distributor_types FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin(auth.uid()));

CREATE POLICY "Admins can update distributor types"
  ON public.distributor_types FOR UPDATE
  TO authenticated
  USING (public.is_system_admin(auth.uid()));

CREATE POLICY "Admins can delete distributor types"
  ON public.distributor_types FOR DELETE
  TO authenticated
  USING (public.is_system_admin(auth.uid()));

-- Timestamp trigger
CREATE TRIGGER update_distributor_types_updated_at
  BEFORE UPDATE ON public.distributor_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial data (with legacy_mapping)
INSERT INTO public.distributor_types (code, name, description, level, parent_allowed, parent_type_code, sort_order, legacy_mapping) VALUES
  ('DD', 'Direct Distributor', 'Places primary orders directly with the company. Supplies goods to retailers.', 1, false, NULL, 1, 'direct_distributor'),
  ('SS', 'Super Stockist', 'Places primary orders from the company. Distributes to USS distributors and retailers.', 1, false, NULL, 2, 'super_stockist'),
  ('USS', 'Under Super Stockist', 'Places primary orders via a Super Stockist parent. Supplies to retailers.', 2, true, 'SS', 3, 'under_super_stockist');

-- Backfill type_id for existing distributors
UPDATE public.distributors SET type_id = (SELECT id FROM public.distributor_types WHERE code = 'DD')
  WHERE distribution_level IN ('direct_distributor', 'distributor', 'sub_distributor', 'agent') OR distribution_level IS NULL;

UPDATE public.distributors SET type_id = (SELECT id FROM public.distributor_types WHERE code = 'SS')
  WHERE distribution_level = 'super_stockist';

UPDATE public.distributors SET type_id = (SELECT id FROM public.distributor_types WHERE code = 'USS')
  WHERE distribution_level = 'under_super_stockist';

-- Indexes
CREATE INDEX idx_distributors_type_id ON public.distributors(type_id);
CREATE INDEX idx_distributor_types_code ON public.distributor_types(code);
