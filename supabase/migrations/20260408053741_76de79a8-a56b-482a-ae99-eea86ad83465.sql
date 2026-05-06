
-- Drop the old overloaded version first (5 params)
DROP FUNCTION IF EXISTS public.send_broadcast_notification(text, text, uuid, text, text[]);
-- Drop the current version (6 params)
DROP FUNCTION IF EXISTS public.send_broadcast_notification(text, text, uuid, text, text[], text[]);

CREATE OR REPLACE FUNCTION public.send_broadcast_notification(
  p_title TEXT,
  p_message TEXT,
  p_actor_user_id UUID,
  p_target_type TEXT DEFAULT 'all',
  p_target_ids TEXT[] DEFAULT NULL,
  p_portals TEXT[] DEFAULT ARRAY['customer_portal'],
  p_field_sales_target_type TEXT DEFAULT 'all',
  p_field_sales_target_ids TEXT[] DEFAULT NULL,
  p_distributor_target_type TEXT DEFAULT 'all',
  p_distributor_target_ids TEXT[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_retailer RECORD;
  v_profile RECORD;
  v_dist_user RECORD;
  v_title TEXT;
  v_message TEXT;
  v_count INTEGER := 0;
  v_portal TEXT;
BEGIN
  FOREACH v_portal IN ARRAY p_portals
  LOOP
    -- ==================== CUSTOMER PORTAL ====================
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

    -- ==================== FIELD SALES APP ====================
    ELSIF v_portal = 'field_sales_app' THEN
      FOR v_profile IN
        SELECT p.id, p.full_name FROM profiles p
        WHERE (
          COALESCE(p_field_sales_target_type, 'all') = 'all'
          -- By Role: match security profile id
          OR (
            p_field_sales_target_type = 'role'
            AND EXISTS (
              SELECT 1 FROM user_profiles up
              WHERE up.user_id = p.id
              AND up.profile_id::text = ANY(p_field_sales_target_ids)
            )
          )
          -- By Territory
          OR (
            p_field_sales_target_type = 'territory'
            AND p.territories_covered && p_field_sales_target_ids
          )
          -- By Individual User
          OR (
            p_field_sales_target_type = 'user'
            AND p.id::text = ANY(p_field_sales_target_ids)
          )
        )
        -- Exclude distributor portal users
        AND NOT EXISTS (
          SELECT 1 FROM distributor_users du WHERE du.auth_user_id = p.id
        )
      LOOP
        v_title := REPLACE(p_title, '{user_name}', COALESCE(v_profile.full_name, ''));
        v_message := REPLACE(p_message, '{user_name}', COALESCE(v_profile.full_name, ''));

        INSERT INTO notifications (user_id, title, message, type, related_table, target_portal)
        VALUES (v_profile.id, v_title, v_message, 'broadcast', 'broadcast', 'field_sales_app');

        v_count := v_count + 1;
      END LOOP;

    -- ==================== DISTRIBUTOR PORTAL ====================
    ELSIF v_portal = 'distributor_portal' THEN
      FOR v_dist_user IN
        SELECT du.auth_user_id, du.full_name, du.distributor_id
        FROM distributor_users du
        WHERE du.auth_user_id IS NOT NULL
          AND du.is_active = true
          AND (
            COALESCE(p_distributor_target_type, 'all') = 'all'
            -- By Distributor Type
            OR (
              p_distributor_target_type = 'type'
              AND EXISTS (
                SELECT 1 FROM distributors d
                WHERE d.id = du.distributor_id
                AND d.type_id::text = ANY(p_distributor_target_ids)
              )
            )
            -- By Specific Distributor
            OR (
              p_distributor_target_type = 'specific'
              AND du.distributor_id::text = ANY(p_distributor_target_ids)
            )
            -- By Parent (include parent + all children)
            OR (
              p_distributor_target_type = 'parent'
              AND (
                du.distributor_id::text = ANY(p_distributor_target_ids)
                OR EXISTS (
                  SELECT 1 FROM distributors d
                  WHERE d.id = du.distributor_id
                  AND d.parent_id::text = ANY(p_distributor_target_ids)
                )
              )
            )
          )
      LOOP
        v_title := REPLACE(p_title, '{user_name}', COALESCE(v_dist_user.full_name, ''));
        v_message := REPLACE(p_message, '{user_name}', COALESCE(v_dist_user.full_name, ''));

        INSERT INTO notifications (user_id, title, message, type, related_table, target_portal)
        VALUES (v_dist_user.auth_user_id, v_title, v_message, 'broadcast', 'broadcast', 'distributor_portal');

        v_count := v_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  -- Log the broadcast
  INSERT INTO broadcast_notification_log (title, message, target_type, target_ids, sent_count, sent_by, target_portals)
  VALUES (p_title, p_message, p_target_type, p_target_ids, v_count, p_actor_user_id, p_portals);

  RETURN v_count;
END;
$$;
