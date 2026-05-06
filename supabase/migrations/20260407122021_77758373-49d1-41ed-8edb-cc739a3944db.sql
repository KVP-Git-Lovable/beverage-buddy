
-- Step 1: Insert scheme event types
INSERT INTO notification_event_types (event_code, label, description, is_active) VALUES
  ('SCHEME_CREATED', 'New Scheme Published', 'When a new product scheme is created', true),
  ('SCHEME_UPDATED', 'Scheme Updated', 'When an existing scheme is modified', true),
  ('SCHEME_EXPIRED', 'Scheme Expired', 'When a scheme reaches its end date', true)
ON CONFLICT (event_code) DO NOTHING;

-- Step 2: Add retailer targeting columns to notification_rules
ALTER TABLE notification_rules
  ADD COLUMN IF NOT EXISTS retailer_target_type text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS retailer_target_ids text[];

-- Step 3: Update the callable emit_notification_event to handle retailer targeting
CREATE OR REPLACE FUNCTION public.emit_notification_event(
  p_event_code text,
  p_source_table text,
  p_actor_user_id uuid,
  p_record_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_rule RECORD;
  v_receiver_id uuid;
  v_retailer_id uuid;
  v_title text;
  v_message text;
  v_actor_name text;
  v_module_name text;
  v_record_uuid uuid;
  v_retailer_name text;
BEGIN
  -- Safely cast record_id to uuid
  BEGIN
    v_record_uuid := p_record_id::uuid;
  EXCEPTION WHEN others THEN
    v_record_uuid := NULL;
  END;

  -- Insert event log
  INSERT INTO notification_event_log (event_code, source_table, record_id, actor_user_id, metadata)
  VALUES (p_event_code, p_source_table, p_record_id, p_actor_user_id, p_metadata)
  RETURNING id INTO v_log_id;

  -- Get actor name
  SELECT COALESCE(full_name, username, 'System') INTO v_actor_name
  FROM profiles WHERE id = p_actor_user_id;

  -- Derive module name from source table
  v_module_name := REPLACE(INITCAP(REPLACE(p_source_table, '_', ' ')), ' ', ' ');

  -- Loop through matching rules
  FOR v_rule IN
    SELECT * FROM notification_rules
    WHERE event_code = p_event_code
      AND source_table = p_source_table
      AND is_active = true
  LOOP
    v_receiver_id := NULL;

    -- Resolve receiver
    CASE v_rule.receiver_type
      WHEN 'employee' THEN
        v_receiver_id := p_actor_user_id;
      WHEN 'manager' THEN
        SELECT manager_id INTO v_receiver_id
        FROM employees WHERE user_id = p_actor_user_id;
      WHEN 'admin' THEN
        FOR v_receiver_id IN
          SELECT up.user_id FROM user_profiles up
          JOIN security_profiles sp ON sp.id = up.profile_id
          WHERE sp.name = 'System Administrator'
        LOOP
          v_title := v_rule.title_template;
          v_message := v_rule.message_template;
          v_title := REPLACE(v_title, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
          v_title := REPLACE(v_title, '{module_name}', v_module_name);
          v_title := REPLACE(v_title, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
          v_title := REPLACE(v_title, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
          v_title := REPLACE(v_title, '{points}', COALESCE(p_metadata->>'points', '0'));
          v_title := REPLACE(v_title, '{scheme_name}', COALESCE(p_metadata->>'scheme_name', ''));
          v_title := REPLACE(v_title, '{scheme_type}', COALESCE(p_metadata->>'scheme_type', ''));
          v_message := REPLACE(v_message, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
          v_message := REPLACE(v_message, '{module_name}', v_module_name);
          v_message := REPLACE(v_message, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
          v_message := REPLACE(v_message, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
          v_message := REPLACE(v_message, '{points}', COALESCE(p_metadata->>'points', '0'));
          v_message := REPLACE(v_message, '{scheme_name}', COALESCE(p_metadata->>'scheme_name', ''));
          v_message := REPLACE(v_message, '{scheme_type}', COALESCE(p_metadata->>'scheme_type', ''));

          INSERT INTO notifications (user_id, title, message, type, related_table, related_id)
          VALUES (v_receiver_id, v_title, v_message, p_event_code, p_source_table, v_record_uuid);
        END LOOP;
        CONTINUE;
      WHEN 'specific_user' THEN
        v_receiver_id := v_rule.receiver_user_id;
      WHEN 'role' THEN
        FOR v_receiver_id IN
          SELECT user_id FROM user_roles WHERE role::text = v_rule.receiver_role
        LOOP
          v_title := v_rule.title_template;
          v_message := v_rule.message_template;
          v_title := REPLACE(v_title, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
          v_title := REPLACE(v_title, '{module_name}', v_module_name);
          v_title := REPLACE(v_title, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
          v_title := REPLACE(v_title, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
          v_title := REPLACE(v_title, '{points}', COALESCE(p_metadata->>'points', '0'));
          v_title := REPLACE(v_title, '{scheme_name}', COALESCE(p_metadata->>'scheme_name', ''));
          v_title := REPLACE(v_title, '{scheme_type}', COALESCE(p_metadata->>'scheme_type', ''));
          v_message := REPLACE(v_message, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
          v_message := REPLACE(v_message, '{module_name}', v_module_name);
          v_message := REPLACE(v_message, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
          v_message := REPLACE(v_message, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
          v_message := REPLACE(v_message, '{points}', COALESCE(p_metadata->>'points', '0'));
          v_message := REPLACE(v_message, '{scheme_name}', COALESCE(p_metadata->>'scheme_name', ''));
          v_message := REPLACE(v_message, '{scheme_type}', COALESCE(p_metadata->>'scheme_type', ''));

          INSERT INTO notifications (user_id, title, message, type, related_table, related_id)
          VALUES (v_receiver_id, v_title, v_message, p_event_code, p_source_table, v_record_uuid);
        END LOOP;
        CONTINUE;
      WHEN 'retailer' THEN
        -- Retailer targeting: loop through matching retailers
        FOR v_retailer_id IN
          SELECT r.id FROM retailers r
          WHERE r.portal_enabled = true
            AND (
              COALESCE(v_rule.retailer_target_type, 'all') = 'all'
              OR (v_rule.retailer_target_type = 'beat' AND r.beat_id::text = ANY(v_rule.retailer_target_ids))
              OR (v_rule.retailer_target_type = 'territory' AND r.territory_id::text = ANY(v_rule.retailer_target_ids))
              OR (v_rule.retailer_target_type = 'category' AND r.category = ANY(v_rule.retailer_target_ids))
              OR (v_rule.retailer_target_type = 'owner' AND r.owner_id::text = ANY(v_rule.retailer_target_ids))
            )
        LOOP
          -- Get retailer name
          SELECT name INTO v_retailer_name FROM retailers WHERE id = v_retailer_id;

          v_title := v_rule.title_template;
          v_message := v_rule.message_template;
          v_title := REPLACE(v_title, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
          v_title := REPLACE(v_title, '{module_name}', v_module_name);
          v_title := REPLACE(v_title, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
          v_title := REPLACE(v_title, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
          v_title := REPLACE(v_title, '{points}', COALESCE(p_metadata->>'points', '0'));
          v_title := REPLACE(v_title, '{scheme_name}', COALESCE(p_metadata->>'scheme_name', ''));
          v_title := REPLACE(v_title, '{scheme_type}', COALESCE(p_metadata->>'scheme_type', ''));
          v_title := REPLACE(v_title, '{retailer_name}', COALESCE(v_retailer_name, ''));
          v_message := REPLACE(v_message, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
          v_message := REPLACE(v_message, '{module_name}', v_module_name);
          v_message := REPLACE(v_message, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
          v_message := REPLACE(v_message, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
          v_message := REPLACE(v_message, '{points}', COALESCE(p_metadata->>'points', '0'));
          v_message := REPLACE(v_message, '{scheme_name}', COALESCE(p_metadata->>'scheme_name', ''));
          v_message := REPLACE(v_message, '{scheme_type}', COALESCE(p_metadata->>'scheme_type', ''));
          v_message := REPLACE(v_message, '{retailer_name}', COALESCE(v_retailer_name, ''));

          INSERT INTO notifications (user_id, retailer_id, title, message, type, related_table, related_id)
          VALUES (p_actor_user_id, v_retailer_id, v_title, v_message, p_event_code, p_source_table, v_record_uuid);
        END LOOP;
        CONTINUE;
      ELSE
        CONTINUE;
    END CASE;

    IF v_receiver_id IS NOT NULL THEN
      v_title := v_rule.title_template;
      v_message := v_rule.message_template;
      v_title := REPLACE(v_title, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
      v_title := REPLACE(v_title, '{module_name}', v_module_name);
      v_title := REPLACE(v_title, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
      v_title := REPLACE(v_title, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
      v_title := REPLACE(v_title, '{points}', COALESCE(p_metadata->>'points', '0'));
      v_title := REPLACE(v_title, '{scheme_name}', COALESCE(p_metadata->>'scheme_name', ''));
      v_title := REPLACE(v_title, '{scheme_type}', COALESCE(p_metadata->>'scheme_type', ''));
      v_message := REPLACE(v_message, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
      v_message := REPLACE(v_message, '{module_name}', v_module_name);
      v_message := REPLACE(v_message, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
      v_message := REPLACE(v_message, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
      v_message := REPLACE(v_message, '{points}', COALESCE(p_metadata->>'points', '0'));
      v_message := REPLACE(v_message, '{scheme_name}', COALESCE(p_metadata->>'scheme_name', ''));
      v_message := REPLACE(v_message, '{scheme_type}', COALESCE(p_metadata->>'scheme_type', ''));

      INSERT INTO notifications (user_id, title, message, type, related_table, related_id)
      VALUES (v_receiver_id, v_title, v_message, p_event_code, p_source_table, v_record_uuid);
    END IF;
  END LOOP;
END;
$$;

-- Step 4: Create a manual push function for admin "Send Now"
CREATE OR REPLACE FUNCTION public.push_retailer_notification(
  p_rule_id uuid,
  p_actor_user_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule RECORD;
  v_retailer RECORD;
  v_title text;
  v_message text;
  v_actor_name text;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_rule FROM notification_rules WHERE id = p_rule_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rule not found or inactive';
  END IF;
  IF v_rule.receiver_type != 'retailer' THEN
    RAISE EXCEPTION 'Rule is not a retailer-targeted rule';
  END IF;

  SELECT COALESCE(full_name, username, 'System') INTO v_actor_name
  FROM profiles WHERE id = p_actor_user_id;

  FOR v_retailer IN
    SELECT r.id, r.name FROM retailers r
    WHERE r.portal_enabled = true
      AND (
        COALESCE(v_rule.retailer_target_type, 'all') = 'all'
        OR (v_rule.retailer_target_type = 'beat' AND r.beat_id::text = ANY(v_rule.retailer_target_ids))
        OR (v_rule.retailer_target_type = 'territory' AND r.territory_id::text = ANY(v_rule.retailer_target_ids))
        OR (v_rule.retailer_target_type = 'category' AND r.category = ANY(v_rule.retailer_target_ids))
        OR (v_rule.retailer_target_type = 'owner' AND r.owner_id::text = ANY(v_rule.retailer_target_ids))
      )
  LOOP
    v_title := v_rule.title_template;
    v_message := v_rule.message_template;
    v_title := REPLACE(v_title, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
    v_title := REPLACE(v_title, '{module_name}', REPLACE(INITCAP(REPLACE(v_rule.source_table, '_', ' ')), ' ', ' '));
    v_title := REPLACE(v_title, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
    v_title := REPLACE(v_title, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
    v_title := REPLACE(v_title, '{scheme_name}', COALESCE(p_metadata->>'scheme_name', ''));
    v_title := REPLACE(v_title, '{scheme_type}', COALESCE(p_metadata->>'scheme_type', ''));
    v_title := REPLACE(v_title, '{retailer_name}', COALESCE(v_retailer.name, ''));
    v_message := REPLACE(v_message, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
    v_message := REPLACE(v_message, '{module_name}', REPLACE(INITCAP(REPLACE(v_rule.source_table, '_', ' ')), ' ', ' '));
    v_message := REPLACE(v_message, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
    v_message := REPLACE(v_message, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
    v_message := REPLACE(v_message, '{scheme_name}', COALESCE(p_metadata->>'scheme_name', ''));
    v_message := REPLACE(v_message, '{scheme_type}', COALESCE(p_metadata->>'scheme_type', ''));
    v_message := REPLACE(v_message, '{retailer_name}', COALESCE(v_retailer.name, ''));

    INSERT INTO notifications (user_id, retailer_id, title, message, type, related_table, related_id)
    VALUES (p_actor_user_id, v_retailer.id, v_title, v_message, v_rule.notification_channel, v_rule.source_table, NULL);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
