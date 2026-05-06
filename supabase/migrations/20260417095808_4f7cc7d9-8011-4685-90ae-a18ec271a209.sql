ALTER TABLE public.pincode_top_retailers
  ADD COLUMN IF NOT EXISTS opening_hours jsonb,
  ADD COLUMN IF NOT EXISTS open_now boolean,
  ADD COLUMN IF NOT EXISTS hours_fetched_at timestamptz;