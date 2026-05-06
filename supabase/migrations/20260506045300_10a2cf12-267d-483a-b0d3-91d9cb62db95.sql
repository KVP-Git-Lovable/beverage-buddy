CREATE TABLE public.accrual_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  leave_type_id uuid NOT NULL,
  frequency text NOT NULL DEFAULT 'monthly'::text,
  divisor integer NOT NULL DEFAULT 12,
  round_mode text NOT NULL DEFAULT 'round'::text,
  prorate_joining boolean NOT NULL DEFAULT false,
  credit_day integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  visit_id uuid,
  user_id uuid NOT NULL,
  activity_type text NOT NULL DEFAULT 'Other'::text,
  duration_type text NOT NULL DEFAULT 'full_day'::text,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  half_day_type text,
  from_date date,
  to_date date,
  total_days integer,
  retailer_id uuid,
  retailer_name text,
  remarks text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  activity_name text,
  status text NOT NULL DEFAULT 'active'::text,
  completed_at timestamp with time zone,
  location text
);

CREATE TABLE public.additional_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  custom_category text,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  bill_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft'::text,
  submitted_at timestamp with time zone,
  approved_by uuid,
  approved_at timestamp with time zone,
  rejection_reason text
);

CREATE TABLE public.ai_autonomous_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  action_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  executed_at timestamp with time zone,
  can_undo boolean DEFAULT false,
  undo_until timestamp with time zone,
  undone_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_feature_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  retailer_id uuid,
  visit_id uuid,
  feedback_type text NOT NULL,
  feature text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.ai_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  insight_type text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium'::text,
  title text NOT NULL,
  description text NOT NULL,
  action_type text,
  action_data jsonb,
  reference_id uuid,
  reference_type text,
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  is_actioned boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_scheme_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  suggested_name text NOT NULL,
  suggested_description text,
  suggested_scheme_type text NOT NULL,
  suggested_discount_percentage numeric DEFAULT 0,
  suggested_discount_amount numeric DEFAULT 0,
  suggested_buy_quantity integer DEFAULT 0,
  suggested_free_quantity integer DEFAULT 0,
  suggested_condition_quantity integer DEFAULT 0,
  suggested_min_order_value numeric DEFAULT 0,
  suggested_tier_data jsonb DEFAULT '[]'::jsonb,
  suggested_start_date date,
  suggested_end_date date,
  suggested_product_id uuid,
  suggested_category_id uuid,
  analysis_type text NOT NULL,
  target_type text NOT NULL,
  target_ids uuid[] DEFAULT '{}'::uuid[],
  target_names text[] DEFAULT '{}'::text[],
  reasoning text NOT NULL,
  data_signals jsonb DEFAULT '{}'::jsonb,
  confidence_score numeric(3,2) DEFAULT 0.75,
  expected_benefit text,
  status text DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  admin_modifications jsonb,
  created_scheme_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval)
);

CREATE TABLE public.analytics_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  page_type text NOT NULL DEFAULT 'general_analytics'::text,
  liked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.analytics_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  visit_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.approval_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  approval_request_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid NOT NULL,
  level integer,
  "timestamp" timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE TABLE public.approval_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  use_full_hierarchy boolean NOT NULL DEFAULT true,
  max_levels integer NOT NULL DEFAULT 10,
  final_approval_role text,
  skip_levels boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  approval_mode text NOT NULL DEFAULT 'manager'::text
);

CREATE TABLE public.approval_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  current_level integer NOT NULL DEFAULT 1,
  total_levels integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending'::text,
  final_approved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.approval_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  approval_request_id uuid NOT NULL,
  level integer NOT NULL,
  approver_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  action_taken_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.approval_workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workflow_name text NOT NULL,
  entity_type text NOT NULL DEFAULT 'expense'::text,
  approval_mode text NOT NULL DEFAULT 'sequential'::text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.approvers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  approver_level integer NOT NULL,
  department text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.aspirations_and_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  career_goal text,
  dream_role text,
  preferred_work_style text,
  motivation_driver text,
  five_year_vision text,
  favorite_activity text,
  preferred_reward text,
  team_preference text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  check_in_location jsonb,
  check_out_location jsonb,
  check_in_photo_url text,
  check_out_photo_url text,
  status text NOT NULL DEFAULT 'present'::text,
  total_hours numeric(4,2),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  check_in_address text,
  check_out_address text,
  face_verification_status text,
  face_match_confidence numeric(5,2),
  face_verification_status_out text,
  face_match_confidence_out numeric,
  regularized_request_id uuid,
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamp with time zone,
  locked_by uuid,
  manual_override_reason text
);

CREATE TABLE public.attendance_daily_admin_summary (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  total_employees integer NOT NULL DEFAULT 0,
  total_present integer NOT NULL DEFAULT 0,
  total_absent integer NOT NULL DEFAULT 0,
  total_on_leave integer NOT NULL DEFAULT 0,
  total_half_day integer NOT NULL DEFAULT 0,
  avg_hours numeric(5,2) DEFAULT 0,
  total_hours_sum numeric(8,2) DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.attendance_user_monthly_summary (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  present_days integer NOT NULL DEFAULT 0,
  absent_days integer NOT NULL DEFAULT 0,
  leave_days integer NOT NULL DEFAULT 0,
  half_day_leave_days integer NOT NULL DEFAULT 0,
  regularized_days integer NOT NULL DEFAULT 0,
  total_hours numeric(8,2) DEFAULT 0,
  avg_daily_hours numeric(5,2) DEFAULT 0,
  lop_days numeric(5,2) DEFAULT 0,
  working_days integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.auto_end_day_policy (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  auto_close_time time without time zone NOT NULL DEFAULT '22:00:00'::time without time zone,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata'::text,
  last_activity_source text NOT NULL DEFAULT 'all_activity'::text,
  pre_warning_enabled boolean NOT NULL DEFAULT true,
  pre_warning_minutes_before integer NOT NULL DEFAULT 60,
  close_in_progress_visits boolean NOT NULL DEFAULT true,
  cancel_planned_visits boolean NOT NULL DEFAULT true,
  mark_unproductive boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL,
  criteria_type text NOT NULL,
  criteria_value numeric NOT NULL,
  badge_color text DEFAULT 'blue'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.beat_allowances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  beat_id text NOT NULL,
  beat_name text NOT NULL,
  user_id uuid NOT NULL,
  daily_allowance numeric NOT NULL DEFAULT 0,
  travel_allowance numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  average_km numeric DEFAULT 0,
  average_time_minutes integer DEFAULT 0
);

CREATE TABLE public.beat_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  beat_id text NOT NULL,
  action text NOT NULL,
  old_user_id uuid,
  new_user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  performed_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.beat_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  beat_id text NOT NULL,
  beat_name text NOT NULL,
  beat_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  joint_sales_manager_id uuid
);

CREATE TABLE public.beats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  beat_id text NOT NULL,
  beat_name text NOT NULL,
  category text DEFAULT 'General'::text,
  travel_allowance numeric DEFAULT 0,
  average_km numeric DEFAULT 0,
  average_time_minutes integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  territory_id uuid,
  distributor_id uuid,
  owner_id uuid,
  owner_name text
);

CREATE TABLE public.branding_request_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  branding_request_id uuid,
  asset_type text NOT NULL,
  due_date date,
  preferred_vendor text,
  vendor_confirmation_status text DEFAULT 'Pending'::text,
  vendor_budget numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  current_stage text,
  approved_budget numeric,
  pending_status text
);

CREATE TABLE public.branding_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  visit_id uuid NOT NULL,
  title text,
  description text,
  pincode text,
  requested_assets text,
  size text,
  budget numeric,
  status public.branding_status NOT NULL DEFAULT 'submitted'::branding_status,
  manager_id uuid,
  manager_comments text,
  approved_at timestamp with time zone,
  procurement_id uuid,
  assigned_vendor_id uuid,
  due_date date,
  executed_at timestamp with time zone,
  verification_photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  contract_document_url text,
  implementation_photo_urls text[] DEFAULT '{}'::text[],
  measurement_photo_urls text[] DEFAULT '{}'::text[],
  retailer_feedback_on_branding text,
  order_impact_notes text,
  vendor_due_date date,
  vendor_budget numeric,
  vendor_confirmation_status text,
  vendor_rating numeric,
  vendor_feedback text,
  implementation_date date,
  post_implementation_notes text
);

CREATE TABLE public.broadcast_notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target_type text DEFAULT 'all'::text,
  target_ids text[],
  target_portals text[],
  sent_count integer DEFAULT 0,
  sent_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.chat_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer,
  comment text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);