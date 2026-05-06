
-- Cache table for district intelligence results
CREATE TABLE public.district_intelligence_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  counts JSONB NOT NULL,
  ai_summary TEXT NOT NULL,
  bbox JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE(state, district)
);

-- Index for fast lookups
CREATE INDEX idx_dic_state_district ON public.district_intelligence_cache(state, district);
CREATE INDEX idx_dic_expires ON public.district_intelligence_cache(expires_at);

-- Enable RLS
ALTER TABLE public.district_intelligence_cache ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read cache
CREATE POLICY "Authenticated users can read district intelligence cache"
  ON public.district_intelligence_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role inserts/updates (edge function uses service role key)
-- No INSERT/UPDATE policy needed for authenticated users since edge function uses service role
