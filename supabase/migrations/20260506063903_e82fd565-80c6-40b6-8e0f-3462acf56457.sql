-- products.base_unit
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS base_unit TEXT;

-- van_return_grn.van_id nullable
ALTER TABLE public.van_return_grn ALTER COLUMN van_id DROP NOT NULL;

-- scheme_applicability.applicability_type + updated_at
ALTER TABLE public.scheme_applicability
  ADD COLUMN IF NOT EXISTS applicability_type TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE public.scheme_applicability
  SET applicability_type = applicability_level
  WHERE applicability_type IS NULL AND applicability_level IS NOT NULL;

-- scheme_policy_config.policy_key
ALTER TABLE public.scheme_policy_config ADD COLUMN IF NOT EXISTS policy_key TEXT;
UPDATE public.scheme_policy_config SET policy_key = policy_name WHERE policy_key IS NULL;

-- stock.stock_date
ALTER TABLE public.stock ADD COLUMN IF NOT EXISTS stock_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- distributor_types.is_active
ALTER TABLE public.distributor_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;