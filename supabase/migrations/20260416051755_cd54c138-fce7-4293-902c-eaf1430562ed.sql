CREATE TABLE public.user_context (
  phone TEXT PRIMARY KEY,
  last_intent TEXT,
  last_entity JSONB DEFAULT '{}',
  last_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_context ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.user_context IS 'Stores WhatsApp conversation context for follow-up query resolution. Accessed only by edge functions via service role.';