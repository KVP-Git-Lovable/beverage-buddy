-- Drop the empty no-args overload
DROP FUNCTION IF EXISTS public.emit_notification_event();

-- Drop the ambiguous overload where actor_user_id (uuid) comes before record_id (text)
DROP FUNCTION IF EXISTS public.emit_notification_event(text, text, uuid, text, jsonb);

-- Keep only: emit_notification_event(p_event_code text, p_source_table text, p_record_id text, p_actor_user_id uuid, p_metadata jsonb)