
-- 1. Add metadata columns to whatsapp_sessions
ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS beat_id uuid,
  ADD COLUMN IF NOT EXISTS territory_id uuid;

-- 2. Harden trigger_notification_orders to skip when user_id is not a real auth user
CREATE OR REPLACE FUNCTION public.trigger_notification_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Safety: only emit notifications if user_id exists in auth.users
  IF NEW.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RAISE LOG 'trigger_notification_orders: skipping notification, user_id % not in auth.users', NEW.user_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM emit_notification_event('RECORD_CREATED', 'orders', NEW.id::text, NEW.user_id,
      jsonb_build_object('record_name', COALESCE(NEW.invoice_number, NEW.id::text), 'date', NEW.order_date::text));
  ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM emit_notification_event('RECORD_APPROVED', 'orders', NEW.id::text, NEW.user_id,
        jsonb_build_object('record_name', COALESCE(NEW.invoice_number, NEW.id::text), 'date', NEW.order_date::text));
    ELSE
      PERFORM emit_notification_event('RECORD_UPDATED', 'orders', NEW.id::text, NEW.user_id,
        jsonb_build_object('record_name', COALESCE(NEW.invoice_number, NEW.id::text), 'date', NEW.order_date::text));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
