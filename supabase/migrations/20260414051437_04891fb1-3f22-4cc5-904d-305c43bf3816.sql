CREATE TABLE public.unhandled_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  retailer_id UUID REFERENCES public.retailers(id),
  retailer_name TEXT,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'unknown',
  status TEXT DEFAULT 'open',
  created_date TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.unhandled_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view unhandled queries"
  ON public.unhandled_queries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert unhandled queries"
  ON public.unhandled_queries FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX idx_unhandled_queries_phone ON public.unhandled_queries(phone);
CREATE INDEX idx_unhandled_queries_status ON public.unhandled_queries(status);

CREATE UNIQUE INDEX idx_unhandled_queries_dedup
  ON public.unhandled_queries(phone, message, created_date);