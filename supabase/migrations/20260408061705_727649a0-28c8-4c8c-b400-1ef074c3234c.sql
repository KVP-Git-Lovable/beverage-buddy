
ALTER TABLE public.retailer_external_db
ADD COLUMN match_score integer,
ADD COLUMN match_breakdown jsonb;

CREATE INDEX idx_ext_match_score ON public.retailer_external_db(match_score);
