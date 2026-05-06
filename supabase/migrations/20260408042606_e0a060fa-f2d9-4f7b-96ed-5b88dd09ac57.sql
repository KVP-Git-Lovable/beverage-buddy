
-- Step 1: Create broadcast_notification_log table
CREATE TABLE public.broadcast_notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_ids TEXT[] DEFAULT NULL,
  sent_count INTEGER NOT NULL DEFAULT 0,
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view broadcast logs"
ON public.broadcast_notification_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert broadcast logs"
ON public.broadcast_notification_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Step 2: Create send_broadcast_notification RPC
CREATE OR REPLACE FUNCTION public.send_broadcast_notification(
  p_title TEXT,
  p_message TEXT,
  p_actor_user_id UUID,
  p_target_type TEXT DEFAULT 'all',
  p_target_ids TEXT[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retailer RECORD;
  v_title TEXT;
  v_message TEXT;
  v_count INTEGER := 0;
BEGIN
  FOR v_retailer IN
    SELECT r.id, r.name FROM retailers r
    WHERE r.portal_enabled = true
      AND (
        COALESCE(p_target_type, 'all') = 'all'
        OR (p_target_type = 'beat' AND r.beat_id::text = ANY(p_target_ids))
        OR (p_target_type = 'territory' AND r.territory_id::text = ANY(p_target_ids))
        OR (p_target_type = 'category' AND r.category = ANY(p_target_ids))
        OR (p_target_type = 'owner' AND r.owner_id::text = ANY(p_target_ids))
      )
  LOOP
    v_title := REPLACE(p_title, '{retailer_name}', COALESCE(v_retailer.name, ''));
    v_message := REPLACE(p_message, '{retailer_name}', COALESCE(v_retailer.name, ''));

    INSERT INTO notifications (user_id, retailer_id, title, message, type, related_table)
    VALUES (p_actor_user_id, v_retailer.id, v_title, v_message, 'broadcast', 'broadcast');

    v_count := v_count + 1;
  END LOOP;

  INSERT INTO broadcast_notification_log (title, message, target_type, target_ids, sent_count, sent_by)
  VALUES (p_title, p_message, p_target_type, p_target_ids, v_count, p_actor_user_id);

  RETURN v_count;
END;
$$;
