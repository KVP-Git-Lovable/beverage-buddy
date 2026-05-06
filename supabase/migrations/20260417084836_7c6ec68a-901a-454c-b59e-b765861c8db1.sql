CREATE TABLE public.pincode_top_retailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode text NOT NULL,
  rank int NOT NULL,
  place_id text,
  name text NOT NULL,
  address text,
  rating numeric,
  user_ratings_total integer,
  latitude double precision,
  longitude double precision,
  score numeric,
  source text NOT NULL DEFAULT 'google_places',
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pincode_top_retailers_pincode_fetched
  ON public.pincode_top_retailers (pincode, fetched_at DESC);

CREATE UNIQUE INDEX uq_pincode_top_retailers_pincode_place
  ON public.pincode_top_retailers (pincode, place_id)
  WHERE place_id IS NOT NULL;

ALTER TABLE public.pincode_top_retailers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read top retailers"
  ON public.pincode_top_retailers
  FOR SELECT
  TO authenticated
  USING (true);
