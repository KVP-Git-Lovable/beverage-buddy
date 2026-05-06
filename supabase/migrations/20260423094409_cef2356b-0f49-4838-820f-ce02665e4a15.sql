CREATE OR REPLACE FUNCTION public.validate_primary_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_transitions jsonb := '{
    "draft": ["pending", "cancelled"],
    "pending": ["submitted", "cancelled"],
    "submitted": ["confirmed", "allocated", "cancelled", "rejected"],
    "confirmed": ["processing", "allocated", "cancelled"],
    "processing": ["allocated", "cancelled"],
    "allocated": ["packed", "dispatched", "shipped", "cancelled"],
    "packed": ["dispatched", "shipped", "cancelled"],
    "shipped": ["partially_delivered", "delivered"],
    "dispatched": ["partially_delivered", "delivered", "completed"],
    "partially_delivered": ["delivered", "completed"],
    "delivered": ["completed"]
  }'::jsonb;
BEGIN
  IF (SELECT public.is_system_admin(auth.uid())) THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NOT (valid_transitions ? OLD.status) THEN RETURN NEW; END IF;
  IF NOT (valid_transitions->OLD.status @> to_jsonb(NEW.status)) THEN
    RAISE EXCEPTION 'Invalid status transition: % to %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;