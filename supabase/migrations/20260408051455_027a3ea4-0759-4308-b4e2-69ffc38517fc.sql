
-- 1. Add target_portal to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_portal TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_target_portal ON public.notifications (target_portal);

-- 2. Create broadcast_notification_log table
CREATE TABLE IF NOT EXISTS public.broadcast_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT DEFAULT 'all',
  target_ids TEXT[] DEFAULT NULL,
  target_portals TEXT[] DEFAULT NULL,
  sent_count INTEGER DEFAULT 0,
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own broadcast logs"
  ON public.broadcast_notification_log FOR SELECT
  TO authenticated
  USING (sent_by = auth.uid());

CREATE POLICY "Authenticated users can insert broadcast logs"
  ON public.broadcast_notification_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Replace the RPC to support multi-portal
CREATE OR REPLACE FUNCTION public.send_broadcast_notification(
  p_title TEXT,
  p_message TEXT,
  p_actor_user_id UUID,
  p_target_type TEXT DEFAULT 'all',
  p_target_ids TEXT[] DEFAULT NULL,
  p_portals TEXT[] DEFAULT ARRAY['customer_portal']
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_retailer RECORD;
  v_profile RECORD;
  v_title TEXT;
  v_message TEXT;
  v_count INTEGER := 0;
  v_portal TEXT;
BEGIN
  FOREACH v_portal IN ARRAY p_portals
  LOOP
    IF v_portal = 'customer_portal' THEN
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

        INSERT INTO notifications (user_id, retailer_id, title, message, type, related_table, target_portal)
        VALUES (p_actor_user_id, v_retailer.id, v_title, v_message, 'broadcast', 'broadcast', 'customer_portal');

        v_count := v_count + 1;
      END LOOP;

    ELSIF v_portal = 'distributor_portal' THEN
      FOR v_profile IN
        SELECT p.id, p.full_name FROM profiles p
        WHERE p.distributor_id IS NOT NULL
      LOOP
        v_title := REPLACE(p_title, '{user_name}', COALESCE(v_profile.full_name, ''));
        v_message := REPLACE(p_message, '{user_name}', COALESCE(v_profile.full_name, ''));

        INSERT INTO notifications (user_id, title, message, type, related_table, target_portal)
        VALUES (v_profile.id, v_title, v_message, 'broadcast', 'broadcast', 'distributor_portal');

        v_count := v_count + 1;
      END LOOP;

    ELSIF v_portal = 'field_sales_app' THEN
      FOR v_profile IN
        SELECT p.id, p.full_name FROM profiles p
        WHERE p.distributor_id IS NULL
      LOOP
        v_title := REPLACE(p_title, '{user_name}', COALESCE(v_profile.full_name, ''));
        v_message := REPLACE(p_message, '{user_name}', COALESCE(v_profile.full_name, ''));

        INSERT INTO notifications (user_id, title, message, type, related_table, target_portal)
        VALUES (v_profile.id, v_title, v_message, 'broadcast', 'broadcast', 'field_sales_app');

        v_count := v_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  INSERT INTO broadcast_notification_log (title, message, target_type, target_ids, sent_count, sent_by, target_portals)
  VALUES (p_title, p_message, p_target_type, p_target_ids, v_count, p_actor_user_id, p_portals);

  RETURN v_count;
END;
$function$;
