-- Create the missing notification_rules table
CREATE TABLE public.notification_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_code TEXT NOT NULL,
  source_table TEXT NOT NULL,
  title_template TEXT NOT NULL DEFAULT '',
  message_template TEXT NOT NULL DEFAULT '',
  receiver_type TEXT NOT NULL DEFAULT 'employee',
  receiver_user_id UUID,
  notification_channel TEXT NOT NULL DEFAULT 'in_app',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

-- Allow the trigger function (SECURITY DEFINER) to read rules freely
-- For admin management, allow authenticated users to manage
CREATE POLICY "Authenticated users can view notification rules"
  ON public.notification_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage notification rules"
  ON public.notification_rules FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Also grant anon SELECT so the SECURITY DEFINER function can read it
-- (SECURITY DEFINER bypasses RLS but the table still needs to exist)
GRANT SELECT ON public.notification_rules TO anon;
GRANT SELECT ON public.notification_rules TO authenticated;

-- Add index for fast lookups by event_code
CREATE INDEX idx_notification_rules_event_code ON public.notification_rules (event_code, is_active);