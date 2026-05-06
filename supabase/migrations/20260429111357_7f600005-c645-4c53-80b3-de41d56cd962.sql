
-- Phase 1: data-driven UoM categories ----------------------------------------
CREATE TABLE IF NOT EXISTS public.uom_category (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  is_system   boolean NOT NULL DEFAULT false,
  enabled     boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 100,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.uom_category ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uom_category_read_all" ON public.uom_category;
CREATE POLICY "uom_category_read_all"
  ON public.uom_category FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "uom_category_admin_write" ON public.uom_category;
CREATE POLICY "uom_category_admin_write"
  ON public.uom_category FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_uom_category_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_uom_category_touch ON public.uom_category;
CREATE TRIGGER trg_uom_category_touch
  BEFORE UPDATE ON public.uom_category
  FOR EACH ROW EXECUTE FUNCTION public.tg_uom_category_touch();

INSERT INTO public.uom_category (code, name, description, is_system, sort_order) VALUES
  ('Weight',     'Weight',     'Mass-based units (kg, g, etc.)',                  true, 10),
  ('Volume',     'Volume',     'Liquid/volume units (litre, ml, etc.)',           true, 20),
  ('Length',     'Length',     'Linear units (m, cm, ft, etc.)',                  true, 30),
  ('Quantity',   'Quantity',   'Discrete count-based packaging (piece, box)',     true, 40),
  ('Medication', 'Medication', 'Pharma units (tablet, strip, vial, etc.)',        true, 50),
  ('Electronics','Electronics','Electronics packaging (reel, tray, tube, spool)', true, 60),
  ('Packaging',  'Packaging',  'Logistics packaging (pallet, roll, bolt)',        true, 70)
ON CONFLICT (code) DO NOTHING;

-- Drop the static CHECK constraint that pinned categories to 4 values.
ALTER TABLE public.uom_master DROP CONSTRAINT IF EXISTS uom_master_category_check;

-- Replace it with a validation trigger that ensures any category text exists
-- in uom_category (skipped when category_id is supplied).
CREATE OR REPLACE FUNCTION public.tg_uom_master_validate_category()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.category IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.uom_category WHERE code = NEW.category
  ) THEN
    RAISE EXCEPTION 'Unknown UoM category: %. Add it via Admin → UoM Master → Categories first.', NEW.category;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_uom_master_validate_category ON public.uom_master;
CREATE TRIGGER trg_uom_master_validate_category
  BEFORE INSERT OR UPDATE ON public.uom_master
  FOR EACH ROW EXECUTE FUNCTION public.tg_uom_master_validate_category();

-- Phase 1.b: link uom_master rows to a category id (additive) ----------------
ALTER TABLE public.uom_master
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.uom_category(id);

UPDATE public.uom_master m
   SET category_id = c.id
  FROM public.uom_category c
 WHERE m.category_id IS NULL
   AND c.code = m.category;

CREATE OR REPLACE FUNCTION public.tg_uom_master_sync_category()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_code text; v_id uuid;
BEGIN
  IF NEW.category_id IS NULL AND NEW.category IS NOT NULL THEN
    SELECT id INTO v_id FROM public.uom_category WHERE code = NEW.category;
    NEW.category_id := v_id;
  ELSIF NEW.category_id IS NOT NULL THEN
    SELECT code INTO v_code FROM public.uom_category WHERE id = NEW.category_id;
    IF v_code IS NOT NULL THEN NEW.category := v_code; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_uom_master_sync_category ON public.uom_master;
CREATE TRIGGER trg_uom_master_sync_category
  BEFORE INSERT OR UPDATE ON public.uom_master
  FOR EACH ROW EXECUTE FUNCTION public.tg_uom_master_sync_category();

-- Phase 1.c: seed industry-specific units ------------------------------------
INSERT INTO public.uom_master (code, name, category, is_base, is_system) VALUES
  ('TABLET',   'Tablet',   'Medication',  true,  true),
  ('CAPSULE',  'Capsule',  'Medication',  false, true),
  ('STRIP_M',  'Strip',    'Medication',  false, true),
  ('BLISTER', 'Blister',  'Medication',  false, true),
  ('BOTTLE',   'Bottle',   'Medication',  false, true),
  ('VIAL',     'Vial',     'Medication',  false, true),
  ('AMPOULE',  'Ampoule',  'Medication',  false, true),
  ('SACHET',   'Sachet',   'Medication',  false, true),
  ('DROP',     'Drop',     'Medication',  false, true),
  ('PIECE_E',  'Piece',    'Electronics', true,  true),
  ('REEL',     'Reel',     'Electronics', false, true),
  ('TRAY_E',   'Tray',     'Electronics', false, true),
  ('TUBE',     'Tube',     'Electronics', false, true),
  ('SPOOL',    'Spool',    'Electronics', false, true),
  ('PALLET',   'Pallet',   'Packaging',   true,  true),
  ('ROLL',     'Roll',     'Packaging',   false, true),
  ('BOLT',     'Bolt',     'Packaging',   false, true),
  ('CRATE',    'Crate',    'Packaging',   false, true)
ON CONFLICT (code) DO NOTHING;

UPDATE public.uom_master m
   SET category_id = c.id
  FROM public.uom_category c
 WHERE m.category_id IS NULL AND c.code = m.category;

-- Phase 3: Default Sales / Default Purchase flags on enabled_units -----------
ALTER TABLE public.enabled_units
  ADD COLUMN IF NOT EXISTS is_default_sales    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_default_purchase boolean NOT NULL DEFAULT false;

UPDATE public.enabled_units
   SET is_default_sales = true
 WHERE is_default = true AND is_default_sales = false;

-- Phase 5: RPCs --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_uom_categories()
RETURNS TABLE (
  id uuid, code text, name text, description text,
  is_system boolean, enabled boolean, sort_order integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, code, name, description, is_system, enabled, sort_order
    FROM public.uom_category
   ORDER BY sort_order, name;
$$;
GRANT EXECUTE ON FUNCTION public.get_uom_categories() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_unit_usage_count(p_uom_id uuid)
RETURNS TABLE (mappings_using bigint, products_using bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*) FROM public.product_uom_mapping WHERE uom_id = p_uom_id),
    (SELECT COUNT(DISTINCT product_id) FROM public.product_uom_mapping WHERE uom_id = p_uom_id);
$$;
GRANT EXECUTE ON FUNCTION public.get_unit_usage_count(uuid) TO authenticated;

-- Safety trigger -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_uom_master_protect_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.product_uom_mapping WHERE uom_id = OLD.id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete unit %: it is used by % product mapping(s). Disable it instead.',
      OLD.code, v_count USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trg_uom_master_protect_delete ON public.uom_master;
CREATE TRIGGER trg_uom_master_protect_delete
  BEFORE DELETE ON public.uom_master
  FOR EACH ROW EXECUTE FUNCTION public.tg_uom_master_protect_delete();
