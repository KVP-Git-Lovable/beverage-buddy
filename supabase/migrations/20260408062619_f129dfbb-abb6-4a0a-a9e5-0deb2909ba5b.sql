
CREATE TABLE public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  state text NOT NULL DEFAULT 'IDLE',
  retailer_id uuid REFERENCES public.retailers(id),
  retailer_name text,
  pending_items jsonb DEFAULT '[]'::jsonb,
  conversation_history jsonb DEFAULT '[]'::jsonb,
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_wa_session_phone ON public.whatsapp_sessions(phone_number);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Service role only - edge function uses service role key
CREATE POLICY "Service role full access on whatsapp_sessions"
  ON public.whatsapp_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
