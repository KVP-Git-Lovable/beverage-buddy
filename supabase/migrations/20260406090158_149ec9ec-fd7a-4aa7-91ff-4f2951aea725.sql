
-- 1. Dynamic capability resolution function
CREATE OR REPLACE FUNCTION public.get_type_supports_primary(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM distributor_types
    WHERE parent_type_code = p_code AND is_active = true
  );
$$;

-- 2. Partial index for performance
CREATE INDEX IF NOT EXISTS idx_distributor_types_parent_active
  ON public.distributor_types (parent_type_code)
  WHERE is_active = true;

-- 3. order_type column with CHECK constraint
ALTER TABLE public.packing_lists
  ADD COLUMN order_type text NOT NULL DEFAULT 'secondary'
  CONSTRAINT chk_packing_list_order_type CHECK (order_type IN ('primary', 'secondary'));

-- 4. Validation trigger with null checks
CREATE OR REPLACE FUNCTION public.validate_packing_list_order_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type_code text;
  v_supports_primary boolean;
BEGIN
  IF NEW.order_type = 'secondary' THEN
    RETURN NEW;
  END IF;

  IF NEW.distributor_id IS NULL THEN
    RAISE EXCEPTION 'distributor_id is required for primary packing lists';
  END IF;

  SELECT dt.code INTO v_type_code
  FROM distributors d
  JOIN distributor_types dt ON dt.id = d.type_id
  WHERE d.id = NEW.distributor_id;

  IF v_type_code IS NULL THEN
    RAISE EXCEPTION 'Distributor not found or has no assigned type (distributor_id: %)', NEW.distributor_id;
  END IF;

  SELECT get_type_supports_primary(v_type_code) INTO v_supports_primary;

  IF NOT COALESCE(v_supports_primary, false) THEN
    RAISE EXCEPTION 'Distributor type "%" does not support primary packing', v_type_code;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_packing_order_type
  BEFORE INSERT OR UPDATE ON public.packing_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_packing_list_order_type();
