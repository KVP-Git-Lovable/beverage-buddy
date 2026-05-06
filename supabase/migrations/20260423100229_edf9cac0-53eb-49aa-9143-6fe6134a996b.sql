CREATE OR REPLACE FUNCTION public.enforce_packing_list_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  allowed_transitions jsonb := '{
    "draft": ["picking", "cancelled"],
    "picking": ["packed", "cancelled"],
    "packed": ["ready", "cancelled"],
    "ready": ["dispatched", "cancelled"],
    "dispatched": ["delivered", "cancelled"],
    "delivered": ["completed"]
  }'::jsonb;
  allowed jsonb;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  allowed := allowed_transitions -> OLD.status;
  IF allowed IS NULL OR NOT (allowed ? NEW.status) THEN
    RAISE EXCEPTION 'Invalid packing list status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$function$;