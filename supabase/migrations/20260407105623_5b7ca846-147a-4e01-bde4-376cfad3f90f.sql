-- Add retailer_id to notifications table for customer portal notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS retailer_id UUID REFERENCES public.retailers(id) ON DELETE CASCADE;

-- Create index for retailer notifications
CREATE INDEX IF NOT EXISTS idx_notifications_retailer_id ON public.notifications(retailer_id) WHERE retailer_id IS NOT NULL;

-- Allow anon role to read notifications for customer portal
CREATE POLICY "Anon can read retailer notifications"
ON public.notifications
FOR SELECT
TO anon
USING (retailer_id IS NOT NULL);

-- Allow anon to update (mark as read) retailer notifications
CREATE POLICY "Anon can update retailer notifications"
ON public.notifications
FOR UPDATE
TO anon
USING (retailer_id IS NOT NULL)
WITH CHECK (retailer_id IS NOT NULL);

-- Update emit_notification_event to support retailer receiver_type
CREATE OR REPLACE FUNCTION public.emit_notification_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule RECORD;
  notif_title TEXT;
  notif_message TEXT;
  target_user_id UUID;
  target_retailer_id UUID;
  actor_id UUID;
  record_name TEXT;
  user_name TEXT;
  retailer_name TEXT;
BEGIN
  -- Determine actor
  actor_id := COALESCE(
    (NEW.user_id)::uuid,
    auth.uid()
  );

  -- Get user name for placeholders
  SELECT full_name INTO user_name FROM profiles WHERE id = actor_id;

  -- Get record name if available
  record_name := COALESCE(
    (NEW.name),
    (NEW.title),
    NEW.id::text
  );

  -- Log the event
  INSERT INTO notification_event_log (event_code, source_table, record_id, actor_user_id, metadata)
  VALUES (TG_ARGV[0], TG_TABLE_NAME, NEW.id, actor_id, row_to_json(NEW));

  -- Process matching rules
  FOR rule IN
    SELECT * FROM notification_rules
    WHERE event_code = TG_ARGV[0]
      AND is_active = true
  LOOP
    notif_title := rule.title_template;
    notif_message := rule.message_template;

    -- Replace placeholders
    notif_title := REPLACE(notif_title, '{user_name}', COALESCE(user_name, 'Someone'));
    notif_title := REPLACE(notif_title, '{record_name}', COALESCE(record_name, ''));
    notif_message := REPLACE(notif_message, '{user_name}', COALESCE(user_name, 'Someone'));
    notif_message := REPLACE(notif_message, '{record_name}', COALESCE(record_name, ''));

    target_user_id := NULL;
    target_retailer_id := NULL;

    IF rule.receiver_type = 'specific_user' THEN
      target_user_id := rule.receiver_user_id;
    ELSIF rule.receiver_type = 'manager' THEN
      SELECT manager_id INTO target_user_id FROM profiles WHERE id = actor_id;
    ELSIF rule.receiver_type = 'employee' THEN
      target_user_id := actor_id;
    ELSIF rule.receiver_type = 'retailer' THEN
      -- For retailer notifications, get retailer_id from the record
      target_retailer_id := (NEW.retailer_id)::uuid;
      -- Also try to get retailer name
      SELECT name INTO retailer_name FROM retailers WHERE id = target_retailer_id;
      notif_title := REPLACE(notif_title, '{retailer_name}', COALESCE(retailer_name, ''));
      notif_message := REPLACE(notif_message, '{retailer_name}', COALESCE(retailer_name, ''));
    END IF;

    -- Insert notification (either user-based or retailer-based)
    IF target_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, related_table, related_id)
      VALUES (target_user_id, notif_title, notif_message, rule.notification_channel, TG_TABLE_NAME, NEW.id);
    ELSIF target_retailer_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, retailer_id, title, message, type, related_table, related_id)
      VALUES (actor_id, target_retailer_id, notif_title, notif_message, rule.notification_channel, TG_TABLE_NAME, NEW.id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;