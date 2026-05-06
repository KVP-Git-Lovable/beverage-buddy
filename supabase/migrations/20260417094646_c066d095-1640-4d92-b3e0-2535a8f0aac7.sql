-- =========================================================
-- UoM Master: tables, triggers, RPCs, RLS, seed, backfill
-- =========================================================

-- 1) uom_master
CREATE TABLE public.uom_master (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Weight','Volume','Quantity')),
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) enabled_units (tenant-wide control)
CREATE TABLE public.enabled_units (
  uom_id uuid NOT NULL PRIMARY KEY REFERENCES public.uom_master(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) product_uom_mapping
CREATE TABLE public.product_uom_mapping (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  uom_id uuid NOT NULL REFERENCES public.uom_master(id) ON DELETE RESTRICT,
  conversion_to_base numeric NOT NULL CHECK (conversion_to_base > 0),
  is_base boolean NOT NULL DEFAULT false,
  is_default_sales boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, uom_id)
);

CREATE INDEX idx_pum_product ON public.product_uom_mapping(product_id);
CREATE INDEX idx_pum_uom ON public.product_uom_mapping(uom_id);
CREATE INDEX idx_eu_enabled ON public.enabled_units(enabled, display_order);

-- =========================================================
-- Triggers for integrity
-- =========================================================

-- Updated-at on enabled_units & product_uom_mapping (reuse public.update_updated_at_column if it exists)
CREATE OR REPLACE FUNCTION public.uom_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_eu_updated BEFORE UPDATE ON public.enabled_units
  FOR EACH ROW EXECUTE FUNCTION public.uom_set_updated_at();

CREATE TRIGGER trg_pum_updated BEFORE UPDATE ON public.product_uom_mapping
  FOR EACH ROW EXECUTE FUNCTION public.uom_set_updated_at();

-- Enforce: base row must have conversion_to_base = 1
CREATE OR REPLACE FUNCTION public.enforce_base_factor_one()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_base = true AND NEW.conversion_to_base <> 1 THEN
    RAISE EXCEPTION 'Base unit must have conversion_to_base = 1 (got %)', NEW.conversion_to_base;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pum_base_factor
  BEFORE INSERT OR UPDATE ON public.product_uom_mapping
  FOR EACH ROW EXECUTE FUNCTION public.enforce_base_factor_one();

-- Enforce: exactly one is_base per product (deferred-style check via statement)
CREATE OR REPLACE FUNCTION public.enforce_single_base_per_product()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_count integer;
  v_product_id uuid;
BEGIN
  -- For each affected product, count base rows
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
  ELSE
    v_product_id := NEW.product_id;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.product_uom_mapping
  WHERE product_id = v_product_id AND is_base = true;

  IF v_count > 1 THEN
    RAISE EXCEPTION 'Product % cannot have more than one base unit (found %)', v_product_id, v_count;
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_pum_single_base
  AFTER INSERT OR UPDATE OR DELETE ON public.product_uom_mapping
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_base_per_product();

-- Enforce: all units for a product share the base unit's category
CREATE OR REPLACE FUNCTION public.enforce_category_match()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_base_category text;
  v_new_category text;
BEGIN
  SELECT m.category INTO v_new_category
  FROM public.uom_master m WHERE m.id = NEW.uom_id;

  SELECT m.category INTO v_base_category
  FROM public.product_uom_mapping p
  JOIN public.uom_master m ON m.id = p.uom_id
  WHERE p.product_id = NEW.product_id AND p.is_base = true
    AND p.id <> NEW.id
  LIMIT 1;

  -- If no base yet, the inserted row is allowed (it may itself be the base)
  IF v_base_category IS NOT NULL AND v_new_category <> v_base_category THEN
    RAISE EXCEPTION 'Unit category % does not match product base category %', v_new_category, v_base_category;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pum_category_match
  BEFORE INSERT OR UPDATE ON public.product_uom_mapping
  FOR EACH ROW EXECUTE FUNCTION public.enforce_category_match();

-- =========================================================
-- RLS
-- =========================================================

ALTER TABLE public.uom_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enabled_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_uom_mapping ENABLE ROW LEVEL SECURITY;

-- Read for any authenticated user
CREATE POLICY "uom_master read authenticated"
  ON public.uom_master FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "enabled_units read authenticated"
  ON public.enabled_units FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "product_uom_mapping read authenticated"
  ON public.product_uom_mapping FOR SELECT
  TO authenticated USING (true);

-- Write for admins only — uses existing has_any_admin_permission(uuid) helper if present;
-- otherwise fall back to a permissive admin check via user_roles 'admin'.
DO $$
DECLARE
  v_has_helper boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_any_admin_permission'
  ) INTO v_has_helper;

  IF v_has_helper THEN
    EXECUTE $POL$
      CREATE POLICY "uom_master admin write"
        ON public.uom_master FOR ALL
        TO authenticated
        USING (public.has_any_admin_permission(auth.uid()))
        WITH CHECK (public.has_any_admin_permission(auth.uid()));
    $POL$;
    EXECUTE $POL$
      CREATE POLICY "enabled_units admin write"
        ON public.enabled_units FOR ALL
        TO authenticated
        USING (public.has_any_admin_permission(auth.uid()))
        WITH CHECK (public.has_any_admin_permission(auth.uid()));
    $POL$;
    EXECUTE $POL$
      CREATE POLICY "product_uom_mapping admin write"
        ON public.product_uom_mapping FOR ALL
        TO authenticated
        USING (public.has_any_admin_permission(auth.uid()))
        WITH CHECK (public.has_any_admin_permission(auth.uid()));
    $POL$;
  ELSE
    -- Fallback: use has_role(uid, 'admin') if available
    EXECUTE $POL$
      CREATE POLICY "uom_master admin write"
        ON public.uom_master FOR ALL
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin'))
        WITH CHECK (public.has_role(auth.uid(), 'admin'));
    $POL$;
    EXECUTE $POL$
      CREATE POLICY "enabled_units admin write"
        ON public.enabled_units FOR ALL
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin'))
        WITH CHECK (public.has_role(auth.uid(), 'admin'));
    $POL$;
    EXECUTE $POL$
      CREATE POLICY "product_uom_mapping admin write"
        ON public.product_uom_mapping FOR ALL
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin'))
        WITH CHECK (public.has_role(auth.uid(), 'admin'));
    $POL$;
  END IF;
END $$;

-- =========================================================
-- Seed uom_master (full industrial set)
-- =========================================================

INSERT INTO public.uom_master (code, name, category, is_system) VALUES
  ('KG',     'Kilogram', 'Weight',   true),
  ('GRAM',   'Gram',     'Weight',   true),
  ('LITRE',  'Litre',    'Volume',   true),
  ('ML',     'Millilitre','Volume',  true),
  ('PIECE',  'Piece',    'Quantity', true),
  ('DOZEN',  'Dozen',    'Quantity', true),
  ('TABLET', 'Tablet',   'Quantity', true),
  ('STRIP',  'Strip',    'Quantity', true),
  ('PACKET', 'Packet',   'Quantity', true),
  ('BOX',    'Box',      'Quantity', true),
  ('CARTON', 'Carton',   'Quantity', true)
ON CONFLICT (code) DO NOTHING;

-- Enable all seeded units with sensible default order + per-category default
INSERT INTO public.enabled_units (uom_id, enabled, display_order, is_default)
SELECT id, true,
  CASE code
    WHEN 'KG' THEN 10 WHEN 'GRAM' THEN 11
    WHEN 'LITRE' THEN 20 WHEN 'ML' THEN 21
    WHEN 'PIECE' THEN 30 WHEN 'DOZEN' THEN 31
    WHEN 'TABLET' THEN 32 WHEN 'STRIP' THEN 33
    WHEN 'PACKET' THEN 34 WHEN 'BOX' THEN 35 WHEN 'CARTON' THEN 36
    ELSE 99
  END,
  code IN ('KG','LITRE','PIECE')
FROM public.uom_master
ON CONFLICT (uom_id) DO NOTHING;

-- =========================================================
-- Backfill product_uom_mapping from products.unit
-- =========================================================

DO $$
DECLARE
  r record;
  v_unit text;
  v_base_code text;
  v_base_id uuid;
  v_gram_id uuid;
  v_ml_id uuid;
BEGIN
  SELECT id INTO v_gram_id FROM public.uom_master WHERE code = 'GRAM';
  SELECT id INTO v_ml_id   FROM public.uom_master WHERE code = 'ML';

  FOR r IN SELECT id, unit FROM public.products LOOP
    v_unit := lower(coalesce(trim(r.unit), ''));

    v_base_code := CASE
      WHEN v_unit IN ('kg','kgs','kilogram','kilograms') THEN 'KG'
      WHEN v_unit IN ('g','gram','grams','gm','gms')     THEN 'GRAM'
      WHEN v_unit IN ('l','ltr','litre','liter','litres','liters') THEN 'LITRE'
      WHEN v_unit IN ('ml','millilitre','milliliter')    THEN 'ML'
      WHEN v_unit IN ('pc','pcs','piece','pieces','nos','no','unit','units') THEN 'PIECE'
      WHEN v_unit IN ('dozen','dz')                      THEN 'DOZEN'
      WHEN v_unit IN ('box','boxes')                     THEN 'BOX'
      WHEN v_unit IN ('strip','strips')                  THEN 'STRIP'
      WHEN v_unit IN ('tablet','tab','tablets')          THEN 'TABLET'
      WHEN v_unit IN ('packet','pack','packets')         THEN 'PACKET'
      WHEN v_unit IN ('carton','ctn','cartons')          THEN 'CARTON'
      ELSE 'PIECE'
    END;

    SELECT id INTO v_base_id FROM public.uom_master WHERE code = v_base_code;

    INSERT INTO public.product_uom_mapping
      (product_id, uom_id, conversion_to_base, is_base, is_default_sales)
    VALUES (r.id, v_base_id, 1, true, true)
    ON CONFLICT (product_id, uom_id) DO NOTHING;

    -- Add sibling unit so existing kg↔g / l↔ml flows keep working
    IF v_base_code = 'KG' THEN
      INSERT INTO public.product_uom_mapping
        (product_id, uom_id, conversion_to_base, is_base, is_default_sales)
      VALUES (r.id, v_gram_id, 0.001, false, false)
      ON CONFLICT (product_id, uom_id) DO NOTHING;
    ELSIF v_base_code = 'LITRE' THEN
      INSERT INTO public.product_uom_mapping
        (product_id, uom_id, conversion_to_base, is_base, is_default_sales)
      VALUES (r.id, v_ml_id, 0.001, false, false)
      ON CONFLICT (product_id, uom_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- =========================================================
-- RPCs
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_enabled_units(p_category text DEFAULT NULL)
RETURNS TABLE (
  uom_id uuid,
  code text,
  name text,
  category text,
  display_order integer,
  is_default boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.id, m.code, m.name, m.category, e.display_order, e.is_default
  FROM public.uom_master m
  JOIN public.enabled_units e ON e.uom_id = m.id
  WHERE e.enabled = true
    AND (p_category IS NULL OR m.category = p_category)
  ORDER BY m.category, e.display_order, m.name;
$$;

CREATE OR REPLACE FUNCTION public.get_product_units(p_product_id uuid)
RETURNS TABLE (
  mapping_id uuid,
  uom_id uuid,
  code text,
  name text,
  category text,
  conversion_to_base numeric,
  is_base boolean,
  is_default_sales boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, m.id, m.code, m.name, m.category,
         p.conversion_to_base, p.is_base, p.is_default_sales
  FROM public.product_uom_mapping p
  JOIN public.uom_master m ON m.id = p.uom_id
  WHERE p.product_id = p_product_id
  ORDER BY p.is_base DESC, m.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_enabled_units(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_product_units(uuid) TO authenticated, anon;