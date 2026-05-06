CREATE OR REPLACE FUNCTION public.validate_primary_order_status_transition()
RETURNS trigger AS $$
DECLARE
  valid_transitions jsonb := '{
    "draft": ["pending", "cancelled"],
    "pending": ["submitted", "cancelled"],
    "submitted": ["confirmed", "allocated", "cancelled", "rejected"],
    "confirmed": ["processing", "cancelled"],
    "processing": ["allocated", "cancelled"],
    "allocated": ["packed"],
    "packed": ["dispatched", "shipped"],
    "shipped": ["partially_delivered", "delivered"],
    "dispatched": ["partially_delivered", "delivered"],
    "partially_delivered": ["delivered"]
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.validate_primary_order_status_transition() IS
'Validates primary order status transitions. Allows direct submitted → allocated transition for packing list assignment workflow. System admins bypass all checks.';