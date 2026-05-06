-- Extend activity_events with status, completion timestamp, and free-text location
ALTER TABLE public.activity_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS location text;

-- Validation trigger for status (avoid CHECK constraint per project standards)
CREATE OR REPLACE FUNCTION public.validate_activity_event_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'completed') THEN
    RAISE EXCEPTION 'Invalid activity_events.status: %. Allowed: active, completed', NEW.status;
  END IF;
  -- Auto-stamp completed_at when transitioning to completed
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  -- Clear timestamp when reverting to active
  IF NEW.status = 'active' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_activity_event_status ON public.activity_events;
CREATE TRIGGER trg_validate_activity_event_status
BEFORE INSERT OR UPDATE OF status ON public.activity_events
FOR EACH ROW
EXECUTE FUNCTION public.validate_activity_event_status();

-- Link orders to an event (nullable; SET NULL on event deletion to preserve order history)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.activity_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_event_id
  ON public.orders(event_id)
  WHERE event_id IS NOT NULL;