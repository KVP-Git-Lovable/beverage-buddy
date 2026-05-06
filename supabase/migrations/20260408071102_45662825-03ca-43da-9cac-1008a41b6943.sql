
-- 1. Add route_id to packing_lists
ALTER TABLE public.packing_lists
  ADD COLUMN IF NOT EXISTS route_id uuid;

-- 2. Create packing_list_items table
CREATE TABLE IF NOT EXISTS public.packing_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_list_id uuid NOT NULL REFERENCES public.packing_lists(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  unit text,
  ordered_qty numeric NOT NULL DEFAULT 0,
  picked_qty numeric NOT NULL DEFAULT 0,
  short_qty numeric NOT NULL DEFAULT 0,
  batch_number text,
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.packing_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage packing_list_items"
  ON public.packing_list_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_packing_list_items_pl ON public.packing_list_items(packing_list_id);

-- 3. Create packing_list_assignments table
CREATE TABLE IF NOT EXISTS public.packing_list_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_list_id uuid NOT NULL REFERENCES public.packing_lists(id) ON DELETE CASCADE,
  agent_id uuid,
  van_id text,
  beat_ids text[],
  territory_ids text[],
  order_count integer NOT NULL DEFAULT 0,
  total_load_qty numeric NOT NULL DEFAULT 0,
  total_load_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'assigned',
  dispatched_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.packing_list_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage packing_list_assignments"
  ON public.packing_list_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_packing_list_assignments_pl ON public.packing_list_assignments(packing_list_id);

-- 4. Create delivery_runs table
CREATE TABLE IF NOT EXISTS public.delivery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number text NOT NULL DEFAULT ('DR-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4)),
  agent_id uuid,
  vehicle_id text,
  route_id uuid,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'assigned', 'out_for_delivery', 'delivered')),
  start_time timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage delivery_runs"
  ON public.delivery_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Create delivery_run_packing_lists mapping table
CREATE TABLE IF NOT EXISTS public.delivery_run_packing_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_run_id uuid NOT NULL REFERENCES public.delivery_runs(id) ON DELETE CASCADE,
  packing_list_id uuid NOT NULL REFERENCES public.packing_lists(id) ON DELETE CASCADE,
  sequence_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(packing_list_id)
);

ALTER TABLE public.delivery_run_packing_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage delivery_run_packing_lists"
  ON public.delivery_run_packing_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_drpl_run ON public.delivery_run_packing_lists(delivery_run_id);
CREATE INDEX IF NOT EXISTS idx_drpl_pl ON public.delivery_run_packing_lists(packing_list_id);

-- 6. Status transition trigger for packing_lists
CREATE OR REPLACE FUNCTION public.enforce_packing_list_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  allowed_transitions jsonb := '{
    "draft": ["picking"],
    "picking": ["packed"],
    "packed": ["ready"],
    "ready": ["dispatched"],
    "dispatched": ["delivered"]
  }'::jsonb;
  allowed jsonb;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  allowed := allowed_transitions -> OLD.status;
  IF allowed IS NULL OR NOT (allowed ? NEW.status) THEN
    RAISE EXCEPTION 'Invalid packing list status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_packing_list_status ON public.packing_lists;
CREATE TRIGGER trg_enforce_packing_list_status
  BEFORE UPDATE OF status ON public.packing_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_packing_list_status_transition();

-- 7. Status transition trigger for delivery_runs
CREATE OR REPLACE FUNCTION public.enforce_delivery_run_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  allowed_transitions jsonb := '{
    "ready": ["assigned"],
    "assigned": ["out_for_delivery"],
    "out_for_delivery": ["delivered"]
  }'::jsonb;
  allowed jsonb;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  allowed := allowed_transitions -> OLD.status;
  IF allowed IS NULL OR NOT (allowed ? NEW.status) THEN
    RAISE EXCEPTION 'Invalid delivery run status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_delivery_run_status ON public.delivery_runs;
CREATE TRIGGER trg_enforce_delivery_run_status
  BEFORE UPDATE OF status ON public.delivery_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_delivery_run_status_transition();

-- 8. Updated_at triggers
CREATE TRIGGER update_packing_list_items_updated_at
  BEFORE UPDATE ON public.packing_list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_packing_list_assignments_updated_at
  BEFORE UPDATE ON public.packing_list_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_runs_updated_at
  BEFORE UPDATE ON public.delivery_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
