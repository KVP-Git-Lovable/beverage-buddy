export const SCHEMA_SQL = `-- =====================================================================
-- Supabase project: aoxdosjkwqyuvccuwhzc  (schema-only dump, reconstructed)
-- Generated 2026-05-05 from pg_catalog. Equivalent to pg_dump --schema-only
-- for the public schema. Excludes Supabase-managed schemas (auth, storage,
-- realtime, cron, net, vault, supabase_migrations).
-- =====================================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE EXTENSION IF NOT EXISTS hypopg;
-- CREATE EXTENSION IF NOT EXISTS index_advisor;

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.branding_status AS ENUM ('submitted', 'manager_approved', 'manager_rejected', 'assigned', 'in_progress', 'executed', 'verified');
CREATE TYPE public.employee_doc_type AS ENUM ('address_proof', 'id_proof', 'other');
CREATE TYPE public.user_status AS ENUM ('pending_completion', 'pending_approval', 'approved', 'rejected', 'active', 'inactive');
CREATE TYPE public.pm_project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE public.pm_task_status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled', 'overdue');
CREATE TYPE public.pm_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE public.pm_task_type AS ENUM ('epic', 'story', 'task', 'bug', 'idea', 'milestone');
CREATE TYPE public.pm_sprint_status AS ENUM ('planning', 'active', 'completed', 'cancelled');
CREATE TYPE public.pm_member_role AS ENUM ('owner', 'manager', 'developer', 'designer', 'tester', 'viewer');

-- ============================================================
-- TABLES
-- ============================================================

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

CREATE TABLE public.coach_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  badge_color text DEFAULT '#FFD700'::text,
  criteria_type text NOT NULL,
  criteria_value integer NOT NULL,
  criteria_competency_id uuid,
  points_awarded integer DEFAULT 50,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  role text NOT NULL,
  message text NOT NULL,
  message_type text DEFAULT 'text'::text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_competencies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  icon text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_daily_nudges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nudge_type text NOT NULL,
  reference_id uuid,
  message text,
  is_delivered boolean DEFAULT false,
  is_interacted boolean DEFAULT false,
  scheduled_for timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference_type text NOT NULL,
  reference_id uuid,
  rating integer,
  is_helpful boolean,
  feedback_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_learning_content (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content_type text NOT NULL,
  content_url text,
  content_body text,
  thumbnail_url text,
  duration_minutes integer,
  difficulty_level text DEFAULT 'beginner'::text,
  competency_id uuid,
  points_on_completion integer DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_quiz_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid,
  user_answer text,
  is_correct boolean,
  points_earned integer DEFAULT 0,
  answered_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_quiz_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL,
  question_type text DEFAULT 'multiple_choice'::text,
  options jsonb,
  correct_answer text NOT NULL,
  explanation text,
  competency_id uuid,
  learning_content_id uuid,
  difficulty_level text DEFAULT 'beginner'::text,
  points integer DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_scenario_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scenario_id uuid,
  selected_option text,
  is_best_choice boolean,
  points_earned integer DEFAULT 0,
  answered_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scenario_text text NOT NULL,
  scenario_type text DEFAULT 'objection_handling'::text,
  options jsonb,
  best_option text NOT NULL,
  feedback jsonb,
  competency_id uuid,
  difficulty_level text DEFAULT 'intermediate'::text,
  points integer DEFAULT 15,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid,
  earned_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_user_competency_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competency_id uuid,
  current_score integer DEFAULT 0,
  previous_score integer DEFAULT 0,
  learning_engagement_score integer DEFAULT 0,
  quiz_score integer DEFAULT 0,
  practical_score integer DEFAULT 0,
  last_calculated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_user_overall_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  overall_learning_score integer DEFAULT 0,
  overall_competency_score integer DEFAULT 0,
  total_points_earned integer DEFAULT 0,
  total_content_completed integer DEFAULT 0,
  total_quizzes_attempted integer DEFAULT 0,
  total_correct_answers integer DEFAULT 0,
  total_scenarios_completed integer DEFAULT 0,
  rank_percentile integer,
  last_calculated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_user_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  learning_content_id uuid,
  status text DEFAULT 'not_started'::text,
  progress_percent integer DEFAULT 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  time_spent_seconds integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_user_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_activity_date date,
  total_learning_days integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  contact_phone text,
  email text,
  gstin text,
  state text,
  bank_name text,
  bank_account text,
  ifsc text,
  account_holder_name text,
  qr_upi text,
  logo_url text,
  terms_conditions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  qr_code_url text,
  invoice_template text DEFAULT 'template4'::text,
  header_name text,
  header_logo_url text
);

CREATE TABLE public.company_product_categories (
  id bigint NOT NULL,
  company_id uuid NOT NULL,
  categories_json jsonb NOT NULL DEFAULT '{"categories": []}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.competencies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  level_definitions jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.competency_coaching_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scorecard_id uuid,
  user_id uuid NOT NULL,
  manager_id uuid NOT NULL,
  competency_template_id uuid,
  note text NOT NULL,
  action_items jsonb DEFAULT '[]'::jsonb,
  is_acknowledged boolean DEFAULT false,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.competency_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_type text NOT NULL,
  competency_name text NOT NULL,
  competency_code text NOT NULL,
  description text,
  category text NOT NULL,
  weightage numeric(5,2) NOT NULL,
  calculation_formula jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon text,
  max_score numeric(5,2) DEFAULT 100,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.competition_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL,
  contact_name text NOT NULL,
  contact_phone text,
  contact_email text,
  designation text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  hq text,
  region_covered text,
  reporting_to text,
  level text,
  skill text,
  competitor_since integer,
  role text,
  is_active boolean DEFAULT true
);

CREATE TABLE public.competition_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  visit_id uuid,
  competitor_id uuid NOT NULL,
  sku_id uuid,
  stock_quantity integer DEFAULT 0,
  unit text,
  insight text,
  impact_level text,
  needs_attention boolean DEFAULT false,
  photo_urls text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  voice_note_urls text[] DEFAULT '{}'::text[],
  selling_price numeric
);

CREATE TABLE public.competition_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  visit_id uuid,
  competitor_name text NOT NULL,
  product_category text,
  insight_type text NOT NULL,
  description text NOT NULL,
  impact_level text,
  action_required boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  competitor_image_url text NOT NULL DEFAULT ''::text,
  product_details text,
  category text,
  price_info text,
  shelf_space text,
  location_info text,
  additional_notes text
);

CREATE TABLE public.competition_master (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  competitor_name text NOT NULL,
  business_background text,
  key_financial_stats jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  focus text,
  strategy text,
  website text,
  sales_team_size integer,
  supply_chain_info text,
  head_office text,
  regional_offices_count integer
);

CREATE TABLE public.competition_skus (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL,
  sku_name text NOT NULL,
  unit text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE TABLE public.counter_sale_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  counter_sale_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  quantity numeric NOT NULL,
  uom_id uuid,
  uom_code text,
  conversion_to_base numeric,
  base_qty numeric,
  rate numeric NOT NULL,
  line_total numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.counter_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  visit_id uuid,
  pos_customer_id uuid,
  walkin_name text,
  walkin_phone text,
  total_amount numeric NOT NULL DEFAULT 0,
  remarks text,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  subtotal numeric,
  cgst_amount numeric,
  sgst_amount numeric,
  tax_amount numeric
);

CREATE TABLE public.credit_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  reference_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.credit_management_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  scoring_mode text NOT NULL DEFAULT 'manual'::text,
  lookback_period_months integer NOT NULL DEFAULT 3,
  new_retailer_starting_score numeric(3,1) NOT NULL DEFAULT 6.0,
  payment_term_days integer NOT NULL DEFAULT 30,
  credit_multiplier numeric(4,2) NOT NULL DEFAULT 1.5,
  weight_growth_rate numeric(3,1) NOT NULL DEFAULT 4.0,
  weight_repayment_dso numeric(3,1) NOT NULL DEFAULT 4.0,
  weight_order_frequency numeric(3,1) NOT NULL DEFAULT 2.0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  territory_ids text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  config_name text,
  target_growth_rate_percent numeric DEFAULT 10.0,
  target_order_frequency numeric DEFAULT 2.0
);

CREATE TABLE public.credit_note_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  credit_note_id uuid NOT NULL,
  original_order_id uuid,
  original_invoice_number text,
  product_id uuid,
  product_name text,
  hsn_code text,
  unit text DEFAULT 'Piece'::text,
  quantity numeric(12,3) DEFAULT 0,
  rate numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  taxable_amount numeric(12,2) DEFAULT 0,
  sgst_amount numeric(12,2) DEFAULT 0,
  cgst_amount numeric(12,2) DEFAULT 0,
  barcode text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.credit_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  credit_note_number text NOT NULL,
  credit_note_date date NOT NULL DEFAULT CURRENT_DATE,
  retailer_id uuid,
  retailer_name text,
  reason text NOT NULL DEFAULT 'other'::text,
  reason_notes text,
  sub_total numeric(12,2) DEFAULT 0,
  sgst_total numeric(12,2) DEFAULT 0,
  cgst_total numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  amount_in_words text,
  status text NOT NULL DEFAULT 'draft'::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.custom_invoice_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_file_url text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE TABLE public.customer_portal_cart (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  variant_id uuid,
  quantity numeric NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'manual'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  retailer_id uuid NOT NULL,
  unit text NOT NULL DEFAULT 'pieces'::text
);

CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  contact_person text,
  contact_phone text,
  state text,
  gstin text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.daily_gps_distance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  total_km numeric NOT NULL DEFAULT 0,
  point_count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.delivery_exceptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_run_id uuid NOT NULL,
  packing_list_id uuid NOT NULL,
  exception_type text NOT NULL,
  description text,
  resolved boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.delivery_run_packing_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_run_id uuid NOT NULL,
  packing_list_id uuid NOT NULL,
  sequence_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.delivery_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_number text NOT NULL DEFAULT ((('DR-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((gen_random_uuid())::text, 1, 4)),
  agent_id uuid,
  vehicle_id text,
  route_id uuid,
  status text NOT NULL DEFAULT 'ready'::text,
  start_time timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  delivery_mode text DEFAULT 'direct'::text,
  dispatch_date date,
  expected_delivery_date date,
  transporter_name text,
  tracking_id text,
  lr_number text,
  driver_name text,
  vehicle_number text
);

CREATE TABLE public.device_battery_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  battery_level integer NOT NULL,
  is_charging boolean NOT NULL DEFAULT false,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.distributor_beat_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  beat_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.distributor_business_plan_month_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_plan_id uuid NOT NULL,
  month_number integer NOT NULL,
  month_name text NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  percentage numeric NOT NULL DEFAULT 0,
  quantity_target numeric DEFAULT 0,
  revenue_target numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_business_plan_months (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_plan_id uuid NOT NULL,
  month_number integer NOT NULL,
  month_name text NOT NULL,
  target_revenue numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  quantity_target numeric DEFAULT 0
);

CREATE TABLE public.distributor_business_plan_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_plan_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  quantity_target integer DEFAULT 0,
  revenue_target numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_business_plan_retailers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_plan_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  retailer_name text NOT NULL,
  last_year_revenue numeric DEFAULT 0,
  target_revenue numeric DEFAULT 0,
  growth_percent numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  quantity_target numeric DEFAULT 0
);

CREATE TABLE public.distributor_business_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  year integer NOT NULL,
  revenue_target numeric DEFAULT 0,
  coverage_target text,
  territory_target text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  quantity_target numeric DEFAULT 0,
  quantity_unit text DEFAULT 'Units'::text
);

CREATE TABLE public.distributor_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  created_by_user_id uuid,
  claim_type text NOT NULL,
  claim_number text NOT NULL,
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  claim_amount numeric NOT NULL DEFAULT 0,
  approved_amount numeric DEFAULT 0,
  reference_type text,
  reference_number text,
  reference_id uuid,
  expense_category text,
  expense_date date,
  vehicle_number text,
  km_traveled numeric,
  damage_reason text,
  product_details jsonb DEFAULT '[]'::jsonb,
  scheme_name text,
  scheme_period text,
  target_achieved numeric,
  bill_urls text[] DEFAULT '{}'::text[],
  supporting_docs text[] DEFAULT '{}'::text[],
  description text,
  status text NOT NULL DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  payment_reference text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_company_return_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_return_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit text,
  unit_cost numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  reason text NOT NULL,
  source text DEFAULT 'own_stock'::text,
  source_return_id uuid,
  batch_number text,
  expiry_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_company_returns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  return_number text NOT NULL,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  total_quantity integer DEFAULT 0,
  total_value numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'::text,
  notes text,
  submitted_at timestamp with time zone,
  approved_by uuid,
  approved_at timestamp with time zone,
  picked_up_at timestamp with time zone,
  credit_note_number text,
  credit_note_amount numeric(12,2),
  credit_note_date date,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid,
  contact_name text NOT NULL,
  designation text,
  phone text,
  email text,
  address text,
  is_primary boolean DEFAULT false,
  reports_to uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  role text,
  years_of_experience integer DEFAULT 0,
  years_with_distributor integer DEFAULT 0,
  birth_date date,
  is_active boolean DEFAULT true,
  seniority text
);

CREATE TABLE public.distributor_credit_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  credit_limit numeric NOT NULL DEFAULT 0,
  credit_days integer NOT NULL DEFAULT 30,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.distributor_evaluation_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  task_key text NOT NULL,
  task_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  owner_user_id uuid,
  notes text,
  attachment_urls text[] DEFAULT '{}'::text[],
  due_date date,
  completed_date date,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_ideas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  created_by_user_id uuid,
  idea_number text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  expected_impact text,
  estimated_value numeric,
  implementation_effort text,
  region text,
  market_segment text,
  target_audience text,
  competitor_name text,
  competitor_insight text,
  suggested_product text,
  suggested_packaging text,
  suggested_price_range text,
  attachment_urls text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'submitted'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  implementation_status text,
  implementation_date date,
  points_awarded integer DEFAULT 0,
  recognition_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  variant_id uuid,
  product_name text NOT NULL,
  variant_name text,
  sku text,
  quantity integer NOT NULL DEFAULT 0,
  reserved_quantity integer NOT NULL DEFAULT 0,
  reorder_level integer DEFAULT 10,
  max_stock_level integer DEFAULT 1000,
  unit_cost numeric DEFAULT 0,
  total_value numeric,
  batch_number text,
  manufacturing_date date,
  expiry_date date,
  last_received_date date,
  last_issued_date date,
  location text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  product_id uuid,
  damaged_quantity integer NOT NULL DEFAULT 0,
  expired_quantity integer NOT NULL DEFAULT 0,
  warehouse_id uuid NOT NULL,
  unit text DEFAULT 'pcs'::text
);

CREATE TABLE public.distributor_inventory_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  variant_id uuid,
  running_balance integer,
  reference_type text,
  reference_id uuid,
  reference_number text,
  batch_number text,
  expiry_date date,
  unit text,
  unit_cost numeric(12,2),
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  product_id uuid,
  product_name text,
  balance_qty integer,
  warehouse_id uuid NOT NULL,
  transaction_type text
);

CREATE TABLE public.distributor_item_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mapping_id uuid NOT NULL,
  product_id uuid,
  category_id uuid,
  product_name text,
  category_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid,
  location_name text NOT NULL,
  address text,
  city text,
  state text,
  pincode text,
  is_head_office boolean DEFAULT false,
  contact_phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.distributor_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(12,2) NOT NULL,
  payment_mode text NOT NULL DEFAULT 'cash'::text,
  reference_number text,
  cheque_number text,
  cheque_date date,
  bank_name text,
  notes text,
  status text NOT NULL DEFAULT 'confirmed'::text,
  receipt_number text,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_price_books (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  price_book_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  assigned_by uuid,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  deactivated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_retailer_credit_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  credit_days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_retailer_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  feedback_type text NOT NULL DEFAULT 'general'::text,
  rating integer NOT NULL DEFAULT 5,
  product_quality_rating integer,
  delivery_rating integer,
  service_rating integer,
  comments text,
  follow_up_required boolean NOT NULL DEFAULT false,
  follow_up_notes text,
  follow_up_completed boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_retailer_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  transaction_type text NOT NULL,
  reference_id text,
  reference_number text,
  description text,
  debit_amount numeric(12,2) NOT NULL DEFAULT 0,
  credit_amount numeric(12,2) NOT NULL DEFAULT 0,
  running_balance numeric(12,2),
  payment_mode text,
  notes text,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_retailer_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  user_id uuid NOT NULL,
  mapping_type text NOT NULL DEFAULT 'all_items'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_return_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit text,
  unit_price numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  reason text NOT NULL,
  condition text NOT NULL DEFAULT 'good'::text,
  batch_number text,
  notes text,
  added_to_stock boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_returns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  return_number text NOT NULL,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  order_id uuid,
  order_number text,
  total_quantity integer DEFAULT 0,
  total_value numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  notes text,
  verified_by uuid,
  verified_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_secondary_invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  product_name text NOT NULL,
  hsn_code text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'Piece'::text,
  rate numeric NOT NULL DEFAULT 0,
  taxable_amount numeric NOT NULL DEFAULT 0,
  sgst_amount numeric NOT NULL DEFAULT 0,
  cgst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_secondary_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  order_id uuid,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric NOT NULL DEFAULT 0,
  sgst_amount numeric NOT NULL DEFAULT 0,
  cgst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  balance_due numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'issued'::text,
  notes text,
  pdf_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_support_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  created_by_user_id uuid,
  ticket_number text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium'::text,
  subject text NOT NULL,
  description text NOT NULL,
  reference_type text,
  reference_id uuid,
  reference_number text,
  attachment_urls text[] DEFAULT '{}'::text[],
  screenshot_urls text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'open'::text,
  assigned_to uuid,
  assigned_at timestamp with time zone,
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  satisfaction_rating integer,
  feedback_comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.distributor_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  level integer NOT NULL DEFAULT 1,
  parent_allowed boolean NOT NULL DEFAULT false,
  parent_type_code text,
  sort_order integer NOT NULL DEFAULT 0,
  legacy_mapping text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.distributor_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'staff'::text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  designation text,
  user_level text DEFAULT 'staff'::text,
  requested_at timestamp with time zone DEFAULT now(),
  approved_at timestamp with time zone,
  approved_by uuid,
  user_status text NOT NULL DEFAULT 'initiated'::text,
  auth_user_id uuid,
  email_sent_at timestamp with time zone,
  password_set_at timestamp with time zone
);

CREATE TABLE public.distributors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  territory_id uuid,
  status text NOT NULL DEFAULT 'active'::text,
  credit_limit numeric DEFAULT 0,
  outstanding_amount numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  gst_number text,
  parent_type text,
  parent_id uuid,
  distributor_status text DEFAULT 'active'::text,
  established_year integer,
  products_distributed text[],
  other_products text[],
  assets_trucks integer DEFAULT 0,
  assets_vans integer DEFAULT 0,
  sales_team_size integer DEFAULT 0,
  coverage_area text,
  annual_revenue numeric,
  profitability text,
  business_hunger text,
  about_business text,
  distribution_level text DEFAULT 'distributor'::text,
  onboarding_date date,
  years_of_relationship integer DEFAULT 0,
  strength text,
  weakness text,
  opportunities text,
  threats text,
  partnership_status text DEFAULT 'registered'::text,
  drop_reason text,
  competition_products text[],
  network_retailers_count integer DEFAULT 0,
  distribution_experience_years integer DEFAULT 0,
  evaluation_checklist jsonb DEFAULT '{}'::jsonb,
  region_coverage text,
  owner_id uuid,
  owner_name text,
  bank_name text,
  bank_account text,
  ifsc text,
  account_holder_name text,
  logo_url text,
  qr_code_url text,
  qr_upi text,
  terms_conditions text,
  state text,
  type_id uuid
);

CREATE TABLE public.district_intelligence_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  state text NOT NULL,
  district text NOT NULL,
  counts jsonb NOT NULL,
  ai_summary text NOT NULL,
  bbox jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '30 days'::interval)
);

CREATE TABLE public.education_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  institution_name text NOT NULL,
  degree text,
  field_of_study text,
  from_date date,
  to_date date,
  grade text,
  activities text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.emergency_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_name text NOT NULL,
  relationship text,
  phone text,
  alternate_phone text,
  address text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.employee_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_name text NOT NULL,
  badge_description text,
  badge_type text NOT NULL,
  badge_icon text,
  issued_by uuid,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_competencies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competency_id uuid NOT NULL,
  current_level text NOT NULL,
  assessed_by uuid,
  assessed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doc_type public.employee_doc_type NOT NULL,
  file_path text NOT NULL,
  file_name text,
  content_type text,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recommender_id uuid NOT NULL,
  recommendation_text text NOT NULL,
  relationship text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.employees (
  user_id uuid NOT NULL,
  monthly_salary numeric DEFAULT 0,
  daily_da_allowance numeric DEFAULT 0,
  manager_id uuid,
  hq text,
  date_of_joining date,
  date_of_exit date,
  alternate_email text,
  address text,
  education text,
  emergency_contact_number text,
  photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  education_background jsonb,
  certifications jsonb,
  aadhar_document_url text,
  pan_document_url text,
  expertise_areas text[],
  secondary_manager_id uuid,
  band integer,
  district_territory_id uuid,
  state_territory_id uuid,
  hq_territory_id uuid
);

CREATE TABLE public.enabled_units (
  uom_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  display_order integer NOT NULL DEFAULT 0,
  is_default_sales boolean NOT NULL DEFAULT false,
  is_default_purchase boolean NOT NULL DEFAULT false
);

CREATE TABLE public.expense_approval_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  condition_type text NOT NULL,
  condition_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  workflow_id uuid NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  receipt_required boolean NOT NULL DEFAULT false,
  limit_amount numeric,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  ta_type text DEFAULT 'from_beat'::text,
  fixed_ta_amount numeric DEFAULT 0,
  da_amount numeric DEFAULT 0,
  ta_per_km_rate numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_master_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ta_type text NOT NULL DEFAULT 'from_beat'::text,
  fixed_ta_amount numeric DEFAULT 0,
  da_amount numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  max_additional_expense_per_day numeric DEFAULT 0,
  max_additional_expense_per_month numeric DEFAULT 0,
  require_bill_above_amount numeric DEFAULT 500,
  allowed_categories text[] DEFAULT ARRAY['food'::text, 'travel'::text, 'accommodation'::text, 'communication'::text, 'other'::text],
  da_calculation_basis text DEFAULT 'per_day'::text,
  ta_per_km_rate numeric DEFAULT 0,
  expense_policy_notes text DEFAULT ''::text
);

CREATE TABLE public.external_retailer_list_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL,
  external_retailer_id bigint NOT NULL,
  pincode text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.external_retailer_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.feature_flag_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  feature_flag_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  old_value boolean NOT NULL,
  new_value boolean NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.feature_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  feature_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general'::text,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.feedback_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  module text NOT NULL DEFAULT 'visit'::text,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.feedback_policy_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL,
  condition_type text NOT NULL,
  condition_operator text NOT NULL DEFAULT 'every_n'::text,
  condition_value text NOT NULL DEFAULT '5'::text,
  action_type text NOT NULL DEFAULT 'mandatory_feedback'::text,
  question_set_module text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.feedback_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module text NOT NULL DEFAULT 'visit'::text,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'rating'::text,
  options jsonb,
  is_required boolean NOT NULL DEFAULT true,
  applies_to text NOT NULL DEFAULT 'all'::text,
  retailer_ids uuid[],
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.fy_period_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fy_config_id uuid NOT NULL,
  period_type text NOT NULL,
  period_number integer NOT NULL,
  period_name text NOT NULL,
  quantity_target numeric DEFAULT 0,
  revenue_target numeric DEFAULT 0,
  visits_target integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.fy_target_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fy_year integer NOT NULL,
  enable_quantity boolean DEFAULT true,
  enable_revenue boolean DEFAULT true,
  enable_visits boolean DEFAULT false,
  quantity_unit text DEFAULT 'Kg'::text,
  enabled_parameters jsonb DEFAULT '{"beat": true, "monthly": true, "product": true, "retailer": true, "territory": true, "distributor": true}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  total_quantity_target numeric DEFAULT 0,
  total_revenue_target numeric DEFAULT 0,
  total_visits_target integer DEFAULT 0,
  setup_completed boolean DEFAULT false,
  target_plan_name text DEFAULT 'FY Sales Plan'::text,
  is_locked boolean DEFAULT false,
  target_period_type text DEFAULT 'annual'::text,
  target_start_month integer NOT NULL DEFAULT 1,
  target_end_month integer NOT NULL DEFAULT 12,
  plan_status text NOT NULL DEFAULT 'draft'::text,
  enable_retailer_activation boolean NOT NULL DEFAULT false,
  total_retailer_activation_target numeric DEFAULT 0
);

CREATE TABLE public.gamification_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  action_type text NOT NULL,
  action_name text NOT NULL,
  points numeric NOT NULL DEFAULT 0,
  is_enabled boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  max_awardable_activities integer,
  base_daily_target numeric,
  focused_products text[],
  max_daily_awards integer,
  consecutive_orders_required integer,
  min_growth_percentage numeric,
  target_type text DEFAULT 'orders'::text
);

CREATE TABLE public.gamification_daily_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_id uuid NOT NULL,
  tracking_date date NOT NULL,
  count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.gamification_games (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  territories text[] DEFAULT '{}'::text[],
  is_all_territories boolean DEFAULT false,
  baseline_target numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  points_to_rupee_conversion numeric NOT NULL DEFAULT 1.0
);

CREATE TABLE public.gamification_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action_id uuid NOT NULL,
  points numeric NOT NULL,
  reference_type text,
  reference_id uuid,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public.gamification_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_id uuid,
  points_redeemed numeric NOT NULL,
  voucher_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid,
  voucher_code text,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.gamification_retailer_sequences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  consecutive_orders integer DEFAULT 0,
  last_order_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.geocoding_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'processing'::text,
  total_records integer NOT NULL DEFAULT 0,
  processed_records integer NOT NULL DEFAULT 0,
  geocoded_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.global_leave_policy (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  reset_cycle text NOT NULL DEFAULT 'calendar_year'::text,
  custom_reset_date date,
  allow_negative_balance boolean NOT NULL DEFAULT false,
  max_negative_limit integer NOT NULL DEFAULT 0,
  enable_carry_forward boolean NOT NULL DEFAULT false,
  max_carry_forward_limit integer NOT NULL DEFAULT 0,
  carry_forward_expiry_months integer,
  min_notice_period_days integer NOT NULL DEFAULT 0,
  max_continuous_leave_days integer,
  allow_backdated_leave boolean NOT NULL DEFAULT false,
  max_backdate_days integer NOT NULL DEFAULT 0,
  enable_half_day boolean NOT NULL DEFAULT true,
  enable_sandwich_rule boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.goods_receipt_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grn_number text NOT NULL,
  order_id uuid NOT NULL,
  distributor_id uuid NOT NULL,
  receipt_type text NOT NULL DEFAULT 'full'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  received_at timestamp with time zone,
  confirmed_at timestamp with time zone,
  confirmed_by text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.gps_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  latitude numeric(10,8) NOT NULL,
  longitude numeric(11,8) NOT NULL,
  accuracy numeric(10,2),
  "timestamp" timestamp with time zone NOT NULL DEFAULT now(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  speed numeric(10,2),
  heading numeric(10,2),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.gps_tracking_stops (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stopped_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.grn_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grn_id uuid NOT NULL,
  order_item_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  product_name text NOT NULL,
  variant_name text,
  ordered_quantity numeric NOT NULL DEFAULT 0,
  received_quantity numeric NOT NULL DEFAULT 0,
  returned_quantity numeric NOT NULL DEFAULT 0,
  return_reason text,
  damaged_quantity numeric NOT NULL DEFAULT 0,
  batch_number text,
  expiry_date date,
  unit text NOT NULL DEFAULT 'pcs'::text,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  received_base_qty numeric,
  returned_base_qty numeric,
  conversion_to_base numeric,
  uom_code text,
  uom_id uuid
);

CREATE TABLE public.hierarchy_target_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  hierarchy_target_id uuid NOT NULL,
  user_id uuid NOT NULL,
  manager_id uuid,
  level integer NOT NULL DEFAULT 0,
  allocation_percentage numeric NOT NULL DEFAULT 0,
  quantity_target numeric NOT NULL DEFAULT 0,
  revenue_target numeric NOT NULL DEFAULT 0,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  allocation_method text DEFAULT 'inherited'::text,
  is_synced_to_my_target boolean DEFAULT false,
  synced_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.hierarchy_target_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  hierarchy_target_id uuid,
  user_id uuid,
  change_type text NOT NULL,
  previous_target jsonb,
  new_target jsonb,
  affected_users uuid[],
  reason text,
  changed_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.hierarchy_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  root_user_id uuid NOT NULL,
  fy_year integer NOT NULL,
  total_quantity_target numeric NOT NULL DEFAULT 0,
  quantity_unit text DEFAULT 'Kg'::text,
  total_revenue_target numeric NOT NULL DEFAULT 0,
  allocation_method text NOT NULL DEFAULT 'equal'::text,
  status text DEFAULT 'draft'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  target_plan_id uuid
);

CREATE TABLE public.holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  holiday_name text NOT NULL,
  description text,
  year integer NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  account_type text DEFAULT 'institutional'::text,
  industry text,
  annual_revenue numeric DEFAULT 0,
  employee_count integer,
  billing_address text,
  shipping_address text,
  city text,
  state text,
  pincode text,
  gst_number text,
  pan_number text,
  website text,
  phone text,
  email text,
  account_owner uuid,
  parent_account_id uuid,
  credit_limit numeric DEFAULT 0,
  payment_terms integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_collections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  collection_number text NOT NULL,
  invoice_id uuid NOT NULL,
  account_id uuid NOT NULL,
  collection_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash'::text,
  reference_number text,
  cheque_number text,
  bank_name text,
  status text DEFAULT 'cleared'::text,
  notes text,
  collected_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  mobile text,
  designation text,
  department text,
  is_primary_contact boolean DEFAULT false,
  is_decision_maker boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_invoice_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  product_id uuid NOT NULL,
  commitment_line_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  order_commitment_id uuid,
  account_id uuid NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  balance_amount numeric DEFAULT 0,
  status text DEFAULT 'draft'::text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_name text NOT NULL,
  company_name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  pincode text,
  lead_source text DEFAULT 'direct'::text,
  lead_status text DEFAULT 'new'::text,
  annual_potential_value numeric DEFAULT 0,
  industry_type text,
  notes text,
  assigned_to uuid,
  created_by uuid NOT NULL,
  converted_account_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_opportunities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  opportunity_name text NOT NULL,
  stage text DEFAULT 'prospecting'::text,
  amount numeric DEFAULT 0,
  probability integer DEFAULT 10,
  expected_close_date date,
  lead_source text,
  owner_id uuid,
  contact_id uuid,
  description text,
  next_step text,
  competitors text,
  closed_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_order_commitment_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_commitment_id uuid NOT NULL,
  product_id uuid NOT NULL,
  planned_quantity integer NOT NULL DEFAULT 0,
  actual_quantity integer DEFAULT 0,
  delivered_quantity integer DEFAULT 0,
  planned_delivery_date date,
  actual_delivery_date date,
  unit_price numeric NOT NULL DEFAULT 0,
  planned_value numeric DEFAULT 0,
  actual_value numeric DEFAULT 0,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_order_commitments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  commitment_number text NOT NULL,
  opportunity_id uuid,
  quote_id uuid,
  account_id uuid NOT NULL,
  commitment_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_start_date date,
  delivery_end_date date,
  status text DEFAULT 'draft'::text,
  total_planned_value numeric DEFAULT 0,
  total_actual_value numeric DEFAULT 0,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_price_book_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  price_book_id uuid NOT NULL,
  product_id uuid NOT NULL,
  list_price numeric NOT NULL DEFAULT 0,
  discount_percentage numeric DEFAULT 0,
  final_price numeric NOT NULL DEFAULT 0,
  min_quantity integer DEFAULT 1,
  max_quantity integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_price_books (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  price_book_name text NOT NULL,
  account_id uuid,
  is_standard boolean DEFAULT false,
  effective_from date,
  effective_to date,
  currency text DEFAULT 'INR'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_code text NOT NULL,
  product_name text NOT NULL,
  description text,
  category text,
  unit text DEFAULT 'Piece'::text,
  base_price numeric NOT NULL DEFAULT 0,
  min_order_quantity integer DEFAULT 1,
  is_active boolean DEFAULT true,
  hsn_code text,
  gst_rate numeric DEFAULT 18,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_quote_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_percentage numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_rate numeric DEFAULT 18,
  tax_amount numeric DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inst_quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quote_number text NOT NULL,
  opportunity_id uuid,
  account_id uuid NOT NULL,
  contact_id uuid,
  price_book_id uuid,
  quote_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  status text DEFAULT 'draft'::text,
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  terms_and_conditions text,
  notes text,
  created_by uuid NOT NULL,
  approved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  product_id uuid NOT NULL,
  batch_no text NOT NULL,
  expiry_date date,
  available_qty integer NOT NULL DEFAULT 0,
  reserved_qty integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  warehouse_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  system_batch_code text,
  supplier_batch_code text,
  mfg_date date
);

CREATE TABLE public.inventory_valuation_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  valuation_method text NOT NULL DEFAULT 'none'::text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.invoice_display_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  setting_category text NOT NULL,
  display_label text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_document_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  description text NOT NULL,
  hsn_sac text,
  quantity numeric(14,3) DEFAULT 0,
  unit text DEFAULT 'Piece'::text,
  price_per_unit numeric(14,2) DEFAULT 0,
  gst_rate numeric(5,2) DEFAULT 0,
  taxable_amount numeric(14,2) DEFAULT 0,
  cgst_amount numeric(14,2) DEFAULT 0,
  sgst_amount numeric(14,2) DEFAULT 0,
  total_amount numeric(14,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  company_id uuid,
  customer_id uuid,
  invoice_date date NOT NULL,
  due_date date,
  place_of_supply text,
  vehicle_number text,
  sub_total numeric(14,2) DEFAULT 0,
  total_tax numeric(14,2) DEFAULT 0,
  total_amount numeric(14,2) DEFAULT 0,
  amount_in_words text,
  terms text,
  status text DEFAULT 'draft'::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  order_id uuid,
  is_edited boolean DEFAULT false
);

CREATE TABLE public.joint_sales_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  visit_id uuid,
  retailer_id uuid NOT NULL,
  manager_id uuid NOT NULL,
  fse_user_id uuid NOT NULL,
  beat_plan_id uuid,
  feedback_date date NOT NULL DEFAULT CURRENT_DATE,
  branding_rating integer,
  retailing_rating integer,
  pricing_feedback_rating integer,
  schemes_rating integer,
  competition_rating integer,
  product_feedback_rating integer,
  sampling_rating integer,
  distributor_feedback_rating integer,
  sales_trends_rating integer,
  future_growth_rating integer,
  branding_status text,
  shelf_visibility text,
  pricing_compliance text,
  scheme_awareness text,
  competition_presence text,
  sampling_status text,
  distributor_service text,
  sales_trend text,
  growth_potential text,
  retailer_notes text,
  conversation_highlights text,
  action_items text,
  additional_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  retailing_feedback text,
  placement_feedback text,
  sales_increase_feedback text,
  new_products_introduced text,
  competition_knowledge text,
  trends_feedback text,
  product_quality_feedback text,
  service_feedback text,
  schemes_feedback text,
  pricing_feedback text,
  consumer_feedback text,
  joint_sales_impact text,
  order_increase_amount numeric(10,2) DEFAULT 0,
  product_packaging_feedback text,
  product_sku_range_feedback text,
  promotion_vs_competition text,
  product_usp_feedback text,
  willingness_to_grow_range text,
  monthly_potential_6months numeric DEFAULT 0
);

CREATE TABLE public.joint_sales_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  fse_user_id uuid NOT NULL,
  beat_plan_id uuid,
  session_date date NOT NULL,
  beat_id text,
  beat_name text,
  total_retailers_visited integer DEFAULT 0,
  total_feedback_captured integer DEFAULT 0,
  session_start_time timestamp with time zone,
  session_end_time timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.leave_accrual_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  year integer NOT NULL,
  month integer,
  accrual_type text,
  days_credited numeric NOT NULL DEFAULT 0,
  days_debited numeric DEFAULT 0,
  balance_after numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.leave_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  applied_date timestamp with time zone NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_date timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  days_requested numeric DEFAULT 0,
  is_half_day boolean DEFAULT false,
  half_day_period text,
  is_lop boolean DEFAULT false,
  lop_days numeric DEFAULT 0,
  proof_document_url text,
  attendance_marked boolean DEFAULT false,
  sandwich_days_added integer DEFAULT 0,
  current_approval_level integer DEFAULT 1,
  final_approved_by uuid
);

CREATE TABLE public.leave_approval_workflow (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  leave_type_id uuid,
  approval_level integer NOT NULL DEFAULT 1,
  approver_type text,
  approver_user_id uuid,
  min_days_trigger integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.leave_balance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  year integer NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE),
  opening_balance numeric(10,2) NOT NULL DEFAULT 0,
  used_balance numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  remaining_balance numeric(10,2)
);

CREATE TABLE public.leave_holidays_bridge (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  leave_application_id uuid,
  holiday_date date NOT NULL,
  is_sandwich_day boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.leave_policy (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  leave_type_id uuid NOT NULL,
  yearly_entitlement integer NOT NULL DEFAULT 12,
  monthly_accrual numeric(5,2) DEFAULT NULL::numeric,
  accrual_type text NOT NULL DEFAULT 'yearly'::text,
  carry_forward_allowed boolean DEFAULT false,
  max_carry_forward integer DEFAULT 0,
  applicable_from date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  max_leaves_per_month integer,
  backdated_days_allowed integer DEFAULT 0,
  sandwich_rule_enabled boolean DEFAULT false,
  negative_balance_allowed boolean DEFAULT false,
  auto_approval_threshold integer DEFAULT 0,
  min_days_advance_notice integer DEFAULT 0,
  probation_applicable boolean DEFAULT true,
  encashment_allowed boolean DEFAULT false,
  encashment_limit integer DEFAULT 0,
  last_update_mode text DEFAULT 'next_month'::text,
  last_update_effective_date date
);

CREATE TABLE public.leave_type_policy_override (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  leave_type_id uuid NOT NULL,
  override_enabled boolean NOT NULL DEFAULT false,
  allow_negative_balance boolean,
  max_negative_limit integer,
  enable_carry_forward boolean,
  max_carry_forward_limit integer,
  carry_forward_expiry_months integer,
  custom_reset_cycle text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.leave_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  code text,
  yearly_limit integer DEFAULT 12,
  allow_half_day boolean DEFAULT true,
  proof_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  color text DEFAULT '#3b82f6'::text,
  sort_order integer DEFAULT 0
);

CREATE TABLE public.license_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  license_type text NOT NULL DEFAULT 'full_suite'::text,
  field_sales_enabled boolean DEFAULT true,
  institutional_sales_enabled boolean DEFAULT true,
  max_users integer DEFAULT 100,
  valid_until date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.module_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_name text NOT NULL,
  module_category text NOT NULL DEFAULT 'core'::text,
  route_path text NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  duration_seconds integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_event_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_code text NOT NULL,
  source_table text NOT NULL,
  record_id text NOT NULL,
  actor_user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_event_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_code text NOT NULL,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_type text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_code text NOT NULL,
  source_table text NOT NULL,
  title_template text NOT NULL DEFAULT ''::text,
  message_template text NOT NULL DEFAULT ''::text,
  receiver_type text NOT NULL DEFAULT 'employee'::text,
  receiver_user_id uuid,
  notification_channel text NOT NULL DEFAULT 'in_app'::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info'::text,
  is_read boolean DEFAULT false,
  related_table text,
  related_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  retailer_id uuid,
  target_portal text
);

CREATE TABLE public.onboarding_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  description text,
  category text,
  requires_attachment boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.opening_stock_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.order_cancellation_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  reason text,
  cancelled_by uuid,
  cancelled_at timestamp with time zone NOT NULL DEFAULT now(),
  reversal_summary jsonb
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id text NOT NULL,
  product_name text NOT NULL,
  category text NOT NULL,
  rate numeric(10,2) NOT NULL,
  unit text NOT NULL,
  quantity integer NOT NULL,
  total numeric(10,2) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  original_rate numeric,
  discount_amount numeric DEFAULT 0,
  hsn_code text,
  sgst_amount numeric DEFAULT 0,
  cgst_amount numeric DEFAULT 0,
  backorder_qty integer DEFAULT 0,
  uom_id uuid,
  uom_code text,
  conversion_to_base numeric
);

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  visit_id uuid,
  retailer_name text NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  discount_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  retailer_id uuid,
  distributor_id uuid,
  distributor_name text,
  is_credit_order boolean DEFAULT false,
  credit_pending_amount numeric(10,2) DEFAULT 0,
  credit_paid_amount numeric(10,2) DEFAULT 0,
  previous_pending_cleared numeric DEFAULT 0,
  payment_method text,
  payment_proof_url text,
  upi_last_four_code text,
  invoice_number text,
  order_date date,
  idempotency_key text,
  delivery_date date,
  packing_list_id uuid,
  assigned_agent_id uuid,
  assigned_van_id uuid,
  picked_at timestamp with time zone,
  dispatched_at timestamp with time zone,
  delivered_at timestamp with time zone,
  delivery_status text DEFAULT 'pending'::text,
  delivery_proof_url text,
  delivery_notes text,
  short_items jsonb,
  payment_status text DEFAULT 'pending'::text,
  delivery_payment_method text,
  amount_collected numeric(12,2) DEFAULT 0,
  invoice_generated_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  cancelled_by uuid,
  beat_id text,
  territory_id text,
  order_source text,
  parent_order_id uuid,
  is_backorder boolean DEFAULT false,
  event_id uuid
);

CREATE TABLE public.orders_total_amount (
  total_amount numeric(10,2)
);

CREATE TABLE public.packing_list_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  packing_list_id uuid NOT NULL,
  agent_id uuid,
  van_id text,
  beat_ids text[],
  territory_ids text[],
  order_count integer NOT NULL DEFAULT 0,
  total_load_qty numeric NOT NULL DEFAULT 0,
  total_load_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'assigned'::text,
  dispatched_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.packing_list_item_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  packing_list_item_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  batch_number text,
  expiry_date date,
  allocated_qty numeric NOT NULL DEFAULT 0,
  picked_qty numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  packed_qty numeric NOT NULL DEFAULT 0,
  packed_at timestamp with time zone,
  packed_by uuid
);

CREATE TABLE public.packing_list_item_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  packing_list_item_id uuid NOT NULL,
  order_id uuid,
  order_item_id uuid,
  product_id uuid,
  allocated_qty numeric NOT NULL DEFAULT 0,
  backorder_qty numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.packing_list_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  unit text,
  ordered_qty numeric NOT NULL DEFAULT 0,
  picked_qty numeric NOT NULL DEFAULT 0,
  short_qty numeric NOT NULL DEFAULT 0,
  batch_number text,
  expiry_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_qty numeric DEFAULT 0,
  packing_list_id uuid,
  uom_id uuid,
  uom_code text,
  conversion_to_base numeric,
  base_qty numeric
);

CREATE TABLE public.packing_list_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  packing_list_id uuid NOT NULL,
  order_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.packing_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  packing_list_number text NOT NULL DEFAULT ''::text,
  delivery_date date NOT NULL,
  distributor_id uuid,
  created_by uuid,
  status text NOT NULL DEFAULT 'draft'::text,
  total_value numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  order_type text NOT NULL DEFAULT 'secondary'::text,
  route_id uuid,
  total_items integer NOT NULL DEFAULT 0,
  warehouse_id uuid
);

CREATE TABLE public.password_reset_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  was_successful boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text
);

CREATE TABLE public.password_reset_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  method text NOT NULL DEFAULT 'sms'::text,
  phone_number text,
  expires_at timestamp with time zone NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.performance_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  self_comment text,
  self_rating numeric,
  manager_comment text,
  manager_rating numeric,
  manager_id uuid,
  hr_comment text,
  hr_rating numeric,
  hr_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.performance_module_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  active_module text NOT NULL DEFAULT 'none'::text,
  rating_thresholds jsonb DEFAULT '{"good": 80, "average": 60, "excellent": 100, "needs_improvement": 0}'::jsonb,
  enabled_periods text[] DEFAULT ARRAY['month'::text, 'quarter'::text, 'year'::text],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.permanent_deletion_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_table text NOT NULL,
  original_id text NOT NULL,
  record_data jsonb NOT NULL,
  module_name text NOT NULL,
  record_name text,
  deleted_from_bin_by uuid NOT NULL,
  deleted_from_bin_at timestamp with time zone NOT NULL DEFAULT now(),
  original_deleted_by uuid NOT NULL,
  original_deleted_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.permission_set_group_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  object_name text NOT NULL,
  can_read boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_view_all boolean NOT NULL DEFAULT false,
  can_modify_all boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.permission_set_group_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.permission_set_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.petty_cash_funds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  allocated_amount numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  status text NOT NULL DEFAULT 'active'::text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.petty_cash_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL,
  max_per_transaction numeric,
  max_per_day numeric,
  require_bill_above numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.petty_cash_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'misc'::text,
  description text,
  bill_url text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft'::text,
  approved_by uuid,
  approved_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pincode_master (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  officename text NOT NULL,
  territory_po text,
  pincode text NOT NULL,
  district text,
  statename text,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  taluka text DEFAULT 'Not available'::text,
  is_custom_area boolean NOT NULL DEFAULT false
);

CREATE TABLE public.pincode_top_retailers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pincode text NOT NULL,
  rank integer NOT NULL,
  place_id text,
  name text NOT NULL,
  address text,
  rating numeric,
  user_ratings_total integer,
  latitude double precision,
  longitude double precision,
  score numeric,
  source text NOT NULL DEFAULT 'google_places'::text,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  opening_hours jsonb,
  open_now boolean,
  hours_fetched_at timestamp with time zone
);

CREATE TABLE public.plan_enabled_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fy_config_id uuid NOT NULL,
  metric_id uuid NOT NULL,
  total_target numeric DEFAULT 0,
  unit_override text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.pm_ai_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  insight_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  created_by uuid
);

CREATE TABLE public.pm_ideas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  submitted_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'submitted'::text,
  priority text DEFAULT 'medium'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ai_evaluation jsonb
);

CREATE TABLE public.pm_knowledge_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  document_name text NOT NULL,
  description text,
  file_url text,
  file_name text,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  due_date date,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  color text DEFAULT '#f59e0b'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_project_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.pm_member_role NOT NULL DEFAULT 'developer'::pm_member_role,
  joined_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_project_resources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'developer'::text,
  budget_allocated numeric DEFAULT 0,
  selling_rate numeric DEFAULT 0,
  cost_rate numeric DEFAULT 0,
  start_date date,
  release_date date,
  deployment_type text NOT NULL DEFAULT 'full_time'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status public.pm_project_status NOT NULL DEFAULT 'planning'::pm_project_status,
  priority public.pm_priority NOT NULL DEFAULT 'medium'::pm_priority,
  owner_id uuid,
  start_date date,
  end_date date,
  estimated_hours numeric(10,2),
  logged_hours numeric(10,2) DEFAULT 0,
  budget numeric(15,2),
  color text DEFAULT '#6366f1'::text,
  is_template boolean DEFAULT false,
  template_name text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  source_template_id uuid
);

CREATE TABLE public.pm_risks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  probability text DEFAULT 'medium'::text,
  impact text DEFAULT 'medium'::text,
  status text DEFAULT 'open'::text,
  mitigation_plan text,
  owner_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ai_generated boolean DEFAULT false
);

CREATE TABLE public.pm_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  color text DEFAULT '#6B7280'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_sprints (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  goal text,
  status public.pm_sprint_status NOT NULL DEFAULT 'planning'::pm_sprint_status,
  start_date date,
  end_date date,
  velocity integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_support_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  priority text DEFAULT 'medium'::text,
  resolution_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ai_suggestion text
);

CREATE TABLE public.pm_task_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  file_type text,
  note text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_task_collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_task_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_task_dependencies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  depends_on_task_id uuid NOT NULL,
  dependency_type text DEFAULT 'finish_to_start'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_task_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_template_id uuid,
  title text NOT NULL,
  description text,
  type public.pm_task_type NOT NULL DEFAULT 'task'::pm_task_type,
  priority public.pm_priority NOT NULL DEFAULT 'medium'::pm_priority,
  estimated_hours numeric(8,2),
  sort_order integer DEFAULT 0,
  tags text[],
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  sprint_id uuid,
  milestone_id uuid,
  parent_task_id uuid,
  title text NOT NULL,
  description text,
  type public.pm_task_type NOT NULL DEFAULT 'task'::pm_task_type,
  status public.pm_task_status NOT NULL DEFAULT 'todo'::pm_task_status,
  priority public.pm_priority NOT NULL DEFAULT 'medium'::pm_priority,
  assignee_id uuid,
  reporter_id uuid,
  start_date date,
  due_date date,
  estimated_hours numeric(8,2),
  logged_hours numeric(8,2) DEFAULT 0,
  story_points integer,
  sort_order integer DEFAULT 0,
  tags text[],
  is_blocked boolean DEFAULT false,
  block_reason text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  section_id uuid,
  collaborator_id uuid
);

CREATE TABLE public.pm_template_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  task_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  file_type text,
  note text,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_template_dependencies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  task_id uuid NOT NULL,
  depends_on_task_id uuid NOT NULL,
  dependency_type text NOT NULL DEFAULT 'blocked_by'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_template_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  name text NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_template_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  section_id uuid,
  parent_task_id uuid,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'task'::text,
  priority text NOT NULL DEFAULT 'medium'::text,
  duration_days integer NOT NULL DEFAULT 1,
  estimated_hours numeric,
  sort_order integer NOT NULL DEFAULT 0,
  tags text[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_time_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  hours numeric(6,2) NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  allocation text NOT NULL DEFAULT 'billable'::text,
  work_type text
);

CREATE TABLE public.pos_customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  area text,
  city text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.price_book_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  price_book_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  list_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  final_price numeric NOT NULL DEFAULT 0,
  min_quantity integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  uom text,
  uom_id uuid
);

CREATE TABLE public.price_books (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_book_type text NOT NULL DEFAULT 'standard'::text,
  currency text DEFAULT 'INR'::text,
  is_standard boolean DEFAULT false,
  is_active boolean DEFAULT true,
  effective_from date,
  effective_to date,
  territory_id uuid,
  distributor_category text,
  cloned_from uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  target_type text DEFAULT 'distributor'::text,
  apply_to_all_territories boolean DEFAULT false
);

CREATE TABLE public.primary_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  order_id uuid NOT NULL,
  distributor_id uuid NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'::text,
  finalized_at timestamp with time zone,
  finalized_by text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.primary_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  product_name text NOT NULL,
  variant_name text,
  sku text,
  quantity integer NOT NULL DEFAULT 0,
  received_quantity integer DEFAULT 0,
  damaged_quantity integer DEFAULT 0,
  unit text NOT NULL DEFAULT 'pieces'::text,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  tax_percent numeric DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  batch_number text,
  expiry_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_qty integer,
  rejected_qty integer DEFAULT 0,
  backorder_qty integer DEFAULT 0,
  uom_id uuid,
  uom_code text,
  conversion_to_base numeric,
  base_qty numeric,
  ordered_qty numeric
);

CREATE TABLE public.primary_order_schemes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  scheme_id uuid NOT NULL,
  scheme_name text NOT NULL,
  scheme_type text NOT NULL,
  discount_amount numeric DEFAULT 0,
  free_quantity numeric DEFAULT 0,
  free_product_name text,
  applied_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.primary_order_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  notes text,
  changed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.primary_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  distributor_id uuid NOT NULL,
  created_by_user_id uuid,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  actual_delivery_date date,
  status text NOT NULL DEFAULT 'draft'::text,
  subtotal numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_terms text DEFAULT 'net_30'::text,
  payment_status text NOT NULL DEFAULT 'pending'::text,
  shipping_address text,
  notes text,
  approved_by uuid,
  approved_at timestamp with time zone,
  dispatched_at timestamp with time zone,
  dispatch_reference text,
  transporter_name text,
  vehicle_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  source_distributor_id uuid NOT NULL,
  target_distributor_id uuid,
  packing_list_id uuid,
  parent_order_id uuid,
  is_backorder boolean DEFAULT false
);

CREATE TABLE public.primary_return_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  return_note_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  product_name text NOT NULL,
  variant_name text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs'::text,
  unit_price numeric NOT NULL DEFAULT 0,
  return_reason text NOT NULL,
  batch_number text,
  condition text DEFAULT 'damaged'::text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.primary_return_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  return_number text NOT NULL,
  order_id uuid,
  grn_id uuid,
  distributor_id uuid NOT NULL,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft'::text,
  total_return_value numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.primary_shipments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shipment_number text NOT NULL,
  order_id uuid NOT NULL,
  distributor_id uuid NOT NULL,
  invoice_id uuid,
  transporter_name text,
  vehicle_number text,
  driver_name text,
  driver_phone text,
  lr_number text,
  dispatch_date date,
  expected_delivery_date date,
  actual_delivery_date date,
  dispatch_warehouse text,
  status text NOT NULL DEFAULT 'pending'::text,
  tracking_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.product_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.product_price_list (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  uom_id uuid NOT NULL,
  rate numeric NOT NULL,
  is_default_price boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.product_schemes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  name text NOT NULL,
  description text,
  scheme_type text NOT NULL DEFAULT 'discount'::text,
  condition_quantity integer,
  discount_percentage numeric,
  discount_amount numeric,
  free_quantity integer,
  is_active boolean DEFAULT true,
  start_date date,
  end_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  variant_id uuid,
  quantity_condition_type text DEFAULT 'more_than'::text,
  bundle_product_ids text[] DEFAULT '{}'::text[],
  bundle_discount_amount numeric DEFAULT 0,
  bundle_discount_percentage numeric DEFAULT 0,
  tier_data jsonb DEFAULT '[]'::jsonb,
  category_id uuid,
  free_product_id uuid,
  buy_quantity integer DEFAULT 0,
  is_first_order_only boolean DEFAULT false,
  validity_days integer,
  min_order_value numeric DEFAULT 0,
  applicability_type text DEFAULT 'global'::text,
  priority integer DEFAULT 0,
  exclusion_group text,
  max_usage_count integer,
  current_usage_count integer DEFAULT 0,
  source text DEFAULT 'manual'::text,
  ai_suggestion_id uuid,
  target_product_ids uuid[],
  per_product_discounts jsonb,
  buy_quantity_unit text DEFAULT 'kg'::text,
  free_quantity_unit text DEFAULT 'kg'::text,
  show_in_portal boolean DEFAULT false
);

CREATE TABLE public.product_uom_mapping (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  uom_id uuid NOT NULL,
  conversion_to_base numeric NOT NULL,
  is_base boolean NOT NULL DEFAULT false,
  is_default_sales boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  is_price_basis boolean NOT NULL DEFAULT false,
  is_default_purchase boolean NOT NULL DEFAULT false
);

CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  variant_name text NOT NULL,
  sku text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  discount_percentage numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  barcode text,
  qr_code text,
  is_focused_product boolean DEFAULT false,
  focused_due_date date,
  focused_target_quantity integer DEFAULT 0,
  focused_territories text[],
  barcode_image_url text,
  focused_type text,
  focused_recurring_config jsonb,
  hsn_code text
);

CREATE TABLE public.productive_summary_daywise (
  planned_date text,
  productive_visits bigint,
  unproductive_visits bigint,
  total_visits bigint,
  productivity_percentage numeric
);

CREATE TABLE public.productive_summary_week (
  planned_date text,
  productive_visits bigint,
  unproductive_visits bigint,
  total_visits bigint,
  productivity_percentage numeric
);

CREATE TABLE public.productive_view (
  full_name text,
  productive_visits bigint,
  total_visits bigint,
  productivity_percentage numeric
);

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid,
  rate numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'piece'::text,
  closing_stock integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  product_number text,
  sku_image_url text,
  conversion_factor numeric DEFAULT 1,
  is_focused_product boolean DEFAULT false,
  focused_due_date date,
  focused_target_quantity integer,
  focused_territories text[],
  barcode text,
  qr_code text,
  barcode_image_url text,
  focused_type text,
  focused_recurring_config jsonb,
  hsn_code text,
  net_weight_g numeric,
  net_volume_ml numeric,
  base_unit_category text,
  price_basis_uom_id uuid,
  default_sales_uom_id uuid,
  brand text,
  gst_percentage numeric,
  default_purchase_uom_id uuid,
  opening_stock numeric DEFAULT 0,
  reorder_level numeric
);

CREATE TABLE public.profile_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  file_type text,
  description text,
  attached_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.profile_object_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid,
  object_name text NOT NULL,
  can_read boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_view_all boolean DEFAULT false,
  can_modify_all boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  permission_type text NOT NULL DEFAULT 'feature'::text,
  parent_module text
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL,
  full_name text NOT NULL,
  phone_number text,
  recovery_email text,
  hint_question text,
  hint_answer text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_status public.user_status DEFAULT 'active'::user_status,
  invitation_token text,
  profile_picture_url text,
  date_of_birth date,
  anniversary_date date,
  permanent_address text,
  current_address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  linkedin_url text,
  facebook_url text,
  instagram_url text,
  interests text[],
  aspirations text,
  learning_goals text[],
  work_location text,
  territories_covered text[],
  role_id uuid,
  onboarding_completed boolean DEFAULT false,
  onboarding_step integer DEFAULT 0,
  preferred_language varchar(5) DEFAULT 'en'::character varying,
  designation text,
  twitter_url text,
  must_change_password boolean DEFAULT false
);

CREATE TABLE public.push_content_execution_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid NOT NULL,
  execution_time timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL,
  error_message text,
  post_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.push_content_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid NOT NULL,
  subscription_id uuid,
  content text NOT NULL,
  generated_data jsonb,
  posted_at timestamp with time zone DEFAULT now(),
  is_published boolean DEFAULT true
);

CREATE TABLE public.push_content_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_type text NOT NULL,
  description text,
  content_structure jsonb NOT NULL,
  default_schedule_time time without time zone,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.recommendation_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  feedback_type text NOT NULL,
  feedback_note text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recommendation_type text NOT NULL,
  entity_id text,
  entity_name text,
  recommendation_data jsonb NOT NULL,
  confidence_score numeric(3,2),
  reasoning text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true
);

CREATE TABLE public.recycle_bin (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_table text NOT NULL,
  original_id text NOT NULL,
  record_data jsonb NOT NULL,
  deleted_by uuid NOT NULL,
  deleted_at timestamp with time zone NOT NULL DEFAULT now(),
  module_name text NOT NULL,
  record_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.recycle_bin_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auto_delete_days integer DEFAULT 30,
  is_enabled boolean DEFAULT true,
  show_deletion_log_to_users boolean DEFAULT false,
  require_confirmation boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.regularization_policy (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  monthly_limit integer,
  daily_limit integer NOT NULL DEFAULT 1,
  allow_checkin_edit boolean NOT NULL DEFAULT true,
  allow_checkout_edit boolean NOT NULL DEFAULT true,
  allow_status_edit boolean NOT NULL DEFAULT false,
  reason_mandatory boolean NOT NULL DEFAULT true,
  max_backdate_days integer NOT NULL DEFAULT 7,
  allow_previous_month boolean NOT NULL DEFAULT false,
  restrict_after_payroll_lock boolean NOT NULL DEFAULT false,
  approval_mode text NOT NULL DEFAULT 'manager'::text,
  update_attendance_on_approval boolean NOT NULL DEFAULT true,
  recalculate_hours boolean NOT NULL DEFAULT true,
  adjust_leave_balance boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.regularization_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attendance_date date NOT NULL,
  current_check_in_time timestamp with time zone,
  current_check_out_time timestamp with time zone,
  requested_check_in_time timestamp with time zone,
  requested_check_out_time timestamp with time zone,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  approved_by uuid,
  approved_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.retailer_credit_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL,
  score numeric(3,1) NOT NULL,
  credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  score_type text NOT NULL DEFAULT 'ai_driven'::text,
  growth_rate_score numeric(3,1),
  repayment_dso_score numeric(3,1),
  order_frequency_score numeric(3,1),
  avg_growth_rate numeric(10,2),
  avg_dso numeric(10,2),
  avg_order_frequency numeric(10,2),
  last_month_revenue numeric(12,2),
  calculated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.retailer_external_db (
  id bigint NOT NULL,
  company_name text NOT NULL,
  address text,
  city text NOT NULL,
  pincode text,
  state text NOT NULL,
  mobile text,
  email text,
  website text,
  category text,
  latitude double precision,
  longitude double precision,
  match_score integer,
  match_breakdown jsonb,
  is_converted boolean NOT NULL DEFAULT false,
  converted_retailer_id uuid,
  source text DEFAULT 'manual'::text
);

CREATE TABLE public.retailer_external_unsorted (
  state text NOT NULL,
  district text,
  city text NOT NULL,
  village text,
  company_name text NOT NULL,
  mobile text,
  pincode text,
  id bigint NOT NULL,
  category text,
  address text,
  address_confidence text,
  email text,
  website text,
  match_score integer,
  match_breakdown jsonb,
  is_converted boolean NOT NULL DEFAULT false,
  converted_retailer_id uuid,
  latitude double precision,
  longitude double precision
);

CREATE TABLE public.retailer_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  visit_id uuid,
  feedback_type text NOT NULL,
  rating integer,
  comments text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  product_packaging integer DEFAULT 0,
  product_sku_range integer DEFAULT 0,
  product_quality integer DEFAULT 0,
  product_placement integer DEFAULT 0,
  summary_notes text,
  score numeric DEFAULT 0,
  feedback_date date DEFAULT CURRENT_DATE,
  consumer_satisfaction integer DEFAULT 0
);

CREATE TABLE public.retailer_gift_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL,
  gift_id uuid,
  subscription_id uuid,
  points_redeemed integer NOT NULL,
  status text DEFAULT 'pending'::text,
  requested_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid,
  fulfillment_notes text,
  delivery_address text,
  voucher_code text,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.retailer_gift_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL,
  gift_id uuid,
  subscribed_at timestamp with time zone DEFAULT now(),
  target_date date,
  status text DEFAULT 'active'::text,
  progress_points integer DEFAULT 0,
  points_at_subscription integer DEFAULT 0,
  achieved_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.retailer_loyalty_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL,
  action_type text NOT NULL,
  action_name text NOT NULL,
  points numeric NOT NULL DEFAULT 0,
  is_enabled boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  target_config jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public.retailer_loyalty_balance (
  retailer_id uuid,
  total_points numeric,
  total_transactions bigint
);

CREATE TABLE public.retailer_loyalty_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL,
  fse_user_id uuid NOT NULL,
  feedback_type text NOT NULL,
  feedback_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.retailer_loyalty_gifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id uuid,
  gift_name text NOT NULL,
  description text,
  gift_type text NOT NULL,
  points_required integer NOT NULL,
  cash_equivalent numeric,
  image_url text,
  stock_quantity integer DEFAULT 0,
  is_limited_stock boolean DEFAULT false,
  target_description text,
  target_duration_months integer,
  minimum_monthly_orders integer,
  minimum_order_value numeric,
  eligibility_criteria jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.retailer_loyalty_parameters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id uuid,
  parameter_type text NOT NULL,
  parameter_name text NOT NULL,
  description text,
  points integer NOT NULL,
  is_enabled boolean DEFAULT true,
  min_value numeric,
  max_value numeric,
  frequency_days integer,
  consecutive_required integer,
  growth_percentage numeric,
  target_value numeric,
  focused_products uuid[],
  focused_categories text[],
  max_awards_per_period integer,
  award_period text,
  tier_config jsonb DEFAULT '{}'::jsonb,
  qualifying_criteria text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.retailer_loyalty_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  points_to_rupee_conversion numeric DEFAULT 10,
  territories uuid[] DEFAULT '{}'::uuid[],
  is_all_territories boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.retailer_loyalty_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  action_id uuid NOT NULL,
  points numeric NOT NULL DEFAULT 0,
  reference_type text,
  reference_id uuid,
  earned_at timestamp with time zone DEFAULT now(),
  awarded_by_user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  parameter_id uuid,
  description text,
  visit_id uuid
);

CREATE TABLE public.retailer_loyalty_programs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  program_name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  territories text[] DEFAULT '{}'::text[],
  is_all_territories boolean DEFAULT false,
  points_to_rupee_conversion numeric NOT NULL DEFAULT 10.0,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.retailer_loyalty_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL,
  program_id uuid NOT NULL,
  points_redeemed numeric NOT NULL DEFAULT 0,
  voucher_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  requested_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid,
  voucher_code text,
  rejection_reason text,
  requested_by_user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.retailer_loyalty_reward_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reward_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  program_id uuid NOT NULL,
  points_redeemed numeric NOT NULL,
  status text DEFAULT 'pending'::text,
  delivery_address text,
  delivery_notes text,
  requested_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid,
  tracking_info text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.retailer_loyalty_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL,
  reward_type text NOT NULL,
  reward_name text NOT NULL,
  description text,
  points_required numeric NOT NULL,
  cash_value numeric,
  image_url text,
  stock_quantity integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.retailer_loyalty_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL,
  last_order_date date,
  consecutive_order_count integer DEFAULT 0,
  total_orders_count integer DEFAULT 0,
  last_points_earned_date date,
  new_products_tried text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.retailer_visit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  visit_id uuid,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  time_spent_seconds integer,
  start_latitude numeric,
  start_longitude numeric,
  distance_meters numeric,
  location_status text,
  action_type text,
  is_phone_order boolean DEFAULT false,
  visit_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  location_feedback_reason text,
  location_feedback_notes text
);

CREATE TABLE public.retailers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  beat_id text NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  phone text,
  category text,
  priority text DEFAULT 'medium'::text,
  last_visit_date date,
  order_value numeric DEFAULT 0,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  latitude numeric(9,6),
  longitude numeric(9,6),
  notes text,
  parent_type text,
  parent_name text,
  location_tag text,
  retail_type text,
  potential text,
  competitors text[],
  entity_type text NOT NULL DEFAULT 'retailer'::text,
  beat_name text,
  photo_url text,
  gst_number text,
  pending_amount numeric(10,2) DEFAULT 0,
  territory_id uuid,
  verified boolean NOT NULL DEFAULT false,
  manual_credit_score numeric(3,1),
  last_order_date date,
  last_order_value numeric DEFAULT 0,
  avg_monthly_orders_3m numeric DEFAULT 0,
  avg_order_per_visit_3m numeric DEFAULT 0,
  total_visits_3m integer DEFAULT 0,
  productive_visits_3m integer DEFAULT 0,
  distributor_id uuid,
  state text,
  verification_address boolean DEFAULT false,
  verification_contact boolean DEFAULT false,
  verification_territory boolean DEFAULT false,
  verification_status text DEFAULT 'pending'::text,
  contact_name text,
  contact_title text,
  bank_name text,
  bank_account text,
  ifsc text,
  account_holder_name text,
  qr_upi text,
  terms_conditions text,
  logo_url text,
  owner_id uuid,
  owner_name text,
  portal_enabled boolean DEFAULT false,
  portal_pin text
);

CREATE TABLE public.role_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_name text NOT NULL,
  description text,
  responsibilities text[],
  required_competencies jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.role_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kpi_id uuid,
  role_name text NOT NULL,
  territory_id uuid,
  monthly_target numeric NOT NULL DEFAULT 0,
  quarterly_target numeric NOT NULL DEFAULT 0,
  yearly_target numeric NOT NULL DEFAULT 0,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.saved_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid,
  title text NOT NULL,
  query text NOT NULL,
  parameters jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.scheme_applicability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scheme_id uuid NOT NULL,
  applicability_level text NOT NULL,
  entity_id uuid,
  entity_name text,
  include_children boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.scheme_policy_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  policy_name text NOT NULL,
  policy_value jsonb NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.security_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.sensitive_data_access_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  ip_address text,
  accessed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.sms_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'twilio'::text,
  account_sid text,
  auth_token text,
  from_number text,
  whatsapp_number text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.social_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.social_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.social_post_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.social_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_automated boolean DEFAULT false,
  template_id uuid,
  post_metadata jsonb DEFAULT '{}'::jsonb,
  scheduled_time timestamp with time zone
);

CREATE TABLE public.social_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.stock (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  visit_id uuid NOT NULL,
  product_id text NOT NULL,
  product_name text NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.stock_cycle_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  visit_id uuid,
  product_id text NOT NULL,
  product_name text NOT NULL,
  ordered_quantity integer DEFAULT 0,
  stock_quantity integer DEFAULT 0,
  visit_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.stockist_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stockist_id uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.stockist_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stockist_id uuid,
  contact_name text NOT NULL,
  designation text,
  phone text,
  email text,
  address text,
  is_primary boolean DEFAULT false,
  reports_to uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.stockist_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stockist_id uuid,
  location_name text NOT NULL,
  address text,
  city text,
  state text,
  pincode text,
  is_head_office boolean DEFAULT false,
  contact_phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.support_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  support_category text NOT NULL,
  subject text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending'::text,
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  target_date date,
  resolved_date timestamp with time zone,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.target_actual_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kpi_id uuid,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  daily_actual numeric DEFAULT 0,
  reference_type text,
  reference_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.target_breakdowns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fy_config_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parameter_type text NOT NULL,
  parameter_id text NOT NULL,
  parameter_name text NOT NULL,
  month_number integer,
  quantity_target numeric DEFAULT 0,
  revenue_target numeric DEFAULT 0,
  visits_target numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.target_kpi_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kpi_key text NOT NULL,
  kpi_name text NOT NULL,
  description text,
  data_source text NOT NULL,
  calculation_method text NOT NULL,
  unit text DEFAULT 'number'::text,
  weightage numeric DEFAULT 10,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.target_metric_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text DEFAULT ''::text,
  icon text DEFAULT 'target'::text,
  color text DEFAULT 'blue'::text,
  is_system boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.target_parameter_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parameter_key text NOT NULL,
  icon text NOT NULL DEFAULT '📊'::text,
  data_source_table text,
  data_source_id_column text DEFAULT 'id'::text,
  data_source_name_column text DEFAULT 'name'::text,
  data_source_filter jsonb,
  is_system boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.target_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  policy_id uuid NOT NULL,
  fy_year integer NOT NULL,
  total_target_value numeric DEFAULT 0,
  total_secondary_value numeric DEFAULT 0,
  total_visits_target numeric DEFAULT 0,
  target_start_month integer DEFAULT 1,
  target_end_month integer DEFAULT 12,
  status text DEFAULT 'draft'::text,
  is_locked boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.target_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_type_id uuid NOT NULL,
  period_type text DEFAULT 'annual'::text,
  quantity_unit text,
  enabled_parameters jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.target_setup_master (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  band integer NOT NULL,
  territory_id uuid,
  state_territory_id uuid,
  annual_revenue_target numeric NOT NULL DEFAULT 0,
  annual_quantity_target numeric NOT NULL DEFAULT 0,
  unit_of_measure text NOT NULL DEFAULT 'Units'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.target_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  metric text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.tax_components (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tax_master_id uuid NOT NULL,
  component_type text NOT NULL,
  percentage numeric(5,2) NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.tax_masters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_type text NOT NULL DEFAULT 'GST'::text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  apply_to_primary_orders boolean NOT NULL DEFAULT true,
  apply_to_secondary_orders boolean NOT NULL DEFAULT true,
  cloned_from_id uuid,
  version integer NOT NULL DEFAULT 1,
  effective_from date,
  effective_to date,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.tax_product_map (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tax_master_id uuid NOT NULL,
  product_variant_id uuid NOT NULL,
  is_applicable boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.team_expense_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  ta_type text,
  fixed_ta_amount numeric DEFAULT 0,
  da_amount numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.territories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text NOT NULL,
  description text,
  pincode_ranges text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_user_id uuid,
  zone text,
  assigned_user_ids jsonb DEFAULT '[]'::jsonb,
  assigned_distributor_ids jsonb DEFAULT '[]'::jsonb,
  parent_id uuid,
  child_territories_count integer DEFAULT 0,
  population integer,
  target_market_size numeric,
  retailer_count integer DEFAULT 0,
  competitor_ids uuid[],
  territory_type text,
  owner_id uuid,
  created_by uuid,
  last_updated_by uuid,
  place_id text,
  territory_po_list text[]
);

CREATE TABLE public.territory_assignment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  territory_id uuid NOT NULL,
  assigned_user_id uuid NOT NULL,
  assigned_from timestamp with time zone NOT NULL,
  assigned_to timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.unhandled_queries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  retailer_id uuid,
  retailer_name text,
  message text NOT NULL,
  category text DEFAULT 'unknown'::text,
  status text DEFAULT 'open'::text,
  created_date text NOT NULL DEFAULT to_char((now() AT TIME ZONE 'UTC'::text), 'YYYY-MM-DD'::text),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.uom_category (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.uom_master (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_base boolean NOT NULL DEFAULT false,
  category_id uuid
);

CREATE TABLE public.user_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  approver_id uuid,
  approval_level integer NOT NULL,
  status public.approval_status DEFAULT 'pending'::approval_status,
  comments text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_autonomy_settings (
  user_id uuid NOT NULL,
  auto_beat_planning boolean DEFAULT true,
  auto_order_prefill boolean DEFAULT true,
  auto_payment_reminders boolean DEFAULT false,
  auto_escalation boolean DEFAULT true,
  auto_daily_summary boolean DEFAULT true,
  quiet_hours_start time without time zone,
  quiet_hours_end time without time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_business_plan_distributors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_plan_id uuid NOT NULL,
  distributor_id uuid NOT NULL,
  distributor_name text NOT NULL,
  quantity_target integer DEFAULT 0,
  revenue_target integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_business_plan_month_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_plan_id uuid NOT NULL,
  month_number integer NOT NULL,
  month_name text NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  percentage numeric DEFAULT 0,
  quantity_target numeric DEFAULT 0,
  revenue_target numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_business_plan_months (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_plan_id uuid NOT NULL,
  month_number integer NOT NULL,
  month_name text NOT NULL,
  revenue_target numeric DEFAULT 0,
  quantity_target numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  working_days integer
);

CREATE TABLE public.user_business_plan_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_plan_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  quantity_target numeric DEFAULT 0,
  revenue_target numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_business_plan_retailers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_plan_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  retailer_name text NOT NULL,
  last_year_revenue numeric DEFAULT 0,
  target_revenue numeric DEFAULT 0,
  quantity_target numeric DEFAULT 0,
  growth_percent numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_business_plan_territories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_plan_id uuid NOT NULL,
  territory_id uuid NOT NULL,
  territory_name text NOT NULL,
  quantity_target numeric DEFAULT 0,
  revenue_target numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_business_plan_territory_beats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_plan_id uuid NOT NULL,
  territory_id uuid NOT NULL,
  beat_id uuid NOT NULL,
  beat_name text NOT NULL,
  percentage numeric DEFAULT 0,
  quantity_target numeric DEFAULT 0,
  revenue_target numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_business_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL,
  revenue_target numeric DEFAULT 0,
  quantity_target numeric DEFAULT 0,
  quantity_unit text DEFAULT 'units'::text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  source text DEFAULT 'manual'::text,
  hierarchy_allocation_id uuid,
  target_strategy text NOT NULL DEFAULT 'roll_down'::text,
  manager_own_quantity_target numeric DEFAULT 0,
  manager_own_revenue_target numeric DEFAULT 0,
  personal_quantity_target numeric DEFAULT 0,
  personal_revenue_target numeric DEFAULT 0,
  personal_visits_target numeric DEFAULT 0,
  has_no_target boolean NOT NULL DEFAULT false
);

CREATE TABLE public.user_competency_monthly_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competency_template_id uuid NOT NULL,
  month_year date NOT NULL,
  score numeric(5,2) NOT NULL,
  raw_metrics jsonb DEFAULT '{}'::jsonb,
  previous_month_score numeric(5,2),
  trend text,
  calculated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_context (
  phone text NOT NULL,
  last_intent text,
  last_entity jsonb DEFAULT '{}'::jsonb,
  last_order_id uuid,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_data_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  bytes_uploaded bigint DEFAULT 0,
  bytes_downloaded bigint DEFAULT 0,
  recorded_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_expense_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ta_type text,
  fixed_ta_amount numeric DEFAULT 0,
  da_amount numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  phone_number text,
  manager_id uuid,
  invitation_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  status text DEFAULT 'pending'::text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

CREATE TABLE public.user_leave_policy (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  custom_entitlement integer,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_monthly_scorecards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_year date NOT NULL,
  role_type text NOT NULL,
  overall_score numeric(5,2) NOT NULL,
  weighted_score numeric(5,2),
  performance_band text,
  rank_in_team integer,
  total_team_members integer,
  ai_summary text,
  ai_strengths jsonb DEFAULT '[]'::jsonb,
  ai_improvement_areas jsonb DEFAULT '[]'::jsonb,
  ai_action_plan jsonb DEFAULT '{}'::jsonb,
  manager_id uuid,
  is_published boolean DEFAULT false,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_object_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  object_name text NOT NULL,
  can_read boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_view_all boolean DEFAULT false,
  can_modify_all boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_onboarding_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  attachment_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  page_path text NOT NULL,
  module_name text NOT NULL,
  visited_at timestamp with time zone DEFAULT now(),
  duration_seconds integer
);

CREATE TABLE public.user_performance_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  weighted_average_score numeric DEFAULT 0,
  performance_rating text DEFAULT 'needs_improvement'::text,
  kpi_scores jsonb DEFAULT '{}'::jsonb,
  calculated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_period_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_plan_id uuid NOT NULL,
  period_type text NOT NULL,
  period_number integer NOT NULL,
  quantity_target numeric DEFAULT 0,
  revenue_target numeric DEFAULT 0,
  visits_target integer DEFAULT 0,
  source text DEFAULT 'manual'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_period_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kpi_id uuid,
  period_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  target_value numeric NOT NULL DEFAULT 0,
  actual_value numeric DEFAULT 0,
  achievement_percent numeric DEFAULT 0,
  status text DEFAULT 'in_progress'::text,
  last_calculated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  profile_id uuid,
  assigned_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_push_content_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  schedule_time time without time zone NOT NULL,
  custom_settings jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  login_at timestamp with time zone DEFAULT now(),
  logout_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.van_beat_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  van_id uuid NOT NULL,
  beat_id uuid NOT NULL,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.van_closing_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  van_id uuid NOT NULL,
  closing_date date NOT NULL DEFAULT CURRENT_DATE,
  total_inward_qty integer NOT NULL DEFAULT 0,
  total_sold_qty integer NOT NULL DEFAULT 0,
  total_returned_qty integer NOT NULL DEFAULT 0,
  closing_inventory_qty integer NOT NULL DEFAULT 0,
  computed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.van_closing_stock_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  closing_stock_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  morning_qty integer NOT NULL DEFAULT 0,
  sold_qty integer NOT NULL DEFAULT 0,
  returned_qty integer NOT NULL DEFAULT 0,
  closing_qty integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.van_inward_grn (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  van_id uuid NOT NULL,
  beat_id uuid,
  user_id uuid NOT NULL,
  grn_date date NOT NULL DEFAULT CURRENT_DATE,
  grn_number text NOT NULL,
  van_distance_km numeric(10,2) DEFAULT 0,
  documents_verified boolean DEFAULT false,
  verified_by uuid,
  verified_by_name text,
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.van_inward_grn_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grn_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  quantity integer NOT NULL DEFAULT 0,
  ai_scanned boolean DEFAULT false,
  ai_confidence_percent numeric(5,2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.van_live_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  van_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  morning_stock integer NOT NULL DEFAULT 0,
  sold_quantity integer NOT NULL DEFAULT 0,
  returned_quantity integer NOT NULL DEFAULT 0,
  current_stock integer NOT NULL DEFAULT 0,
  pending_quantity integer NOT NULL DEFAULT 0,
  last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.van_order_fulfillment (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_item_id uuid NOT NULL,
  van_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  requested_quantity integer NOT NULL,
  fulfilled_quantity integer NOT NULL DEFAULT 0,
  pending_quantity integer NOT NULL DEFAULT 0,
  fulfillment_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.van_return_grn (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  van_id uuid NOT NULL,
  user_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  visit_id uuid,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  return_grn_number text NOT NULL,
  is_verified boolean DEFAULT false,
  verified_by uuid,
  verified_by_name text,
  verified_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.van_return_grn_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  return_grn_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  return_quantity integer NOT NULL DEFAULT 0,
  return_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.van_sales_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.van_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  van_id uuid NOT NULL,
  user_id uuid NOT NULL,
  beat_id uuid,
  stock_date date NOT NULL DEFAULT CURRENT_DATE,
  start_of_day_stock jsonb NOT NULL DEFAULT '[]'::jsonb,
  end_of_day_stock jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_ordered_qty jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  start_km numeric DEFAULT 0,
  end_km numeric DEFAULT 0,
  total_km numeric
);

CREATE TABLE public.van_stock_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  van_stock_id uuid NOT NULL,
  adjustment_type text NOT NULL,
  product_id text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  reason text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.van_stock_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  van_stock_id uuid NOT NULL,
  product_id text NOT NULL,
  product_name text NOT NULL,
  start_qty integer NOT NULL DEFAULT 0,
  ordered_qty integer NOT NULL DEFAULT 0,
  left_qty integer NOT NULL DEFAULT 0,
  unit text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  returned_qty integer NOT NULL DEFAULT 0
);

CREATE TABLE public.van_stock_opening_edits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  van_stock_id uuid NOT NULL,
  user_id uuid NOT NULL,
  product_id text NOT NULL,
  product_name text NOT NULL,
  previous_qty integer NOT NULL DEFAULT 0,
  edited_qty integer NOT NULL DEFAULT 0,
  difference integer NOT NULL DEFAULT 0,
  unit text DEFAULT 'Grams'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  edit_source text DEFAULT 'load_previous'::text
);

CREATE TABLE public.vans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_number text NOT NULL,
  make_model text NOT NULL,
  purchase_date date,
  rc_book_url text,
  rc_expiry_date date,
  insurance_url text,
  insurance_expiry_date date,
  pollution_cert_url text,
  pollution_expiry_date date,
  driver_name text,
  driver_phone text,
  driver_address text,
  driver_id_proof_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_user_id uuid
);

CREATE TABLE public.vendors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  contact_phone text,
  contact_email text,
  skills text[] NOT NULL DEFAULT '{}'::text[],
  region_pincodes text[] NOT NULL DEFAULT '{}'::text[],
  city text,
  state text,
  is_approved boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  competitors text[] DEFAULT '{}'::text[],
  stockist_status text DEFAULT 'active'::text,
  established_year integer,
  products_distributed text[],
  other_products text[],
  assets_trucks integer DEFAULT 0,
  assets_vans integer DEFAULT 0,
  sales_team_size integer DEFAULT 0,
  coverage_area text,
  annual_revenue numeric,
  profitability text,
  business_hunger text,
  about_business text
);

CREATE TABLE public.visit_ai_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  retailer_id uuid,
  insights jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.visits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  retailer_id uuid,
  planned_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned'::text,
  check_in_time timestamp with time zone,
  check_in_location jsonb,
  check_in_photo_url text,
  location_match_in boolean,
  check_out_time timestamp with time zone,
  check_out_location jsonb,
  check_out_photo_url text,
  location_match_out boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  check_in_address text,
  check_out_address text,
  no_order_reason text,
  skip_check_in_reason text,
  skip_check_in_time timestamp with time zone,
  feedback jsonb,
  visit_type text,
  completion_source text
);

CREATE TABLE public.warehouses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.week_off_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL,
  is_off boolean NOT NULL DEFAULT false,
  alternate_pattern text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_phone_number text NOT NULL,
  business_name text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.whatsapp_phone_name_cache (
  phone_key text NOT NULL,
  retailer_id uuid NOT NULL,
  name text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  state text NOT NULL DEFAULT 'IDLE'::text,
  retailer_id uuid,
  retailer_name text,
  pending_items jsonb DEFAULT '[]'::jsonb,
  conversation_history jsonb DEFAULT '[]'::jsonb,
  last_active_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  owner_id uuid,
  beat_id uuid,
  territory_id uuid
);

CREATE TABLE public.work_experiences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  designation text,
  from_date date,
  to_date date,
  is_current boolean DEFAULT false,
  description text,
  location text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.workflow_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL,
  step_number integer NOT NULL DEFAULT 1,
  approver_type text NOT NULL DEFAULT 'manager'::text,
  approver_role text,
  specific_user_id uuid,
  hierarchy_level integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.working_days_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  total_days integer NOT NULL,
  working_days integer NOT NULL,
  week_offs integer NOT NULL DEFAULT 0,
  holidays integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================
-- CONSTRAINTS (PK, FK, UNIQUE, CHECK)
-- ============================================================

ALTER TABLE public.accrual_config ADD CONSTRAINT accrual_config_credit_day_check CHECK (((credit_day >= 1) AND (credit_day <= 28)));
ALTER TABLE public.accrual_config ADD CONSTRAINT accrual_config_frequency_check CHECK ((frequency = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'annual'::text])));
ALTER TABLE public.accrual_config ADD CONSTRAINT accrual_config_leave_type_id_key UNIQUE (leave_type_id);
ALTER TABLE public.accrual_config ADD CONSTRAINT accrual_config_pkey PRIMARY KEY (id);
ALTER TABLE public.accrual_config ADD CONSTRAINT accrual_config_round_mode_check CHECK ((round_mode = ANY (ARRAY['floor'::text, 'ceil'::text, 'round'::text])));
ALTER TABLE public.activity_events ADD CONSTRAINT activity_events_pkey PRIMARY KEY (id);
ALTER TABLE public.additional_expenses ADD CONSTRAINT additional_expenses_pkey PRIMARY KEY (id);
ALTER TABLE public.ai_autonomous_actions ADD CONSTRAINT ai_autonomous_actions_pkey PRIMARY KEY (id);
ALTER TABLE public.ai_feature_feedback ADD CONSTRAINT ai_feature_feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['positive'::text, 'negative'::text])));
ALTER TABLE public.ai_feature_feedback ADD CONSTRAINT ai_feature_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.ai_insights ADD CONSTRAINT ai_insights_category_check CHECK ((category = ANY (ARRAY['team'::text, 'sales'::text, 'collection'::text, 'retailer'::text, 'beat'::text, 'attendance'::text, 'target'::text, 'distributor'::text])));
ALTER TABLE public.ai_insights ADD CONSTRAINT ai_insights_insight_type_check CHECK ((insight_type = ANY (ARRAY['alert'::text, 'opportunity'::text, 'recommendation'::text, 'kudos'::text, 'reminder'::text])));
ALTER TABLE public.ai_insights ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);
ALTER TABLE public.ai_insights ADD CONSTRAINT ai_insights_priority_check CHECK ((priority = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text])));
ALTER TABLE public.ai_scheme_suggestions ADD CONSTRAINT ai_scheme_suggestions_pkey PRIMARY KEY (id);
ALTER TABLE public.analytics_likes ADD CONSTRAINT analytics_likes_pkey PRIMARY KEY (id);
ALTER TABLE public.analytics_views ADD CONSTRAINT analytics_views_pkey PRIMARY KEY (id);
ALTER TABLE public.approval_audit_log ADD CONSTRAINT approval_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.approval_config ADD CONSTRAINT approval_config_approval_mode_check CHECK ((approval_mode = ANY (ARRAY['auto'::text, 'manager'::text, 'multi_level'::text])));
ALTER TABLE public.approval_config ADD CONSTRAINT approval_config_entity_type_key UNIQUE (entity_type);
ALTER TABLE public.approval_config ADD CONSTRAINT approval_config_pkey PRIMARY KEY (id);
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.approval_steps ADD CONSTRAINT approval_steps_pkey PRIMARY KEY (id);
ALTER TABLE public.approval_workflows ADD CONSTRAINT approval_workflows_approval_mode_check CHECK ((approval_mode = ANY (ARRAY['sequential'::text, 'parallel_any'::text, 'parallel_all'::text])));
ALTER TABLE public.approval_workflows ADD CONSTRAINT approval_workflows_pkey PRIMARY KEY (id);
ALTER TABLE public.approvers ADD CONSTRAINT approvers_approver_level_check CHECK (((approver_level >= 1) AND (approver_level <= 3)));
ALTER TABLE public.approvers ADD CONSTRAINT approvers_pkey PRIMARY KEY (id);
ALTER TABLE public.aspirations_and_preferences ADD CONSTRAINT aspirations_and_preferences_pkey PRIMARY KEY (id);
ALTER TABLE public.aspirations_and_preferences ADD CONSTRAINT aspirations_and_preferences_user_id_key UNIQUE (user_id);
ALTER TABLE public.attendance ADD CONSTRAINT attendance_face_verification_status_check CHECK ((face_verification_status = ANY (ARRAY['match'::text, 'partial'::text, 'nomatch'::text, 'error'::text])));
ALTER TABLE public.attendance ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);
ALTER TABLE public.attendance ADD CONSTRAINT attendance_user_id_date_key UNIQUE (user_id, date);
ALTER TABLE public.attendance_daily_admin_summary ADD CONSTRAINT attendance_daily_admin_summary_date_key UNIQUE (date);
ALTER TABLE public.attendance_daily_admin_summary ADD CONSTRAINT attendance_daily_admin_summary_pkey PRIMARY KEY (id);
ALTER TABLE public.attendance_user_monthly_summary ADD CONSTRAINT attendance_user_monthly_summary_month_check CHECK (((month >= 1) AND (month <= 12)));
ALTER TABLE public.attendance_user_monthly_summary ADD CONSTRAINT attendance_user_monthly_summary_pkey PRIMARY KEY (id);
ALTER TABLE public.attendance_user_monthly_summary ADD CONSTRAINT attendance_user_monthly_summary_unique UNIQUE (user_id, year, month);
ALTER TABLE public.auto_end_day_policy ADD CONSTRAINT auto_end_day_policy_pkey PRIMARY KEY (id);
ALTER TABLE public.badges ADD CONSTRAINT badges_pkey PRIMARY KEY (id);
ALTER TABLE public.beat_allowances ADD CONSTRAINT beat_allowances_beat_id_user_id_key UNIQUE (beat_id, user_id);
ALTER TABLE public.beat_allowances ADD CONSTRAINT beat_allowances_pkey PRIMARY KEY (id);
ALTER TABLE public.beat_audit_log ADD CONSTRAINT beat_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.beat_plans ADD CONSTRAINT beat_plans_pkey PRIMARY KEY (id);
ALTER TABLE public.beat_plans ADD CONSTRAINT beat_plans_user_id_plan_date_beat_id_key UNIQUE (user_id, plan_date, beat_id);
ALTER TABLE public.beats ADD CONSTRAINT beats_beat_id_key UNIQUE (beat_id);
ALTER TABLE public.beats ADD CONSTRAINT beats_pkey PRIMARY KEY (id);
ALTER TABLE public.branding_request_items ADD CONSTRAINT branding_request_items_pkey PRIMARY KEY (id);
ALTER TABLE public.branding_requests ADD CONSTRAINT branding_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.branding_requests ADD CONSTRAINT branding_requests_vendor_rating_check CHECK (((vendor_rating >= (1)::numeric) AND (vendor_rating <= (5)::numeric)));
ALTER TABLE public.broadcast_notification_log ADD CONSTRAINT broadcast_notification_log_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_conversations ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_feedback ADD CONSTRAINT chat_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_feedback ADD CONSTRAINT chat_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])));
ALTER TABLE public.coach_badges ADD CONSTRAINT coach_badges_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_chat_messages ADD CONSTRAINT coach_chat_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_competencies ADD CONSTRAINT coach_competencies_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_daily_nudges ADD CONSTRAINT coach_daily_nudges_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_feedback ADD CONSTRAINT coach_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_learning_content ADD CONSTRAINT coach_learning_content_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_quiz_attempts ADD CONSTRAINT coach_quiz_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_quiz_questions ADD CONSTRAINT coach_quiz_questions_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_scenario_attempts ADD CONSTRAINT coach_scenario_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_scenarios ADD CONSTRAINT coach_scenarios_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_user_badges ADD CONSTRAINT coach_user_badges_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_user_badges ADD CONSTRAINT coach_user_badges_user_id_badge_id_key UNIQUE (user_id, badge_id);
ALTER TABLE public.coach_user_competency_scores ADD CONSTRAINT coach_user_competency_scores_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_user_competency_scores ADD CONSTRAINT coach_user_competency_scores_user_id_competency_id_key UNIQUE (user_id, competency_id);
ALTER TABLE public.coach_user_overall_scores ADD CONSTRAINT coach_user_overall_scores_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_user_overall_scores ADD CONSTRAINT coach_user_overall_scores_user_id_key UNIQUE (user_id);
ALTER TABLE public.coach_user_progress ADD CONSTRAINT coach_user_progress_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_user_progress ADD CONSTRAINT coach_user_progress_user_id_learning_content_id_key UNIQUE (user_id, learning_content_id);
ALTER TABLE public.coach_user_streaks ADD CONSTRAINT coach_user_streaks_pkey PRIMARY KEY (id);
ALTER TABLE public.coach_user_streaks ADD CONSTRAINT coach_user_streaks_user_id_key UNIQUE (user_id);
ALTER TABLE public.companies ADD CONSTRAINT companies_invoice_template_valid CHECK ((invoice_template = ANY (ARRAY['template1'::text, 'template2'::text, 'template3'::text, 'template4'::text])));
ALTER TABLE public.companies ADD CONSTRAINT companies_pkey PRIMARY KEY (id);
ALTER TABLE public.company_product_categories ADD CONSTRAINT company_product_categories_company_id_key UNIQUE (company_id);
ALTER TABLE public.company_product_categories ADD CONSTRAINT company_product_categories_pkey PRIMARY KEY (id);
ALTER TABLE public.competencies ADD CONSTRAINT competencies_pkey PRIMARY KEY (id);
ALTER TABLE public.competency_coaching_notes ADD CONSTRAINT competency_coaching_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.competency_templates ADD CONSTRAINT competency_templates_category_check CHECK ((category = ANY (ARRAY['productivity'::text, 'discipline'::text, 'development'::text, 'leadership'::text, 'achievement'::text])));
ALTER TABLE public.competency_templates ADD CONSTRAINT competency_templates_competency_code_key UNIQUE (competency_code);
ALTER TABLE public.competency_templates ADD CONSTRAINT competency_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.competency_templates ADD CONSTRAINT competency_templates_role_type_check CHECK ((role_type = ANY (ARRAY['field_executive'::text, 'field_manager'::text])));
ALTER TABLE public.competency_templates ADD CONSTRAINT competency_templates_weightage_check CHECK (((weightage >= (0)::numeric) AND (weightage <= (100)::numeric)));
ALTER TABLE public.competition_contacts ADD CONSTRAINT competition_contacts_level_check CHECK ((level = ANY (ARRAY['Junior'::text, 'Middle'::text, 'Senior'::text])));
ALTER TABLE public.competition_contacts ADD CONSTRAINT competition_contacts_pkey PRIMARY KEY (id);
ALTER TABLE public.competition_contacts ADD CONSTRAINT competition_contacts_role_check CHECK ((role = ANY (ARRAY['Field Sales'::text, 'Marketing'::text, 'Product management'::text, 'Supply chain'::text, 'Manager'::text, 'Leadership'::text])));
ALTER TABLE public.competition_contacts ADD CONSTRAINT competition_contacts_skill_check CHECK ((skill = ANY (ARRAY['Good'::text, 'Average'::text, 'Not sure'::text])));
ALTER TABLE public.competition_data ADD CONSTRAINT competition_data_pkey PRIMARY KEY (id);
ALTER TABLE public.competition_insights ADD CONSTRAINT competition_insights_impact_level_check CHECK ((impact_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])));
ALTER TABLE public.competition_insights ADD CONSTRAINT competition_insights_insight_type_check CHECK ((insight_type = ANY (ARRAY['pricing'::text, 'promotion'::text, 'placement'::text, 'product_availability'::text, 'customer_preference'::text])));
ALTER TABLE public.competition_insights ADD CONSTRAINT competition_insights_pkey PRIMARY KEY (id);
ALTER TABLE public.competition_master ADD CONSTRAINT competition_master_pkey PRIMARY KEY (id);
ALTER TABLE public.competition_skus ADD CONSTRAINT competition_skus_pkey PRIMARY KEY (id);
ALTER TABLE public.counter_sale_items ADD CONSTRAINT counter_sale_items_pkey PRIMARY KEY (id);
ALTER TABLE public.counter_sales ADD CONSTRAINT counter_sales_pkey PRIMARY KEY (id);
ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_pkey PRIMARY KEY (id);
ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_type_check CHECK ((type = ANY (ARRAY['order_credit'::text, 'order_cancel'::text, 'payment'::text, 'adjustment'::text])));
ALTER TABLE public.credit_management_config ADD CONSTRAINT credit_management_config_new_retailer_starting_score_check CHECK (((new_retailer_starting_score >= (0)::numeric) AND (new_retailer_starting_score <= (10)::numeric)));
ALTER TABLE public.credit_management_config ADD CONSTRAINT credit_management_config_pkey PRIMARY KEY (id);
ALTER TABLE public.credit_management_config ADD CONSTRAINT credit_management_config_scoring_mode_check CHECK ((scoring_mode = ANY (ARRAY['manual'::text, 'ai_driven'::text])));
ALTER TABLE public.credit_management_config ADD CONSTRAINT credit_management_config_weight_growth_rate_check CHECK (((weight_growth_rate >= (0)::numeric) AND (weight_growth_rate <= (10)::numeric)));
ALTER TABLE public.credit_management_config ADD CONSTRAINT credit_management_config_weight_order_frequency_check CHECK (((weight_order_frequency >= (0)::numeric) AND (weight_order_frequency <= (10)::numeric)));
ALTER TABLE public.credit_management_config ADD CONSTRAINT credit_management_config_weight_repayment_dso_check CHECK (((weight_repayment_dso >= (0)::numeric) AND (weight_repayment_dso <= (10)::numeric)));
ALTER TABLE public.credit_management_config ADD CONSTRAINT total_weight_check CHECK ((((weight_growth_rate + weight_repayment_dso) + weight_order_frequency) = 10.0));
ALTER TABLE public.credit_note_items ADD CONSTRAINT credit_note_items_pkey PRIMARY KEY (id);
ALTER TABLE public.credit_notes ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.custom_invoice_templates ADD CONSTRAINT custom_invoice_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.customer_portal_cart ADD CONSTRAINT customer_portal_cart_pkey PRIMARY KEY (id);
ALTER TABLE public.customer_portal_cart ADD CONSTRAINT customer_portal_cart_retailer_product_unique UNIQUE (retailer_id, product_id);
ALTER TABLE public.customer_portal_cart ADD CONSTRAINT customer_portal_cart_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'voice'::text, 'photo'::text])));
ALTER TABLE public.customers ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
ALTER TABLE public.daily_gps_distance ADD CONSTRAINT daily_gps_distance_pkey PRIMARY KEY (id);
ALTER TABLE public.daily_gps_distance ADD CONSTRAINT daily_gps_distance_user_id_date_key UNIQUE (user_id, date);
ALTER TABLE public.delivery_exceptions ADD CONSTRAINT delivery_exceptions_exception_type_check CHECK ((exception_type = ANY (ARRAY['partial_delivery'::text, 'failed_delivery'::text, 'damaged'::text, 'refused'::text])));
ALTER TABLE public.delivery_exceptions ADD CONSTRAINT delivery_exceptions_pkey PRIMARY KEY (id);
ALTER TABLE public.delivery_run_packing_lists ADD CONSTRAINT delivery_run_packing_lists_packing_list_id_key UNIQUE (packing_list_id);
ALTER TABLE public.delivery_run_packing_lists ADD CONSTRAINT delivery_run_packing_lists_pkey PRIMARY KEY (id);
ALTER TABLE public.delivery_runs ADD CONSTRAINT delivery_runs_pkey PRIMARY KEY (id);
ALTER TABLE public.delivery_runs ADD CONSTRAINT delivery_runs_status_check CHECK ((status = ANY (ARRAY['ready'::text, 'planned'::text, 'assigned'::text, 'out_for_delivery'::text, 'in_transit'::text, 'dispatched'::text, 'delivered'::text, 'completed'::text, 'cancelled'::text])));
ALTER TABLE public.device_battery_logs ADD CONSTRAINT device_battery_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_attachments ADD CONSTRAINT distributor_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_beat_mappings ADD CONSTRAINT distributor_beat_mappings_distributor_id_beat_id_key UNIQUE (distributor_id, beat_id);
ALTER TABLE public.distributor_beat_mappings ADD CONSTRAINT distributor_beat_mappings_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_business_plan_month_products ADD CONSTRAINT distributor_business_plan_mon_business_plan_id_month_numbe_key1 UNIQUE (business_plan_id, month_number, product_id);
ALTER TABLE public.distributor_business_plan_month_products ADD CONSTRAINT distributor_business_plan_month_products_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_business_plan_months ADD CONSTRAINT distributor_business_plan_mon_business_plan_id_month_number_key UNIQUE (business_plan_id, month_number);
ALTER TABLE public.distributor_business_plan_months ADD CONSTRAINT distributor_business_plan_months_month_number_check CHECK (((month_number >= 1) AND (month_number <= 12)));
ALTER TABLE public.distributor_business_plan_months ADD CONSTRAINT distributor_business_plan_months_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_business_plan_products ADD CONSTRAINT distributor_business_plan_products_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_business_plan_retailers ADD CONSTRAINT distributor_business_plan_retailers_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_business_plans ADD CONSTRAINT distributor_business_plans_distributor_id_year_key UNIQUE (distributor_id, year);
ALTER TABLE public.distributor_business_plans ADD CONSTRAINT distributor_business_plans_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_claims ADD CONSTRAINT distributor_claims_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_company_return_items ADD CONSTRAINT distributor_company_return_items_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_company_return_items ADD CONSTRAINT distributor_company_return_items_reason_check CHECK ((reason = ANY (ARRAY['damaged'::text, 'expired'::text, 'slow_moving'::text, 'recall'::text, 'quality_issue'::text, 'other'::text])));
ALTER TABLE public.distributor_company_return_items ADD CONSTRAINT distributor_company_return_items_source_check CHECK ((source = ANY (ARRAY['retailer_return'::text, 'own_stock'::text])));
ALTER TABLE public.distributor_company_returns ADD CONSTRAINT distributor_company_returns_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_company_returns ADD CONSTRAINT distributor_company_returns_return_number_key UNIQUE (return_number);
ALTER TABLE public.distributor_company_returns ADD CONSTRAINT distributor_company_returns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'picked_up'::text, 'credited'::text, 'rejected'::text])));
ALTER TABLE public.distributor_contacts ADD CONSTRAINT distributor_contacts_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_credit_limits ADD CONSTRAINT distributor_credit_limits_distributor_id_key UNIQUE (distributor_id);
ALTER TABLE public.distributor_credit_limits ADD CONSTRAINT distributor_credit_limits_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_evaluation_tasks ADD CONSTRAINT distributor_evaluation_tasks_distributor_id_task_key_key UNIQUE (distributor_id, task_key);
ALTER TABLE public.distributor_evaluation_tasks ADD CONSTRAINT distributor_evaluation_tasks_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_ideas ADD CONSTRAINT distributor_ideas_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_inventory ADD CONSTRAINT distributor_inventory_dist_prod_wh_unique UNIQUE (distributor_id, product_id, warehouse_id);
ALTER TABLE public.distributor_inventory ADD CONSTRAINT distributor_inventory_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_inventory_transactions ADD CONSTRAINT distributor_inventory_transactions_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_inventory_transactions ADD CONSTRAINT distributor_inventory_transactions_reference_type_check CHECK (((reference_type IS NULL) OR (reference_type = ANY (ARRAY['primary_order'::text, 'secondary_order'::text, 'retailer_return'::text, 'company_return'::text, 'adjustment'::text, 'opening_stock'::text, 'grn'::text, 'dispatch'::text, 'packing_list'::text]))));
ALTER TABLE public.distributor_item_mappings ADD CONSTRAINT check_product_or_category CHECK ((((product_id IS NOT NULL) OR (category_id IS NOT NULL)) AND ((product_name IS NOT NULL) OR (category_name IS NOT NULL))));
ALTER TABLE public.distributor_item_mappings ADD CONSTRAINT distributor_item_mappings_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_locations ADD CONSTRAINT distributor_locations_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_payments ADD CONSTRAINT distributor_payments_payment_mode_check CHECK ((payment_mode = ANY (ARRAY['cash'::text, 'upi'::text, 'neft'::text, 'rtgs'::text, 'cheque'::text, 'online'::text, 'other'::text])));
ALTER TABLE public.distributor_payments ADD CONSTRAINT distributor_payments_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_payments ADD CONSTRAINT distributor_payments_status_check CHECK ((status = ANY (ARRAY['confirmed'::text, 'pending'::text, 'bounced'::text, 'cancelled'::text])));
ALTER TABLE public.distributor_price_books ADD CONSTRAINT distributor_price_books_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_retailer_credit_limits ADD CONSTRAINT distributor_retailer_credit_limi_distributor_id_retailer_id_key UNIQUE (distributor_id, retailer_id);
ALTER TABLE public.distributor_retailer_credit_limits ADD CONSTRAINT distributor_retailer_credit_limits_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_retailer_feedback ADD CONSTRAINT distributor_retailer_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_retailer_ledger ADD CONSTRAINT distributor_retailer_ledger_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_retailer_ledger ADD CONSTRAINT distributor_retailer_ledger_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['invoice'::text, 'payment'::text, 'credit_note'::text, 'debit_note'::text, 'opening_balance'::text])));
ALTER TABLE public.distributor_retailer_mappings ADD CONSTRAINT distributor_retailer_mappings_distributor_id_retailer_id_key UNIQUE (distributor_id, retailer_id);
ALTER TABLE public.distributor_retailer_mappings ADD CONSTRAINT distributor_retailer_mappings_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_return_items ADD CONSTRAINT distributor_return_items_condition_check CHECK ((condition = ANY (ARRAY['good'::text, 'damaged'::text, 'expired'::text])));
ALTER TABLE public.distributor_return_items ADD CONSTRAINT distributor_return_items_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_return_items ADD CONSTRAINT distributor_return_items_reason_check CHECK ((reason = ANY (ARRAY['damaged'::text, 'expired'::text, 'wrong_product'::text, 'quality_issue'::text, 'excess_stock'::text, 'other'::text])));
ALTER TABLE public.distributor_returns ADD CONSTRAINT distributor_returns_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_returns ADD CONSTRAINT distributor_returns_return_number_key UNIQUE (return_number);
ALTER TABLE public.distributor_returns ADD CONSTRAINT distributor_returns_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'added_to_stock'::text, 'rejected'::text])));
ALTER TABLE public.distributor_secondary_invoice_items ADD CONSTRAINT distributor_secondary_invoice_items_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_secondary_invoices ADD CONSTRAINT distributor_secondary_invoices_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_support_requests ADD CONSTRAINT distributor_support_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_types ADD CONSTRAINT distributor_types_code_key UNIQUE (code);
ALTER TABLE public.distributor_types ADD CONSTRAINT distributor_types_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_users ADD CONSTRAINT distributor_users_email_key UNIQUE (email);
ALTER TABLE public.distributor_users ADD CONSTRAINT distributor_users_pkey PRIMARY KEY (id);
ALTER TABLE public.distributor_users ADD CONSTRAINT distributor_users_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text, 'warehouse'::text, 'accounts'::text, 'staff'::text, 'sales'::text])));
ALTER TABLE public.distributor_users ADD CONSTRAINT distributor_users_user_status_check CHECK ((user_status = ANY (ARRAY['initiated'::text, 'active'::text, 'inactive'::text, 'deactivated'::text])));
ALTER TABLE public.distributors ADD CONSTRAINT distributors_parent_type_check CHECK ((parent_type = ANY (ARRAY['super_stockist'::text, 'company'::text])));
ALTER TABLE public.distributors ADD CONSTRAINT distributors_pkey PRIMARY KEY (id);
ALTER TABLE public.distributors ADD CONSTRAINT distributors_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));
ALTER TABLE public.district_intelligence_cache ADD CONSTRAINT district_intelligence_cache_pkey PRIMARY KEY (id);
ALTER TABLE public.district_intelligence_cache ADD CONSTRAINT district_intelligence_cache_state_district_key UNIQUE (state, district);
ALTER TABLE public.education_history ADD CONSTRAINT education_history_pkey PRIMARY KEY (id);
ALTER TABLE public.emergency_contacts ADD CONSTRAINT emergency_contacts_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_badges ADD CONSTRAINT employee_badges_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_competencies ADD CONSTRAINT employee_competencies_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_competencies ADD CONSTRAINT employee_competencies_user_id_competency_id_key UNIQUE (user_id, competency_id);
ALTER TABLE public.employee_connections ADD CONSTRAINT employee_connections_check CHECK ((follower_id <> following_id));
ALTER TABLE public.employee_connections ADD CONSTRAINT employee_connections_follower_id_following_id_key UNIQUE (follower_id, following_id);
ALTER TABLE public.employee_connections ADD CONSTRAINT employee_connections_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_documents ADD CONSTRAINT employee_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_recommendations ADD CONSTRAINT employee_recommendations_pkey PRIMARY KEY (id);
ALTER TABLE public.employees ADD CONSTRAINT employees_band_check CHECK (((band IS NULL) OR ((band >= 1) AND (band <= 5))));
ALTER TABLE public.employees ADD CONSTRAINT employees_pkey PRIMARY KEY (user_id);
ALTER TABLE public.enabled_units ADD CONSTRAINT enabled_units_pkey PRIMARY KEY (uom_id);
ALTER TABLE public.expense_approval_rules ADD CONSTRAINT expense_approval_rules_condition_type_check CHECK ((condition_type = ANY (ARRAY['amount_range'::text, 'category'::text, 'always'::text])));
ALTER TABLE public.expense_approval_rules ADD CONSTRAINT expense_approval_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.expense_categories ADD CONSTRAINT expense_categories_name_key UNIQUE (name);
ALTER TABLE public.expense_categories ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);
ALTER TABLE public.expense_group_members ADD CONSTRAINT expense_group_members_group_id_user_id_key UNIQUE (group_id, user_id);
ALTER TABLE public.expense_group_members ADD CONSTRAINT expense_group_members_pkey PRIMARY KEY (id);
ALTER TABLE public.expense_groups ADD CONSTRAINT expense_groups_name_key UNIQUE (name);
ALTER TABLE public.expense_groups ADD CONSTRAINT expense_groups_pkey PRIMARY KEY (id);
ALTER TABLE public.expense_master_config ADD CONSTRAINT expense_master_config_da_calculation_basis_check CHECK ((da_calculation_basis = ANY (ARRAY['per_day'::text, 'per_half_day'::text])));
ALTER TABLE public.expense_master_config ADD CONSTRAINT expense_master_config_pkey PRIMARY KEY (id);
ALTER TABLE public.expense_master_config ADD CONSTRAINT expense_master_config_ta_type_check CHECK ((ta_type = ANY (ARRAY['fixed'::text, 'from_beat'::text])));
ALTER TABLE public.external_retailer_list_items ADD CONSTRAINT external_retailer_list_items_list_id_external_retailer_id_key UNIQUE (list_id, external_retailer_id);
ALTER TABLE public.external_retailer_list_items ADD CONSTRAINT external_retailer_list_items_pkey PRIMARY KEY (id);
ALTER TABLE public.external_retailer_lists ADD CONSTRAINT external_retailer_lists_pkey PRIMARY KEY (id);
ALTER TABLE public.feature_flag_audit ADD CONSTRAINT feature_flag_audit_pkey PRIMARY KEY (id);
ALTER TABLE public.feature_flags ADD CONSTRAINT feature_flags_feature_key_key UNIQUE (feature_key);
ALTER TABLE public.feature_flags ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);
ALTER TABLE public.feedback_policies ADD CONSTRAINT feedback_policies_pkey PRIMARY KEY (id);
ALTER TABLE public.feedback_policy_rules ADD CONSTRAINT feedback_policy_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.feedback_questions ADD CONSTRAINT feedback_questions_pkey PRIMARY KEY (id);
ALTER TABLE public.fy_period_targets ADD CONSTRAINT fy_period_targets_fy_config_id_period_type_period_number_key UNIQUE (fy_config_id, period_type, period_number);
ALTER TABLE public.fy_period_targets ADD CONSTRAINT fy_period_targets_period_type_check CHECK ((period_type = ANY (ARRAY['biannual'::text, 'quarterly'::text, 'monthly'::text])));
ALTER TABLE public.fy_period_targets ADD CONSTRAINT fy_period_targets_pkey PRIMARY KEY (id);
ALTER TABLE public.fy_target_config ADD CONSTRAINT fy_target_config_fy_year_plan_name_key UNIQUE (fy_year, target_plan_name);
ALTER TABLE public.fy_target_config ADD CONSTRAINT fy_target_config_pkey PRIMARY KEY (id);
ALTER TABLE public.gamification_actions ADD CONSTRAINT gamification_actions_pkey PRIMARY KEY (id);
ALTER TABLE public.gamification_daily_tracking ADD CONSTRAINT gamification_daily_tracking_pkey PRIMARY KEY (id);
ALTER TABLE public.gamification_daily_tracking ADD CONSTRAINT gamification_daily_tracking_user_id_action_id_tracking_date_key UNIQUE (user_id, action_id, tracking_date);
ALTER TABLE public.gamification_games ADD CONSTRAINT gamification_games_pkey PRIMARY KEY (id);
ALTER TABLE public.gamification_points ADD CONSTRAINT gamification_points_pkey PRIMARY KEY (id);
ALTER TABLE public.gamification_redemptions ADD CONSTRAINT gamification_redemptions_pkey PRIMARY KEY (id);
ALTER TABLE public.gamification_retailer_sequences ADD CONSTRAINT gamification_retailer_sequences_pkey PRIMARY KEY (id);
ALTER TABLE public.gamification_retailer_sequences ADD CONSTRAINT gamification_retailer_sequences_user_id_retailer_id_key UNIQUE (user_id, retailer_id);
ALTER TABLE public.geocoding_jobs ADD CONSTRAINT geocoding_jobs_pkey PRIMARY KEY (id);
ALTER TABLE public.global_leave_policy ADD CONSTRAINT global_leave_policy_pkey PRIMARY KEY (id);
ALTER TABLE public.goods_receipt_notes ADD CONSTRAINT goods_receipt_notes_grn_number_key UNIQUE (grn_number);
ALTER TABLE public.goods_receipt_notes ADD CONSTRAINT goods_receipt_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.gps_tracking ADD CONSTRAINT gps_tracking_pkey PRIMARY KEY (id);
ALTER TABLE public.gps_tracking_stops ADD CONSTRAINT gps_tracking_stops_pkey PRIMARY KEY (id);
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_pkey PRIMARY KEY (id);
ALTER TABLE public.hierarchy_target_allocations ADD CONSTRAINT hierarchy_target_allocations_hierarchy_target_id_user_id_ef_key UNIQUE (hierarchy_target_id, user_id, effective_from);
ALTER TABLE public.hierarchy_target_allocations ADD CONSTRAINT hierarchy_target_allocations_pkey PRIMARY KEY (id);
ALTER TABLE public.hierarchy_target_history ADD CONSTRAINT hierarchy_target_history_pkey PRIMARY KEY (id);
ALTER TABLE public.hierarchy_targets ADD CONSTRAINT hierarchy_targets_pkey PRIMARY KEY (id);
ALTER TABLE public.hierarchy_targets ADD CONSTRAINT hierarchy_targets_root_user_id_fy_year_key UNIQUE (root_user_id, fy_year);
ALTER TABLE public.holidays ADD CONSTRAINT holidays_date_year_key UNIQUE (date, year);
ALTER TABLE public.holidays ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_accounts ADD CONSTRAINT inst_accounts_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_collections ADD CONSTRAINT inst_collections_collection_number_key UNIQUE (collection_number);
ALTER TABLE public.inst_collections ADD CONSTRAINT inst_collections_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_contacts ADD CONSTRAINT inst_contacts_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_invoice_lines ADD CONSTRAINT inst_invoice_lines_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_invoices ADD CONSTRAINT inst_invoices_invoice_number_key UNIQUE (invoice_number);
ALTER TABLE public.inst_invoices ADD CONSTRAINT inst_invoices_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_leads ADD CONSTRAINT inst_leads_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_opportunities ADD CONSTRAINT inst_opportunities_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_order_commitment_lines ADD CONSTRAINT inst_order_commitment_lines_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_order_commitments ADD CONSTRAINT inst_order_commitments_commitment_number_key UNIQUE (commitment_number);
ALTER TABLE public.inst_order_commitments ADD CONSTRAINT inst_order_commitments_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_price_book_entries ADD CONSTRAINT inst_price_book_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_price_books ADD CONSTRAINT inst_price_books_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_products ADD CONSTRAINT inst_products_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_products ADD CONSTRAINT inst_products_product_code_key UNIQUE (product_code);
ALTER TABLE public.inst_quote_line_items ADD CONSTRAINT inst_quote_line_items_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_quotes ADD CONSTRAINT inst_quotes_pkey PRIMARY KEY (id);
ALTER TABLE public.inst_quotes ADD CONSTRAINT inst_quotes_quote_number_key UNIQUE (quote_number);
ALTER TABLE public.inventory_batches ADD CONSTRAINT inventory_batches_dist_prod_batch_wh_unique UNIQUE (distributor_id, product_id, batch_no, warehouse_id);
ALTER TABLE public.inventory_batches ADD CONSTRAINT inventory_batches_pkey PRIMARY KEY (id);
ALTER TABLE public.inventory_batches ADD CONSTRAINT inventory_batches_wh_prod_syscode_unique UNIQUE (warehouse_id, product_id, system_batch_code);
ALTER TABLE public.inventory_valuation_config ADD CONSTRAINT inventory_valuation_config_pkey PRIMARY KEY (id);
ALTER TABLE public.invoice_display_settings ADD CONSTRAINT invoice_display_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.invoice_display_settings ADD CONSTRAINT invoice_display_settings_setting_key_key UNIQUE (setting_key);
ALTER TABLE public.invoice_document_settings ADD CONSTRAINT invoice_document_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.invoice_document_settings ADD CONSTRAINT invoice_document_settings_setting_key_key UNIQUE (setting_key);
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_branding_rating_check CHECK (((branding_rating >= 1) AND (branding_rating <= 5)));
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_competition_rating_check CHECK (((competition_rating >= 1) AND (competition_rating <= 5)));
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_distributor_feedback_rating_check CHECK (((distributor_feedback_rating >= 1) AND (distributor_feedback_rating <= 5)));
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_future_growth_rating_check CHECK (((future_growth_rating >= 1) AND (future_growth_rating <= 5)));
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_pricing_feedback_rating_check CHECK (((pricing_feedback_rating >= 1) AND (pricing_feedback_rating <= 5)));
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_product_feedback_rating_check CHECK (((product_feedback_rating >= 1) AND (product_feedback_rating <= 5)));
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_retailing_rating_check CHECK (((retailing_rating >= 1) AND (retailing_rating <= 5)));
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_sales_trends_rating_check CHECK (((sales_trends_rating >= 1) AND (sales_trends_rating <= 5)));
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_sampling_rating_check CHECK (((sampling_rating >= 1) AND (sampling_rating <= 5)));
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_schemes_rating_check CHECK (((schemes_rating >= 1) AND (schemes_rating <= 5)));
ALTER TABLE public.joint_sales_sessions ADD CONSTRAINT joint_sales_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.leave_accrual_log ADD CONSTRAINT leave_accrual_log_accrual_type_check CHECK ((accrual_type = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'yearly'::text, 'carry_forward'::text, 'adjustment'::text, 'encashment'::text, 'deduction'::text])));
ALTER TABLE public.leave_accrual_log ADD CONSTRAINT leave_accrual_log_pkey PRIMARY KEY (id);
ALTER TABLE public.leave_applications ADD CONSTRAINT leave_applications_half_day_period_check CHECK ((half_day_period = ANY (ARRAY['first_half'::text, 'second_half'::text, NULL::text])));
ALTER TABLE public.leave_applications ADD CONSTRAINT leave_applications_pkey PRIMARY KEY (id);
ALTER TABLE public.leave_approval_workflow ADD CONSTRAINT leave_approval_workflow_approver_type_check CHECK ((approver_type = ANY (ARRAY['manager'::text, 'hr'::text, 'admin'::text, 'specific_user'::text])));
ALTER TABLE public.leave_approval_workflow ADD CONSTRAINT leave_approval_workflow_pkey PRIMARY KEY (id);
ALTER TABLE public.leave_balance ADD CONSTRAINT leave_balance_pkey PRIMARY KEY (id);
ALTER TABLE public.leave_balance ADD CONSTRAINT leave_balance_user_id_leave_type_id_year_key UNIQUE (user_id, leave_type_id, year);
ALTER TABLE public.leave_holidays_bridge ADD CONSTRAINT leave_holidays_bridge_pkey PRIMARY KEY (id);
ALTER TABLE public.leave_policy ADD CONSTRAINT leave_policy_accrual_type_check CHECK ((accrual_type = ANY (ARRAY['yearly'::text, 'monthly'::text, 'quarterly'::text])));
ALTER TABLE public.leave_policy ADD CONSTRAINT leave_policy_leave_type_id_key UNIQUE (leave_type_id);
ALTER TABLE public.leave_policy ADD CONSTRAINT leave_policy_pkey PRIMARY KEY (id);
ALTER TABLE public.leave_type_policy_override ADD CONSTRAINT leave_type_policy_override_leave_type_id_key UNIQUE (leave_type_id);
ALTER TABLE public.leave_type_policy_override ADD CONSTRAINT leave_type_policy_override_pkey PRIMARY KEY (id);
ALTER TABLE public.leave_types ADD CONSTRAINT leave_types_code_key UNIQUE (code);
ALTER TABLE public.leave_types ADD CONSTRAINT leave_types_name_key UNIQUE (name);
ALTER TABLE public.leave_types ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);
ALTER TABLE public.license_config ADD CONSTRAINT license_config_pkey PRIMARY KEY (id);
ALTER TABLE public.module_usage_logs ADD CONSTRAINT module_usage_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_event_log ADD CONSTRAINT notification_event_log_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_event_types ADD CONSTRAINT notification_event_types_event_code_key UNIQUE (event_code);
ALTER TABLE public.notification_event_types ADD CONSTRAINT notification_event_types_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_user_id_template_type_key UNIQUE (user_id, template_type);
ALTER TABLE public.notification_rules ADD CONSTRAINT notification_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.onboarding_tasks ADD CONSTRAINT onboarding_tasks_pkey PRIMARY KEY (id);
ALTER TABLE public.opening_stock_entries ADD CONSTRAINT opening_stock_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.order_cancellation_log ADD CONSTRAINT order_cancellation_log_pkey PRIMARY KEY (id);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);
ALTER TABLE public.orders ADD CONSTRAINT orders_invoice_number_unique UNIQUE (invoice_number);
ALTER TABLE public.orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
ALTER TABLE public.packing_list_assignments ADD CONSTRAINT packing_list_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.packing_list_item_batches ADD CONSTRAINT packing_list_item_batches_pkey PRIMARY KEY (id);
ALTER TABLE public.packing_list_item_sources ADD CONSTRAINT packing_list_item_sources_pkey PRIMARY KEY (id);
ALTER TABLE public.packing_list_items ADD CONSTRAINT packing_list_items_pkey PRIMARY KEY (id);
ALTER TABLE public.packing_list_orders ADD CONSTRAINT packing_list_orders_pkey PRIMARY KEY (id);
ALTER TABLE public.packing_lists ADD CONSTRAINT chk_packing_list_order_type CHECK ((order_type = ANY (ARRAY['primary'::text, 'secondary'::text])));
ALTER TABLE public.packing_lists ADD CONSTRAINT packing_lists_packing_list_number_key UNIQUE (packing_list_number);
ALTER TABLE public.packing_lists ADD CONSTRAINT packing_lists_pkey PRIMARY KEY (id);
ALTER TABLE public.password_reset_attempts ADD CONSTRAINT password_reset_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.password_reset_tokens ADD CONSTRAINT password_reset_tokens_method_check CHECK ((method = ANY (ARRAY['email'::text, 'sms'::text])));
ALTER TABLE public.password_reset_tokens ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);
ALTER TABLE public.password_reset_tokens ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);
ALTER TABLE public.performance_comments ADD CONSTRAINT performance_comments_hr_rating_check CHECK (((hr_rating >= (0)::numeric) AND (hr_rating <= (10)::numeric)));
ALTER TABLE public.performance_comments ADD CONSTRAINT performance_comments_manager_rating_check CHECK (((manager_rating >= (0)::numeric) AND (manager_rating <= (10)::numeric)));
ALTER TABLE public.performance_comments ADD CONSTRAINT performance_comments_pkey PRIMARY KEY (id);
ALTER TABLE public.performance_comments ADD CONSTRAINT performance_comments_self_rating_check CHECK (((self_rating >= (0)::numeric) AND (self_rating <= (10)::numeric)));
ALTER TABLE public.performance_comments ADD CONSTRAINT performance_comments_user_id_period_type_period_start_key UNIQUE (user_id, period_type, period_start);
ALTER TABLE public.performance_module_config ADD CONSTRAINT performance_module_config_active_module_check CHECK ((active_module = ANY (ARRAY['none'::text, 'gamification'::text, 'target_actual'::text, 'both'::text])));
ALTER TABLE public.performance_module_config ADD CONSTRAINT performance_module_config_pkey PRIMARY KEY (id);
ALTER TABLE public.permanent_deletion_log ADD CONSTRAINT permanent_deletion_log_pkey PRIMARY KEY (id);
ALTER TABLE public.permission_set_group_permissions ADD CONSTRAINT permission_set_group_permissions_group_id_object_name_key UNIQUE (group_id, object_name);
ALTER TABLE public.permission_set_group_permissions ADD CONSTRAINT permission_set_group_permissions_pkey PRIMARY KEY (id);
ALTER TABLE public.permission_set_group_users ADD CONSTRAINT permission_set_group_users_group_id_user_id_key UNIQUE (group_id, user_id);
ALTER TABLE public.permission_set_group_users ADD CONSTRAINT permission_set_group_users_pkey PRIMARY KEY (id);
ALTER TABLE public.permission_set_groups ADD CONSTRAINT permission_set_groups_pkey PRIMARY KEY (id);
ALTER TABLE public.petty_cash_funds ADD CONSTRAINT petty_cash_funds_pkey PRIMARY KEY (id);
ALTER TABLE public.petty_cash_limits ADD CONSTRAINT petty_cash_limits_fund_id_key UNIQUE (fund_id);
ALTER TABLE public.petty_cash_limits ADD CONSTRAINT petty_cash_limits_pkey PRIMARY KEY (id);
ALTER TABLE public.petty_cash_transactions ADD CONSTRAINT petty_cash_transactions_pkey PRIMARY KEY (id);
ALTER TABLE public.pincode_master ADD CONSTRAINT pincode_master_pkey PRIMARY KEY (id);
ALTER TABLE public.pincode_top_retailers ADD CONSTRAINT pincode_top_retailers_pkey PRIMARY KEY (id);
ALTER TABLE public.plan_enabled_metrics ADD CONSTRAINT plan_enabled_metrics_fy_config_id_metric_id_key UNIQUE (fy_config_id, metric_id);
ALTER TABLE public.plan_enabled_metrics ADD CONSTRAINT plan_enabled_metrics_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_ai_insights ADD CONSTRAINT pm_ai_insights_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_ideas ADD CONSTRAINT pm_ideas_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_ideas ADD CONSTRAINT pm_ideas_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])));
ALTER TABLE public.pm_ideas ADD CONSTRAINT pm_ideas_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'under_review'::text, 'approved'::text, 'implemented'::text, 'rejected'::text])));
ALTER TABLE public.pm_knowledge_documents ADD CONSTRAINT pm_knowledge_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_milestones ADD CONSTRAINT pm_milestones_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_project_members ADD CONSTRAINT pm_project_members_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_project_members ADD CONSTRAINT pm_project_members_project_id_user_id_key UNIQUE (project_id, user_id);
ALTER TABLE public.pm_project_resources ADD CONSTRAINT pm_project_resources_deployment_type_check CHECK ((deployment_type = ANY (ARRAY['full_time'::text, 'part_time'::text])));
ALTER TABLE public.pm_project_resources ADD CONSTRAINT pm_project_resources_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_project_resources ADD CONSTRAINT pm_project_resources_project_id_user_id_key UNIQUE (project_id, user_id);
ALTER TABLE public.pm_projects ADD CONSTRAINT pm_projects_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_risks ADD CONSTRAINT pm_risks_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_sections ADD CONSTRAINT pm_sections_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_sprints ADD CONSTRAINT pm_sprints_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_support_requests ADD CONSTRAINT pm_support_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_support_requests ADD CONSTRAINT pm_support_requests_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])));
ALTER TABLE public.pm_support_requests ADD CONSTRAINT pm_support_requests_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])));
ALTER TABLE public.pm_task_attachments ADD CONSTRAINT pm_task_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_task_collaborators ADD CONSTRAINT pm_task_collaborators_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_task_collaborators ADD CONSTRAINT pm_task_collaborators_task_id_user_id_key UNIQUE (task_id, user_id);
ALTER TABLE public.pm_task_comments ADD CONSTRAINT pm_task_comments_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_task_dependencies ADD CONSTRAINT pm_task_dependencies_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_task_dependencies ADD CONSTRAINT pm_task_dependencies_task_id_depends_on_task_id_key UNIQUE (task_id, depends_on_task_id);
ALTER TABLE public.pm_task_templates ADD CONSTRAINT pm_task_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_tasks ADD CONSTRAINT pm_tasks_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_template_attachments ADD CONSTRAINT pm_template_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_template_dependencies ADD CONSTRAINT pm_template_dependencies_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_template_sections ADD CONSTRAINT pm_template_sections_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_template_tasks ADD CONSTRAINT pm_template_tasks_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_templates ADD CONSTRAINT pm_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.pm_time_logs ADD CONSTRAINT pm_time_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.pos_customers ADD CONSTRAINT pos_customers_pkey PRIMARY KEY (id);
ALTER TABLE public.price_book_entries ADD CONSTRAINT price_book_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.price_book_entries ADD CONSTRAINT price_book_entries_price_book_id_product_id_variant_id_key UNIQUE (price_book_id, product_id, variant_id);
ALTER TABLE public.price_books ADD CONSTRAINT price_books_pkey PRIMARY KEY (id);
ALTER TABLE public.price_books ADD CONSTRAINT price_books_price_book_type_check CHECK ((price_book_type = ANY (ARRAY['standard'::text, 'territory'::text, 'distributor_category'::text, 'retailer_territory'::text])));
ALTER TABLE public.price_books ADD CONSTRAINT price_books_target_type_check CHECK ((target_type = ANY (ARRAY['distributor'::text, 'retailer'::text])));
ALTER TABLE public.primary_invoices ADD CONSTRAINT primary_invoices_invoice_number_key UNIQUE (invoice_number);
ALTER TABLE public.primary_invoices ADD CONSTRAINT primary_invoices_pkey PRIMARY KEY (id);
ALTER TABLE public.primary_order_items ADD CONSTRAINT primary_order_items_pkey PRIMARY KEY (id);
ALTER TABLE public.primary_order_schemes ADD CONSTRAINT primary_order_schemes_pkey PRIMARY KEY (id);
ALTER TABLE public.primary_order_status_history ADD CONSTRAINT primary_order_status_history_pkey PRIMARY KEY (id);
ALTER TABLE public.primary_orders ADD CONSTRAINT primary_orders_order_number_key UNIQUE (order_number);
ALTER TABLE public.primary_orders ADD CONSTRAINT primary_orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'overdue'::text])));
ALTER TABLE public.primary_orders ADD CONSTRAINT primary_orders_pkey PRIMARY KEY (id);
ALTER TABLE public.primary_orders ADD CONSTRAINT primary_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'submitted'::text, 'confirmed'::text, 'processing'::text, 'allocated'::text, 'packed'::text, 'dispatched'::text, 'shipped'::text, 'partially_delivered'::text, 'delivered'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text])));
ALTER TABLE public.primary_return_items ADD CONSTRAINT primary_return_items_pkey PRIMARY KEY (id);
ALTER TABLE public.primary_return_notes ADD CONSTRAINT primary_return_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.primary_return_notes ADD CONSTRAINT primary_return_notes_return_number_key UNIQUE (return_number);
ALTER TABLE public.primary_shipments ADD CONSTRAINT primary_shipments_pkey PRIMARY KEY (id);
ALTER TABLE public.primary_shipments ADD CONSTRAINT primary_shipments_shipment_number_key UNIQUE (shipment_number);
ALTER TABLE public.product_categories ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);
ALTER TABLE public.product_price_list ADD CONSTRAINT product_price_list_pkey PRIMARY KEY (id);
ALTER TABLE public.product_price_list ADD CONSTRAINT product_price_list_product_id_uom_id_key UNIQUE (product_id, uom_id);
ALTER TABLE public.product_price_list ADD CONSTRAINT product_price_list_rate_check CHECK ((rate >= (0)::numeric));
ALTER TABLE public.product_schemes ADD CONSTRAINT product_schemes_applicability_type_check CHECK ((applicability_type = ANY (ARRAY['global'::text, 'targeted'::text, 'hybrid'::text])));
ALTER TABLE public.product_schemes ADD CONSTRAINT product_schemes_pkey PRIMARY KEY (id);
ALTER TABLE public.product_schemes ADD CONSTRAINT quantity_condition_type_check CHECK ((quantity_condition_type = ANY (ARRAY['more_than'::text, 'less_than'::text, 'equal_to'::text])));
ALTER TABLE public.product_schemes ADD CONSTRAINT valid_scheme_type CHECK ((scheme_type = ANY (ARRAY['percentage_discount'::text, 'flat_discount'::text, 'buy_x_get_y_free'::text, 'bundle_combo'::text, 'tiered_discount'::text, 'time_based_offer'::text, 'first_order_discount'::text, 'category_wide_discount'::text])));
ALTER TABLE public.product_uom_mapping ADD CONSTRAINT product_uom_mapping_conversion_to_base_check CHECK ((conversion_to_base > (0)::numeric));
ALTER TABLE public.product_uom_mapping ADD CONSTRAINT product_uom_mapping_pkey PRIMARY KEY (id);
ALTER TABLE public.product_uom_mapping ADD CONSTRAINT product_uom_mapping_product_id_uom_id_key UNIQUE (product_id, uom_id);
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_focused_type_check CHECK ((focused_type = ANY (ARRAY['fixed_date'::text, 'recurring'::text, 'keep_open'::text])));
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);
ALTER TABLE public.products ADD CONSTRAINT products_base_unit_category_check CHECK (((base_unit_category IS NULL) OR (base_unit_category = ANY (ARRAY['Weight'::text, 'Volume'::text, 'Quantity'::text]))));
ALTER TABLE public.products ADD CONSTRAINT products_focused_type_check CHECK ((focused_type = ANY (ARRAY['fixed_date'::text, 'recurring'::text, 'keep_open'::text])));
ALTER TABLE public.products ADD CONSTRAINT products_pkey PRIMARY KEY (id);
ALTER TABLE public.profile_attachments ADD CONSTRAINT profile_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.profile_object_permissions ADD CONSTRAINT profile_object_permissions_pkey PRIMARY KEY (id);
ALTER TABLE public.profile_object_permissions ADD CONSTRAINT profile_object_permissions_profile_id_object_name_type_key UNIQUE (profile_id, object_name, permission_type);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_full_name_not_empty CHECK ((length(TRIM(BOTH FROM full_name)) > 0));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_hint_answer_not_empty CHECK ((length(TRIM(BOTH FROM hint_answer)) > 0));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_hint_question_not_empty CHECK ((length(TRIM(BOTH FROM hint_question)) > 0));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_not_empty CHECK ((length(TRIM(BOTH FROM username)) > 0));
ALTER TABLE public.push_content_execution_log ADD CONSTRAINT push_content_execution_log_pkey PRIMARY KEY (id);
ALTER TABLE public.push_content_execution_log ADD CONSTRAINT push_content_execution_log_status_check CHECK ((status = ANY (ARRAY['success'::text, 'failed'::text, 'skipped'::text])));
ALTER TABLE public.push_content_posts ADD CONSTRAINT push_content_posts_pkey PRIMARY KEY (id);
ALTER TABLE public.push_content_templates ADD CONSTRAINT push_content_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.recommendation_feedback ADD CONSTRAINT recommendation_feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['like'::text, 'dislike'::text, 'implemented'::text, 'ignored'::text])));
ALTER TABLE public.recommendation_feedback ADD CONSTRAINT recommendation_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.recommendation_feedback ADD CONSTRAINT recommendation_feedback_recommendation_id_user_id_key UNIQUE (recommendation_id, user_id);
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_pkey PRIMARY KEY (id);
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_recommendation_type_check CHECK ((recommendation_type = ANY (ARRAY['beat_visit'::text, 'retailer_priority'::text, 'discussion_points'::text, 'beat_performance'::text, 'optimal_day'::text])));
ALTER TABLE public.recycle_bin ADD CONSTRAINT recycle_bin_pkey PRIMARY KEY (id);
ALTER TABLE public.recycle_bin_config ADD CONSTRAINT recycle_bin_config_pkey PRIMARY KEY (id);
ALTER TABLE public.regularization_policy ADD CONSTRAINT regularization_policy_pkey PRIMARY KEY (id);
ALTER TABLE public.regularization_requests ADD CONSTRAINT regularization_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_credit_scores ADD CONSTRAINT retailer_credit_scores_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_credit_scores ADD CONSTRAINT retailer_credit_scores_retailer_id_key UNIQUE (retailer_id);
ALTER TABLE public.retailer_credit_scores ADD CONSTRAINT retailer_credit_scores_score_check CHECK (((score >= (0)::numeric) AND (score <= (10)::numeric)));
ALTER TABLE public.retailer_credit_scores ADD CONSTRAINT retailer_credit_scores_score_type_check CHECK ((score_type = ANY (ARRAY['manual'::text, 'ai_driven'::text])));
ALTER TABLE public.retailer_external_db ADD CONSTRAINT retailer_external_db_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_external_unsorted ADD CONSTRAINT retailer_external_unsorted_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_feedback ADD CONSTRAINT retailer_feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['brand_feedback'::text, 'service_feedback'::text, 'product_feedback'::text])));
ALTER TABLE public.retailer_feedback ADD CONSTRAINT retailer_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_feedback ADD CONSTRAINT retailer_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
ALTER TABLE public.retailer_gift_redemptions ADD CONSTRAINT retailer_gift_redemptions_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_gift_subscriptions ADD CONSTRAINT retailer_gift_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_loyalty_actions ADD CONSTRAINT retailer_loyalty_actions_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_loyalty_feedback ADD CONSTRAINT retailer_loyalty_feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['positive'::text, 'negative'::text])));
ALTER TABLE public.retailer_loyalty_feedback ADD CONSTRAINT retailer_loyalty_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_loyalty_gifts ADD CONSTRAINT retailer_loyalty_gifts_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_loyalty_parameters ADD CONSTRAINT retailer_loyalty_parameters_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_loyalty_plans ADD CONSTRAINT retailer_loyalty_plans_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_loyalty_points ADD CONSTRAINT retailer_loyalty_points_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_loyalty_programs ADD CONSTRAINT retailer_loyalty_programs_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_loyalty_redemptions ADD CONSTRAINT retailer_loyalty_redemptions_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_loyalty_reward_redemptions ADD CONSTRAINT retailer_loyalty_reward_redemptions_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_loyalty_reward_redemptions ADD CONSTRAINT retailer_loyalty_reward_redemptions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'dispatched'::text, 'delivered'::text, 'rejected'::text])));
ALTER TABLE public.retailer_loyalty_rewards ADD CONSTRAINT retailer_loyalty_rewards_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_loyalty_rewards ADD CONSTRAINT retailer_loyalty_rewards_points_required_check CHECK ((points_required > (0)::numeric));
ALTER TABLE public.retailer_loyalty_rewards ADD CONSTRAINT retailer_loyalty_rewards_reward_type_check CHECK ((reward_type = ANY (ARRAY['gift'::text, 'holiday'::text, 'cash_conversion'::text, 'voucher'::text])));
ALTER TABLE public.retailer_loyalty_tracking ADD CONSTRAINT retailer_loyalty_tracking_pkey PRIMARY KEY (id);
ALTER TABLE public.retailer_loyalty_tracking ADD CONSTRAINT retailer_loyalty_tracking_retailer_id_key UNIQUE (retailer_id);
ALTER TABLE public.retailer_visit_logs ADD CONSTRAINT retailer_visit_logs_action_type_check CHECK ((action_type = ANY (ARRAY['order'::text, 'feedback'::text, 'ai'::text, 'phone_order'::text, 'order_submitted'::text, 'checkout'::text, 'no_order'::text, 'analytics'::text, 'view_stock'::text, 'collection_tips'::text, 'payment'::text, 'view_order'::text, 'check_in'::text])));
ALTER TABLE public.retailer_visit_logs ADD CONSTRAINT retailer_visit_logs_location_status_check CHECK ((location_status = ANY (ARRAY['at_store'::text, 'within_range'::text, 'not_at_store'::text, 'location_unavailable'::text])));
ALTER TABLE public.retailer_visit_logs ADD CONSTRAINT retailer_visit_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.retailers ADD CONSTRAINT chk_retailers_entity_type CHECK ((entity_type = ANY (ARRAY['retailer'::text, 'distributor'::text, 'super_stockist'::text])));
ALTER TABLE public.retailers ADD CONSTRAINT retailers_manual_credit_score_check CHECK (((manual_credit_score >= (0)::numeric) AND (manual_credit_score <= (10)::numeric)));
ALTER TABLE public.retailers ADD CONSTRAINT retailers_pkey PRIMARY KEY (id);
ALTER TABLE public.role_definitions ADD CONSTRAINT role_definitions_pkey PRIMARY KEY (id);
ALTER TABLE public.role_definitions ADD CONSTRAINT role_definitions_role_name_key UNIQUE (role_name);
ALTER TABLE public.role_targets ADD CONSTRAINT role_targets_pkey PRIMARY KEY (id);
ALTER TABLE public.saved_reports ADD CONSTRAINT saved_reports_pkey PRIMARY KEY (id);
ALTER TABLE public.scheme_applicability ADD CONSTRAINT scheme_applicability_applicability_level_check CHECK ((applicability_level = ANY (ARRAY['global'::text, 'territory'::text, 'beat'::text, 'retailer'::text, 'salesperson'::text, 'product'::text])));
ALTER TABLE public.scheme_applicability ADD CONSTRAINT scheme_applicability_pkey PRIMARY KEY (id);
ALTER TABLE public.scheme_policy_config ADD CONSTRAINT scheme_policy_config_pkey PRIMARY KEY (id);
ALTER TABLE public.scheme_policy_config ADD CONSTRAINT scheme_policy_config_policy_name_key UNIQUE (policy_name);
ALTER TABLE public.security_profiles ADD CONSTRAINT security_profiles_name_key UNIQUE (name);
ALTER TABLE public.security_profiles ADD CONSTRAINT security_profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.sensitive_data_access_log ADD CONSTRAINT sensitive_data_access_log_pkey PRIMARY KEY (id);
ALTER TABLE public.sms_config ADD CONSTRAINT sms_config_pkey PRIMARY KEY (id);
ALTER TABLE public.social_comments ADD CONSTRAINT social_comments_pkey PRIMARY KEY (id);
ALTER TABLE public.social_likes ADD CONSTRAINT social_likes_pkey PRIMARY KEY (id);
ALTER TABLE public.social_likes ADD CONSTRAINT social_likes_post_id_user_id_key UNIQUE (post_id, user_id);
ALTER TABLE public.social_post_attachments ADD CONSTRAINT social_post_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_pkey PRIMARY KEY (id);
ALTER TABLE public.social_reactions ADD CONSTRAINT social_reactions_pkey PRIMARY KEY (id);
ALTER TABLE public.social_reactions ADD CONSTRAINT social_reactions_post_id_user_id_emoji_key UNIQUE (post_id, user_id, emoji);
ALTER TABLE public.stock ADD CONSTRAINT stock_pkey PRIMARY KEY (id);
ALTER TABLE public.stock ADD CONSTRAINT stock_unique_user_retailer_visit_product UNIQUE (user_id, retailer_id, visit_id, product_id);
ALTER TABLE public.stock_cycle_data ADD CONSTRAINT stock_cycle_data_pkey PRIMARY KEY (id);
ALTER TABLE public.stockist_attachments ADD CONSTRAINT stockist_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.stockist_contacts ADD CONSTRAINT stockist_contacts_pkey PRIMARY KEY (id);
ALTER TABLE public.stockist_locations ADD CONSTRAINT stockist_locations_pkey PRIMARY KEY (id);
ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.target_actual_logs ADD CONSTRAINT target_actual_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.target_breakdowns ADD CONSTRAINT target_breakdowns_pkey PRIMARY KEY (id);
ALTER TABLE public.target_kpi_definitions ADD CONSTRAINT target_kpi_definitions_kpi_key_key UNIQUE (kpi_key);
ALTER TABLE public.target_kpi_definitions ADD CONSTRAINT target_kpi_definitions_pkey PRIMARY KEY (id);
ALTER TABLE public.target_metric_definitions ADD CONSTRAINT target_metric_definitions_pkey PRIMARY KEY (id);
ALTER TABLE public.target_parameter_definitions ADD CONSTRAINT target_parameter_definitions_parameter_key_key UNIQUE (parameter_key);
ALTER TABLE public.target_parameter_definitions ADD CONSTRAINT target_parameter_definitions_pkey PRIMARY KEY (id);
ALTER TABLE public.target_plans ADD CONSTRAINT target_plans_pkey PRIMARY KEY (id);
ALTER TABLE public.target_plans ADD CONSTRAINT target_plans_policy_id_fy_year_key UNIQUE (policy_id, fy_year);
ALTER TABLE public.target_policies ADD CONSTRAINT target_policies_pkey PRIMARY KEY (id);
ALTER TABLE public.target_setup_master ADD CONSTRAINT target_setup_master_band_check CHECK (((band >= 1) AND (band <= 5)));
ALTER TABLE public.target_setup_master ADD CONSTRAINT target_setup_master_pkey PRIMARY KEY (id);
ALTER TABLE public.target_types ADD CONSTRAINT target_types_name_key UNIQUE (name);
ALTER TABLE public.target_types ADD CONSTRAINT target_types_pkey PRIMARY KEY (id);
ALTER TABLE public.tax_components ADD CONSTRAINT tax_components_component_type_check CHECK ((component_type = ANY (ARRAY['CGST'::text, 'SGST'::text, 'IGST'::text, 'CESS'::text])));
ALTER TABLE public.tax_components ADD CONSTRAINT tax_components_pkey PRIMARY KEY (id);
ALTER TABLE public.tax_components ADD CONSTRAINT tax_components_tax_master_id_component_type_key UNIQUE (tax_master_id, component_type);
ALTER TABLE public.tax_masters ADD CONSTRAINT tax_masters_pkey PRIMARY KEY (id);
ALTER TABLE public.tax_masters ADD CONSTRAINT tax_masters_tax_type_check CHECK ((tax_type = ANY (ARRAY['GST'::text, 'IGST'::text, 'Custom'::text])));
ALTER TABLE public.tax_product_map ADD CONSTRAINT tax_product_map_pkey PRIMARY KEY (id);
ALTER TABLE public.tax_product_map ADD CONSTRAINT tax_product_map_tax_master_id_product_variant_id_key UNIQUE (tax_master_id, product_variant_id);
ALTER TABLE public.team_expense_config ADD CONSTRAINT team_expense_config_manager_id_key UNIQUE (manager_id);
ALTER TABLE public.team_expense_config ADD CONSTRAINT team_expense_config_pkey PRIMARY KEY (id);
ALTER TABLE public.team_expense_config ADD CONSTRAINT team_expense_config_ta_type_check CHECK ((ta_type = ANY (ARRAY['fixed'::text, 'from_beat'::text])));
ALTER TABLE public.territories ADD CONSTRAINT territories_pkey PRIMARY KEY (id);
ALTER TABLE public.territories ADD CONSTRAINT territories_region_check CHECK ((region = ANY (ARRAY['State'::text, 'District'::text, 'Taluk'::text, 'Gram Panchayat'::text])));
ALTER TABLE public.territories ADD CONSTRAINT territories_territory_type_check CHECK ((territory_type = ANY (ARRAY['City'::text, 'Town'::text, 'Village'::text])));
ALTER TABLE public.territory_assignment_history ADD CONSTRAINT territory_assignment_history_pkey PRIMARY KEY (id);
ALTER TABLE public.unhandled_queries ADD CONSTRAINT unhandled_queries_pkey PRIMARY KEY (id);
ALTER TABLE public.uom_category ADD CONSTRAINT uom_category_code_key UNIQUE (code);
ALTER TABLE public.uom_category ADD CONSTRAINT uom_category_pkey PRIMARY KEY (id);
ALTER TABLE public.uom_master ADD CONSTRAINT uom_master_code_key UNIQUE (code);
ALTER TABLE public.uom_master ADD CONSTRAINT uom_master_pkey PRIMARY KEY (id);
ALTER TABLE public.user_approvals ADD CONSTRAINT user_approvals_approval_level_check CHECK (((approval_level >= 1) AND (approval_level <= 3)));
ALTER TABLE public.user_approvals ADD CONSTRAINT user_approvals_pkey PRIMARY KEY (id);
ALTER TABLE public.user_autonomy_settings ADD CONSTRAINT user_autonomy_settings_pkey PRIMARY KEY (user_id);
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_id_badge_id_key UNIQUE (user_id, badge_id);
ALTER TABLE public.user_business_plan_distributors ADD CONSTRAINT user_business_plan_distributors_pkey PRIMARY KEY (id);
ALTER TABLE public.user_business_plan_month_products ADD CONSTRAINT user_business_plan_month_products_pkey PRIMARY KEY (id);
ALTER TABLE public.user_business_plan_months ADD CONSTRAINT user_business_plan_months_business_plan_id_month_number_key UNIQUE (business_plan_id, month_number);
ALTER TABLE public.user_business_plan_months ADD CONSTRAINT user_business_plan_months_month_number_check CHECK (((month_number >= 1) AND (month_number <= 12)));
ALTER TABLE public.user_business_plan_months ADD CONSTRAINT user_business_plan_months_pkey PRIMARY KEY (id);
ALTER TABLE public.user_business_plan_products ADD CONSTRAINT user_business_plan_products_pkey PRIMARY KEY (id);
ALTER TABLE public.user_business_plan_retailers ADD CONSTRAINT user_business_plan_retailers_pkey PRIMARY KEY (id);
ALTER TABLE public.user_business_plan_territories ADD CONSTRAINT user_business_plan_territorie_business_plan_id_territory_id_key UNIQUE (business_plan_id, territory_id);
ALTER TABLE public.user_business_plan_territories ADD CONSTRAINT user_business_plan_territories_pkey PRIMARY KEY (id);
ALTER TABLE public.user_business_plan_territory_beats ADD CONSTRAINT user_business_plan_territory__business_plan_id_territory_id_key UNIQUE (business_plan_id, territory_id, beat_id);
ALTER TABLE public.user_business_plan_territory_beats ADD CONSTRAINT user_business_plan_territory_beats_pkey PRIMARY KEY (id);
ALTER TABLE public.user_business_plans ADD CONSTRAINT user_business_plans_pkey PRIMARY KEY (id);
ALTER TABLE public.user_business_plans ADD CONSTRAINT user_business_plans_user_id_year_key UNIQUE (user_id, year);
ALTER TABLE public.user_competency_monthly_scores ADD CONSTRAINT user_competency_monthly_score_user_id_competency_template_i_key UNIQUE (user_id, competency_template_id, month_year);
ALTER TABLE public.user_competency_monthly_scores ADD CONSTRAINT user_competency_monthly_scores_pkey PRIMARY KEY (id);
ALTER TABLE public.user_competency_monthly_scores ADD CONSTRAINT user_competency_monthly_scores_score_check CHECK (((score >= (0)::numeric) AND (score <= (100)::numeric)));
ALTER TABLE public.user_competency_monthly_scores ADD CONSTRAINT user_competency_monthly_scores_trend_check CHECK ((trend = ANY (ARRAY['improving'::text, 'declining'::text, 'stable'::text, 'new'::text])));
ALTER TABLE public.user_context ADD CONSTRAINT user_context_pkey PRIMARY KEY (phone);
ALTER TABLE public.user_data_usage ADD CONSTRAINT user_data_usage_pkey PRIMARY KEY (id);
ALTER TABLE public.user_expense_config ADD CONSTRAINT user_expense_config_pkey PRIMARY KEY (id);
ALTER TABLE public.user_expense_config ADD CONSTRAINT user_expense_config_ta_type_check CHECK ((ta_type = ANY (ARRAY['fixed'::text, 'from_beat'::text])));
ALTER TABLE public.user_expense_config ADD CONSTRAINT user_expense_config_user_id_key UNIQUE (user_id);
ALTER TABLE public.user_invitations ADD CONSTRAINT user_invitations_invitation_token_key UNIQUE (invitation_token);
ALTER TABLE public.user_invitations ADD CONSTRAINT user_invitations_pkey PRIMARY KEY (id);
ALTER TABLE public.user_leave_policy ADD CONSTRAINT user_leave_policy_pkey PRIMARY KEY (id);
ALTER TABLE public.user_leave_policy ADD CONSTRAINT user_leave_policy_user_id_leave_type_id_effective_from_key UNIQUE (user_id, leave_type_id, effective_from);
ALTER TABLE public.user_monthly_scorecards ADD CONSTRAINT user_monthly_scorecards_overall_score_check CHECK (((overall_score >= (0)::numeric) AND (overall_score <= (100)::numeric)));
ALTER TABLE public.user_monthly_scorecards ADD CONSTRAINT user_monthly_scorecards_performance_band_check CHECK ((performance_band = ANY (ARRAY['exceptional'::text, 'strong'::text, 'developing'::text, 'needs_improvement'::text])));
ALTER TABLE public.user_monthly_scorecards ADD CONSTRAINT user_monthly_scorecards_pkey PRIMARY KEY (id);
ALTER TABLE public.user_monthly_scorecards ADD CONSTRAINT user_monthly_scorecards_role_type_check CHECK ((role_type = ANY (ARRAY['field_executive'::text, 'field_manager'::text])));
ALTER TABLE public.user_monthly_scorecards ADD CONSTRAINT user_monthly_scorecards_user_id_month_year_key UNIQUE (user_id, month_year);
ALTER TABLE public.user_object_permissions ADD CONSTRAINT user_object_permissions_pkey PRIMARY KEY (id);
ALTER TABLE public.user_object_permissions ADD CONSTRAINT user_object_permissions_user_id_object_name_key UNIQUE (user_id, object_name);
ALTER TABLE public.user_onboarding_progress ADD CONSTRAINT user_onboarding_progress_pkey PRIMARY KEY (id);
ALTER TABLE public.user_onboarding_progress ADD CONSTRAINT user_onboarding_progress_user_id_task_id_key UNIQUE (user_id, task_id);
ALTER TABLE public.user_page_views ADD CONSTRAINT user_page_views_pkey PRIMARY KEY (id);
ALTER TABLE public.user_performance_scores ADD CONSTRAINT user_performance_scores_pkey PRIMARY KEY (id);
ALTER TABLE public.user_performance_scores ADD CONSTRAINT user_performance_scores_user_id_period_type_period_start_key UNIQUE (user_id, period_type, period_start);
ALTER TABLE public.user_period_allocations ADD CONSTRAINT user_period_allocations_business_plan_id_period_type_period_key UNIQUE (business_plan_id, period_type, period_number);
ALTER TABLE public.user_period_allocations ADD CONSTRAINT user_period_allocations_period_type_check CHECK ((period_type = ANY (ARRAY['biannual'::text, 'quarterly'::text, 'monthly'::text])));
ALTER TABLE public.user_period_allocations ADD CONSTRAINT user_period_allocations_pkey PRIMARY KEY (id);
ALTER TABLE public.user_period_allocations ADD CONSTRAINT user_period_allocations_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'rollup'::text, 'hierarchy'::text])));
ALTER TABLE public.user_period_targets ADD CONSTRAINT user_period_targets_period_type_check CHECK ((period_type = ANY (ARRAY['month'::text, 'quarter'::text, 'year'::text])));
ALTER TABLE public.user_period_targets ADD CONSTRAINT user_period_targets_pkey PRIMARY KEY (id);
ALTER TABLE public.user_period_targets ADD CONSTRAINT user_period_targets_user_id_kpi_id_period_type_period_start_key UNIQUE (user_id, kpi_id, period_type, period_start);
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
ALTER TABLE public.user_push_content_subscriptions ADD CONSTRAINT user_push_content_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE public.user_push_content_subscriptions ADD CONSTRAINT user_push_content_subscriptions_user_id_template_id_key UNIQUE (user_id, template_id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.van_beat_assignments ADD CONSTRAINT van_beat_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.van_beat_assignments ADD CONSTRAINT van_beat_assignments_van_id_beat_id_assigned_date_key UNIQUE (van_id, beat_id, assigned_date);
ALTER TABLE public.van_closing_stock ADD CONSTRAINT van_closing_stock_pkey PRIMARY KEY (id);
ALTER TABLE public.van_closing_stock ADD CONSTRAINT van_closing_stock_van_id_closing_date_key UNIQUE (van_id, closing_date);
ALTER TABLE public.van_closing_stock_items ADD CONSTRAINT van_closing_stock_items_pkey PRIMARY KEY (id);
ALTER TABLE public.van_inward_grn ADD CONSTRAINT van_inward_grn_grn_number_key UNIQUE (grn_number);
ALTER TABLE public.van_inward_grn ADD CONSTRAINT van_inward_grn_pkey PRIMARY KEY (id);
ALTER TABLE public.van_inward_grn_items ADD CONSTRAINT van_inward_grn_items_pkey PRIMARY KEY (id);
ALTER TABLE public.van_live_inventory ADD CONSTRAINT van_live_inventory_pkey PRIMARY KEY (id);
ALTER TABLE public.van_live_inventory ADD CONSTRAINT van_live_inventory_van_id_product_id_variant_id_date_key UNIQUE (van_id, product_id, variant_id, date);
ALTER TABLE public.van_order_fulfillment ADD CONSTRAINT van_order_fulfillment_pkey PRIMARY KEY (id);
ALTER TABLE public.van_return_grn ADD CONSTRAINT van_return_grn_pkey PRIMARY KEY (id);
ALTER TABLE public.van_return_grn ADD CONSTRAINT van_return_grn_return_grn_number_key UNIQUE (return_grn_number);
ALTER TABLE public.van_return_grn_items ADD CONSTRAINT van_return_grn_items_pkey PRIMARY KEY (id);
ALTER TABLE public.van_sales_settings ADD CONSTRAINT van_sales_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.van_stock ADD CONSTRAINT van_stock_pkey PRIMARY KEY (id);
ALTER TABLE public.van_stock ADD CONSTRAINT van_stock_van_id_stock_date_user_id_key UNIQUE (van_id, stock_date, user_id);
ALTER TABLE public.van_stock_adjustments ADD CONSTRAINT van_stock_adjustments_pkey PRIMARY KEY (id);
ALTER TABLE public.van_stock_items ADD CONSTRAINT van_stock_items_pkey PRIMARY KEY (id);
ALTER TABLE public.van_stock_items ADD CONSTRAINT van_stock_items_unique_stock_product UNIQUE (van_stock_id, product_id);
ALTER TABLE public.van_stock_opening_edits ADD CONSTRAINT van_stock_opening_edits_pkey PRIMARY KEY (id);
ALTER TABLE public.vans ADD CONSTRAINT vans_pkey PRIMARY KEY (id);
ALTER TABLE public.vans ADD CONSTRAINT vans_registration_number_key UNIQUE (registration_number);
ALTER TABLE public.vendors ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);
ALTER TABLE public.visit_ai_insights ADD CONSTRAINT visit_ai_insights_pkey PRIMARY KEY (id);
ALTER TABLE public.visits ADD CONSTRAINT visits_pkey PRIMARY KEY (id);
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_distributor_id_name_key UNIQUE (distributor_id, name);
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);
ALTER TABLE public.week_off_config ADD CONSTRAINT week_off_config_alternate_pattern_check CHECK ((alternate_pattern = ANY (ARRAY[NULL::text, 'all'::text, '1st_3rd'::text, '2nd_4th'::text, 'none'::text])));
ALTER TABLE public.week_off_config ADD CONSTRAINT week_off_config_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)));
ALTER TABLE public.week_off_config ADD CONSTRAINT week_off_config_day_of_week_key UNIQUE (day_of_week);
ALTER TABLE public.week_off_config ADD CONSTRAINT week_off_config_pkey PRIMARY KEY (id);
ALTER TABLE public.whatsapp_config ADD CONSTRAINT whatsapp_config_pkey PRIMARY KEY (id);
ALTER TABLE public.whatsapp_phone_name_cache ADD CONSTRAINT whatsapp_phone_name_cache_pkey PRIMARY KEY (phone_key);
ALTER TABLE public.whatsapp_sessions ADD CONSTRAINT whatsapp_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.work_experiences ADD CONSTRAINT work_experiences_pkey PRIMARY KEY (id);
ALTER TABLE public.workflow_steps ADD CONSTRAINT workflow_steps_approver_type_check CHECK ((approver_type = ANY (ARRAY['manager'::text, 'specific_user'::text, 'hierarchy_level'::text])));
ALTER TABLE public.workflow_steps ADD CONSTRAINT workflow_steps_pkey PRIMARY KEY (id);
ALTER TABLE public.workflow_steps ADD CONSTRAINT workflow_steps_workflow_id_step_number_key UNIQUE (workflow_id, step_number);
ALTER TABLE public.working_days_config ADD CONSTRAINT working_days_config_month_check CHECK (((month >= 1) AND (month <= 12)));
ALTER TABLE public.working_days_config ADD CONSTRAINT working_days_config_pkey PRIMARY KEY (id);
ALTER TABLE public.working_days_config ADD CONSTRAINT working_days_config_year_month_key UNIQUE (year, month);

-- ============================================================

-- FOREIGN KEYS (run after all PKs/UNIQUE)
ALTER TABLE public.accrual_config ADD CONSTRAINT accrual_config_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE;
ALTER TABLE public.activity_events ADD CONSTRAINT activity_events_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id);
ALTER TABLE public.activity_events ADD CONSTRAINT activity_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE public.activity_events ADD CONSTRAINT activity_events_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;
ALTER TABLE public.additional_expenses ADD CONSTRAINT additional_expenses_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
ALTER TABLE public.ai_feature_feedback ADD CONSTRAINT ai_feature_feedback_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.ai_feature_feedback ADD CONSTRAINT ai_feature_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_feature_feedback ADD CONSTRAINT ai_feature_feedback_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;
ALTER TABLE public.ai_scheme_suggestions ADD CONSTRAINT ai_scheme_suggestions_created_scheme_id_fkey FOREIGN KEY (created_scheme_id) REFERENCES product_schemes(id);
ALTER TABLE public.ai_scheme_suggestions ADD CONSTRAINT ai_scheme_suggestions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id);
ALTER TABLE public.approval_audit_log ADD CONSTRAINT approval_audit_log_approval_request_id_fkey FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id);
ALTER TABLE public.approval_steps ADD CONSTRAINT approval_steps_approval_request_id_fkey FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE;
ALTER TABLE public.approvers ADD CONSTRAINT approvers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.aspirations_and_preferences ADD CONSTRAINT aspirations_and_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_regularized_request_id_fkey FOREIGN KEY (regularized_request_id) REFERENCES regularization_requests(id);
ALTER TABLE public.attendance ADD CONSTRAINT fk_attendance_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_user_monthly_summary ADD CONSTRAINT attendance_user_monthly_summary_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.beat_audit_log ADD CONSTRAINT beat_audit_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id);
ALTER TABLE public.beat_plans ADD CONSTRAINT beat_plans_joint_sales_manager_id_fkey FOREIGN KEY (joint_sales_manager_id) REFERENCES auth.users(id);
ALTER TABLE public.beats ADD CONSTRAINT beats_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id);
ALTER TABLE public.beats ADD CONSTRAINT beats_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id);
ALTER TABLE public.beats ADD CONSTRAINT beats_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES territories(id);
ALTER TABLE public.branding_request_items ADD CONSTRAINT branding_request_items_branding_request_id_fkey FOREIGN KEY (branding_request_id) REFERENCES branding_requests(id) ON DELETE CASCADE;
ALTER TABLE public.branding_requests ADD CONSTRAINT branding_requests_assigned_vendor_id_fkey FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id);
ALTER TABLE public.broadcast_notification_log ADD CONSTRAINT broadcast_notification_log_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES auth.users(id);
ALTER TABLE public.chat_conversations ADD CONSTRAINT chat_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.chat_feedback ADD CONSTRAINT chat_feedback_message_id_fkey FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE;
ALTER TABLE public.chat_feedback ADD CONSTRAINT chat_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE;
ALTER TABLE public.coach_badges ADD CONSTRAINT coach_badges_criteria_competency_id_fkey FOREIGN KEY (criteria_competency_id) REFERENCES coach_competencies(id);
ALTER TABLE public.coach_learning_content ADD CONSTRAINT coach_learning_content_competency_id_fkey FOREIGN KEY (competency_id) REFERENCES coach_competencies(id);
ALTER TABLE public.coach_quiz_attempts ADD CONSTRAINT coach_quiz_attempts_question_id_fkey FOREIGN KEY (question_id) REFERENCES coach_quiz_questions(id);
ALTER TABLE public.coach_quiz_questions ADD CONSTRAINT coach_quiz_questions_competency_id_fkey FOREIGN KEY (competency_id) REFERENCES coach_competencies(id);
ALTER TABLE public.coach_quiz_questions ADD CONSTRAINT coach_quiz_questions_learning_content_id_fkey FOREIGN KEY (learning_content_id) REFERENCES coach_learning_content(id);
ALTER TABLE public.coach_scenario_attempts ADD CONSTRAINT coach_scenario_attempts_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES coach_scenarios(id);
ALTER TABLE public.coach_scenarios ADD CONSTRAINT coach_scenarios_competency_id_fkey FOREIGN KEY (competency_id) REFERENCES coach_competencies(id);
ALTER TABLE public.coach_user_badges ADD CONSTRAINT coach_user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES coach_badges(id);
ALTER TABLE public.coach_user_competency_scores ADD CONSTRAINT coach_user_competency_scores_competency_id_fkey FOREIGN KEY (competency_id) REFERENCES coach_competencies(id);
ALTER TABLE public.coach_user_progress ADD CONSTRAINT coach_user_progress_learning_content_id_fkey FOREIGN KEY (learning_content_id) REFERENCES coach_learning_content(id);
ALTER TABLE public.company_product_categories ADD CONSTRAINT company_product_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.competency_coaching_notes ADD CONSTRAINT competency_coaching_notes_competency_template_id_fkey FOREIGN KEY (competency_template_id) REFERENCES competency_templates(id) ON DELETE SET NULL;
ALTER TABLE public.competency_coaching_notes ADD CONSTRAINT competency_coaching_notes_scorecard_id_fkey FOREIGN KEY (scorecard_id) REFERENCES user_monthly_scorecards(id) ON DELETE CASCADE;
ALTER TABLE public.competition_contacts ADD CONSTRAINT competition_contacts_competitor_id_fkey FOREIGN KEY (competitor_id) REFERENCES competition_master(id) ON DELETE CASCADE;
ALTER TABLE public.competition_data ADD CONSTRAINT competition_data_competitor_id_fkey FOREIGN KEY (competitor_id) REFERENCES competition_master(id) ON DELETE CASCADE;
ALTER TABLE public.competition_data ADD CONSTRAINT competition_data_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES competition_skus(id) ON DELETE SET NULL;
ALTER TABLE public.competition_skus ADD CONSTRAINT competition_skus_competitor_id_fkey FOREIGN KEY (competitor_id) REFERENCES competition_master(id) ON DELETE CASCADE;
ALTER TABLE public.counter_sale_items ADD CONSTRAINT counter_sale_items_counter_sale_id_fkey FOREIGN KEY (counter_sale_id) REFERENCES counter_sales(id) ON DELETE CASCADE;
ALTER TABLE public.counter_sales ADD CONSTRAINT counter_sales_pos_customer_id_fkey FOREIGN KEY (pos_customer_id) REFERENCES pos_customers(id) ON DELETE SET NULL;
ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.credit_note_items ADD CONSTRAINT credit_note_items_credit_note_id_fkey FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE;
ALTER TABLE public.credit_notes ADD CONSTRAINT credit_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.credit_notes ADD CONSTRAINT credit_notes_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id);
ALTER TABLE public.custom_invoice_templates ADD CONSTRAINT custom_invoice_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.daily_gps_distance ADD CONSTRAINT daily_gps_distance_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.delivery_exceptions ADD CONSTRAINT delivery_exceptions_delivery_run_id_fkey FOREIGN KEY (delivery_run_id) REFERENCES delivery_runs(id) ON DELETE CASCADE;
ALTER TABLE public.delivery_exceptions ADD CONSTRAINT delivery_exceptions_packing_list_id_fkey FOREIGN KEY (packing_list_id) REFERENCES packing_lists(id) ON DELETE CASCADE;
ALTER TABLE public.delivery_run_packing_lists ADD CONSTRAINT delivery_run_packing_lists_delivery_run_id_fkey FOREIGN KEY (delivery_run_id) REFERENCES delivery_runs(id) ON DELETE CASCADE;
ALTER TABLE public.delivery_run_packing_lists ADD CONSTRAINT delivery_run_packing_lists_packing_list_id_fkey FOREIGN KEY (packing_list_id) REFERENCES packing_lists(id) ON DELETE CASCADE;
ALTER TABLE public.device_battery_logs ADD CONSTRAINT device_battery_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_attachments ADD CONSTRAINT distributor_attachments_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_beat_mappings ADD CONSTRAINT distributor_beat_mappings_beat_id_fkey FOREIGN KEY (beat_id) REFERENCES beats(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_beat_mappings ADD CONSTRAINT distributor_beat_mappings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.distributor_beat_mappings ADD CONSTRAINT distributor_beat_mappings_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_business_plan_month_products ADD CONSTRAINT distributor_business_plan_month_products_business_plan_id_fkey FOREIGN KEY (business_plan_id) REFERENCES distributor_business_plans(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_business_plan_month_products ADD CONSTRAINT distributor_business_plan_month_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_business_plan_months ADD CONSTRAINT distributor_business_plan_months_business_plan_id_fkey FOREIGN KEY (business_plan_id) REFERENCES distributor_business_plans(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_business_plan_products ADD CONSTRAINT distributor_business_plan_products_business_plan_id_fkey FOREIGN KEY (business_plan_id) REFERENCES distributor_business_plans(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_business_plan_retailers ADD CONSTRAINT distributor_business_plan_retailers_business_plan_id_fkey FOREIGN KEY (business_plan_id) REFERENCES distributor_business_plans(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_business_plans ADD CONSTRAINT distributor_business_plans_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_claims ADD CONSTRAINT distributor_claims_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id);
ALTER TABLE public.distributor_company_return_items ADD CONSTRAINT distributor_company_return_items_company_return_id_fkey FOREIGN KEY (company_return_id) REFERENCES distributor_company_returns(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_company_return_items ADD CONSTRAINT distributor_company_return_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_company_return_items ADD CONSTRAINT distributor_company_return_items_source_return_id_fkey FOREIGN KEY (source_return_id) REFERENCES distributor_returns(id) ON DELETE SET NULL;
ALTER TABLE public.distributor_company_return_items ADD CONSTRAINT distributor_company_return_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.distributor_company_returns ADD CONSTRAINT distributor_company_returns_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
ALTER TABLE public.distributor_company_returns ADD CONSTRAINT distributor_company_returns_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.distributor_company_returns ADD CONSTRAINT distributor_company_returns_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_contacts ADD CONSTRAINT distributor_contacts_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_contacts ADD CONSTRAINT distributor_contacts_reports_to_fkey FOREIGN KEY (reports_to) REFERENCES distributor_contacts(id) ON DELETE SET NULL;
ALTER TABLE public.distributor_credit_limits ADD CONSTRAINT distributor_credit_limits_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_evaluation_tasks ADD CONSTRAINT distributor_evaluation_tasks_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_ideas ADD CONSTRAINT distributor_ideas_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id);
ALTER TABLE public.distributor_inventory ADD CONSTRAINT distributor_inventory_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_inventory ADD CONSTRAINT distributor_inventory_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id);
ALTER TABLE public.distributor_inventory ADD CONSTRAINT distributor_inventory_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
ALTER TABLE public.distributor_inventory_transactions ADD CONSTRAINT distributor_inventory_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.distributor_inventory_transactions ADD CONSTRAINT distributor_inventory_transactions_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_inventory_transactions ADD CONSTRAINT distributor_inventory_transactions_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.distributor_inventory_transactions ADD CONSTRAINT distributor_inventory_transactions_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
ALTER TABLE public.distributor_item_mappings ADD CONSTRAINT distributor_item_mappings_mapping_id_fkey FOREIGN KEY (mapping_id) REFERENCES distributor_retailer_mappings(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_locations ADD CONSTRAINT distributor_locations_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_payments ADD CONSTRAINT distributor_payments_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_payments ADD CONSTRAINT distributor_payments_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_price_books ADD CONSTRAINT distributor_price_books_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.distributor_price_books ADD CONSTRAINT distributor_price_books_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_price_books ADD CONSTRAINT distributor_price_books_price_book_id_fkey FOREIGN KEY (price_book_id) REFERENCES price_books(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_retailer_credit_limits ADD CONSTRAINT distributor_retailer_credit_limits_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_retailer_credit_limits ADD CONSTRAINT distributor_retailer_credit_limits_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_retailer_feedback ADD CONSTRAINT distributor_retailer_feedback_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_retailer_feedback ADD CONSTRAINT distributor_retailer_feedback_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id);
ALTER TABLE public.distributor_retailer_ledger ADD CONSTRAINT distributor_retailer_ledger_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_retailer_ledger ADD CONSTRAINT distributor_retailer_ledger_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_return_items ADD CONSTRAINT distributor_return_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_return_items ADD CONSTRAINT distributor_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES distributor_returns(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_return_items ADD CONSTRAINT distributor_return_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.distributor_returns ADD CONSTRAINT distributor_returns_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.distributor_returns ADD CONSTRAINT distributor_returns_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_returns ADD CONSTRAINT distributor_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE public.distributor_returns ADD CONSTRAINT distributor_returns_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_returns ADD CONSTRAINT distributor_returns_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);
ALTER TABLE public.distributor_secondary_invoice_items ADD CONSTRAINT distributor_secondary_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES distributor_secondary_invoices(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_secondary_invoices ADD CONSTRAINT distributor_secondary_invoices_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributor_secondary_invoices ADD CONSTRAINT distributor_secondary_invoices_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id);
ALTER TABLE public.distributor_support_requests ADD CONSTRAINT distributor_support_requests_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id);
ALTER TABLE public.distributor_users ADD CONSTRAINT distributor_users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
ALTER TABLE public.distributor_users ADD CONSTRAINT distributor_users_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);
ALTER TABLE public.distributor_users ADD CONSTRAINT distributor_users_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.distributors ADD CONSTRAINT distributors_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);
ALTER TABLE public.distributors ADD CONSTRAINT distributors_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES distributors(id);
ALTER TABLE public.distributors ADD CONSTRAINT distributors_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES territories(id);
ALTER TABLE public.distributors ADD CONSTRAINT distributors_type_id_fkey FOREIGN KEY (type_id) REFERENCES distributor_types(id) ON DELETE RESTRICT;
ALTER TABLE public.education_history ADD CONSTRAINT education_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.emergency_contacts ADD CONSTRAINT emergency_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.employee_badges ADD CONSTRAINT employee_badges_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES auth.users(id);
ALTER TABLE public.employee_badges ADD CONSTRAINT employee_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.employee_competencies ADD CONSTRAINT employee_competencies_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES auth.users(id);
ALTER TABLE public.employee_competencies ADD CONSTRAINT employee_competencies_competency_id_fkey FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE;
ALTER TABLE public.employee_competencies ADD CONSTRAINT employee_competencies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.employee_connections ADD CONSTRAINT employee_connections_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.employee_connections ADD CONSTRAINT employee_connections_following_id_fkey FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.employee_documents ADD CONSTRAINT employee_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);
ALTER TABLE public.employee_documents ADD CONSTRAINT employee_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.employee_recommendations ADD CONSTRAINT employee_recommendations_recommender_id_fkey FOREIGN KEY (recommender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.employee_recommendations ADD CONSTRAINT employee_recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.employees ADD CONSTRAINT employees_district_territory_id_fkey FOREIGN KEY (district_territory_id) REFERENCES territories(id);
ALTER TABLE public.employees ADD CONSTRAINT employees_hq_territory_id_fkey FOREIGN KEY (hq_territory_id) REFERENCES territories(id);
ALTER TABLE public.employees ADD CONSTRAINT employees_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD CONSTRAINT employees_secondary_manager_id_fkey FOREIGN KEY (secondary_manager_id) REFERENCES auth.users(id);
ALTER TABLE public.employees ADD CONSTRAINT employees_state_territory_id_fkey FOREIGN KEY (state_territory_id) REFERENCES territories(id);
ALTER TABLE public.employees ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.enabled_units ADD CONSTRAINT enabled_units_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES uom_master(id) ON DELETE CASCADE;
ALTER TABLE public.expense_approval_rules ADD CONSTRAINT expense_approval_rules_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE;
ALTER TABLE public.expense_group_members ADD CONSTRAINT expense_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE;
ALTER TABLE public.expense_group_members ADD CONSTRAINT expense_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.external_retailer_list_items ADD CONSTRAINT external_retailer_list_items_list_id_fkey FOREIGN KEY (list_id) REFERENCES external_retailer_lists(id) ON DELETE CASCADE;
ALTER TABLE public.external_retailer_lists ADD CONSTRAINT external_retailer_lists_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.feature_flag_audit ADD CONSTRAINT feature_flag_audit_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);
ALTER TABLE public.feature_flag_audit ADD CONSTRAINT feature_flag_audit_feature_flag_id_fkey FOREIGN KEY (feature_flag_id) REFERENCES feature_flags(id) ON DELETE CASCADE;
ALTER TABLE public.feature_flags ADD CONSTRAINT feature_flags_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.feedback_policies ADD CONSTRAINT feedback_policies_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.feedback_policy_rules ADD CONSTRAINT feedback_policy_rules_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES feedback_policies(id) ON DELETE CASCADE;
ALTER TABLE public.feedback_questions ADD CONSTRAINT feedback_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.fy_period_targets ADD CONSTRAINT fy_period_targets_fy_config_id_fkey FOREIGN KEY (fy_config_id) REFERENCES fy_target_config(id) ON DELETE CASCADE;
ALTER TABLE public.fy_target_config ADD CONSTRAINT fy_target_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.gamification_actions ADD CONSTRAINT gamification_actions_game_id_fkey FOREIGN KEY (game_id) REFERENCES gamification_games(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_daily_tracking ADD CONSTRAINT gamification_daily_tracking_action_id_fkey FOREIGN KEY (action_id) REFERENCES gamification_actions(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_games ADD CONSTRAINT gamification_games_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.gamification_points ADD CONSTRAINT gamification_points_action_id_fkey FOREIGN KEY (action_id) REFERENCES gamification_actions(id);
ALTER TABLE public.gamification_points ADD CONSTRAINT gamification_points_game_id_fkey FOREIGN KEY (game_id) REFERENCES gamification_games(id) ON DELETE CASCADE;
ALTER TABLE public.gamification_points ADD CONSTRAINT gamification_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.gamification_redemptions ADD CONSTRAINT gamification_redemptions_game_id_fkey FOREIGN KEY (game_id) REFERENCES gamification_games(id);
ALTER TABLE public.gamification_redemptions ADD CONSTRAINT gamification_redemptions_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id);
ALTER TABLE public.gamification_redemptions ADD CONSTRAINT gamification_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.goods_receipt_notes ADD CONSTRAINT goods_receipt_notes_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id);
ALTER TABLE public.goods_receipt_notes ADD CONSTRAINT goods_receipt_notes_order_id_fkey FOREIGN KEY (order_id) REFERENCES primary_orders(id);
ALTER TABLE public.gps_tracking ADD CONSTRAINT gps_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES goods_receipt_notes(id) ON DELETE CASCADE;
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES primary_order_items(id);
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES uom_master(id);
ALTER TABLE public.hierarchy_target_allocations ADD CONSTRAINT hierarchy_target_allocations_hierarchy_target_id_fkey FOREIGN KEY (hierarchy_target_id) REFERENCES hierarchy_targets(id) ON DELETE CASCADE;
ALTER TABLE public.hierarchy_target_allocations ADD CONSTRAINT hierarchy_target_allocations_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES profiles(id);
ALTER TABLE public.hierarchy_target_allocations ADD CONSTRAINT hierarchy_target_allocations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.hierarchy_target_history ADD CONSTRAINT hierarchy_target_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);
ALTER TABLE public.hierarchy_target_history ADD CONSTRAINT hierarchy_target_history_hierarchy_target_id_fkey FOREIGN KEY (hierarchy_target_id) REFERENCES hierarchy_targets(id) ON DELETE SET NULL;
ALTER TABLE public.hierarchy_target_history ADD CONSTRAINT hierarchy_target_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.hierarchy_targets ADD CONSTRAINT hierarchy_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.hierarchy_targets ADD CONSTRAINT hierarchy_targets_root_user_id_fkey FOREIGN KEY (root_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.hierarchy_targets ADD CONSTRAINT hierarchy_targets_target_plan_id_fkey FOREIGN KEY (target_plan_id) REFERENCES target_plans(id);
ALTER TABLE public.holidays ADD CONSTRAINT holidays_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.inst_accounts ADD CONSTRAINT inst_accounts_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES inst_accounts(id);
ALTER TABLE public.inst_collections ADD CONSTRAINT inst_collections_account_id_fkey FOREIGN KEY (account_id) REFERENCES inst_accounts(id);
ALTER TABLE public.inst_collections ADD CONSTRAINT inst_collections_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES inst_invoices(id);
ALTER TABLE public.inst_contacts ADD CONSTRAINT inst_contacts_account_id_fkey FOREIGN KEY (account_id) REFERENCES inst_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.inst_invoice_lines ADD CONSTRAINT inst_invoice_lines_commitment_line_id_fkey FOREIGN KEY (commitment_line_id) REFERENCES inst_order_commitment_lines(id);
ALTER TABLE public.inst_invoice_lines ADD CONSTRAINT inst_invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES inst_invoices(id) ON DELETE CASCADE;
ALTER TABLE public.inst_invoice_lines ADD CONSTRAINT inst_invoice_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES inst_products(id);
ALTER TABLE public.inst_invoices ADD CONSTRAINT inst_invoices_account_id_fkey FOREIGN KEY (account_id) REFERENCES inst_accounts(id);
ALTER TABLE public.inst_invoices ADD CONSTRAINT inst_invoices_order_commitment_id_fkey FOREIGN KEY (order_commitment_id) REFERENCES inst_order_commitments(id);
ALTER TABLE public.inst_opportunities ADD CONSTRAINT inst_opportunities_account_id_fkey FOREIGN KEY (account_id) REFERENCES inst_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.inst_opportunities ADD CONSTRAINT inst_opportunities_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES inst_contacts(id);
ALTER TABLE public.inst_order_commitment_lines ADD CONSTRAINT inst_order_commitment_lines_order_commitment_id_fkey FOREIGN KEY (order_commitment_id) REFERENCES inst_order_commitments(id) ON DELETE CASCADE;
ALTER TABLE public.inst_order_commitment_lines ADD CONSTRAINT inst_order_commitment_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES inst_products(id);
ALTER TABLE public.inst_order_commitments ADD CONSTRAINT inst_order_commitments_account_id_fkey FOREIGN KEY (account_id) REFERENCES inst_accounts(id);
ALTER TABLE public.inst_order_commitments ADD CONSTRAINT inst_order_commitments_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES inst_opportunities(id);
ALTER TABLE public.inst_order_commitments ADD CONSTRAINT inst_order_commitments_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES inst_quotes(id);
ALTER TABLE public.inst_price_book_entries ADD CONSTRAINT inst_price_book_entries_price_book_id_fkey FOREIGN KEY (price_book_id) REFERENCES inst_price_books(id) ON DELETE CASCADE;
ALTER TABLE public.inst_price_book_entries ADD CONSTRAINT inst_price_book_entries_product_id_fkey FOREIGN KEY (product_id) REFERENCES inst_products(id) ON DELETE CASCADE;
ALTER TABLE public.inst_price_books ADD CONSTRAINT inst_price_books_account_id_fkey FOREIGN KEY (account_id) REFERENCES inst_accounts(id);
ALTER TABLE public.inst_quote_line_items ADD CONSTRAINT inst_quote_line_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES inst_products(id);
ALTER TABLE public.inst_quote_line_items ADD CONSTRAINT inst_quote_line_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES inst_quotes(id) ON DELETE CASCADE;
ALTER TABLE public.inst_quotes ADD CONSTRAINT inst_quotes_account_id_fkey FOREIGN KEY (account_id) REFERENCES inst_accounts(id);
ALTER TABLE public.inst_quotes ADD CONSTRAINT inst_quotes_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES inst_contacts(id);
ALTER TABLE public.inst_quotes ADD CONSTRAINT inst_quotes_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES inst_opportunities(id);
ALTER TABLE public.inst_quotes ADD CONSTRAINT inst_quotes_price_book_id_fkey FOREIGN KEY (price_book_id) REFERENCES inst_price_books(id);
ALTER TABLE public.inventory_batches ADD CONSTRAINT inventory_batches_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_beat_plan_id_fkey FOREIGN KEY (beat_plan_id) REFERENCES beat_plans(id);
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_fse_user_id_fkey FOREIGN KEY (fse_user_id) REFERENCES auth.users(id);
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES auth.users(id);
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id);
ALTER TABLE public.joint_sales_feedback ADD CONSTRAINT joint_sales_feedback_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id);
ALTER TABLE public.joint_sales_sessions ADD CONSTRAINT joint_sales_sessions_beat_plan_id_fkey FOREIGN KEY (beat_plan_id) REFERENCES beat_plans(id);
ALTER TABLE public.joint_sales_sessions ADD CONSTRAINT joint_sales_sessions_fse_user_id_fkey FOREIGN KEY (fse_user_id) REFERENCES auth.users(id);
ALTER TABLE public.joint_sales_sessions ADD CONSTRAINT joint_sales_sessions_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES auth.users(id);
ALTER TABLE public.leave_accrual_log ADD CONSTRAINT leave_accrual_log_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE;
ALTER TABLE public.leave_applications ADD CONSTRAINT fk_leave_applications_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.leave_applications ADD CONSTRAINT leave_applications_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES leave_types(id);
ALTER TABLE public.leave_approval_workflow ADD CONSTRAINT leave_approval_workflow_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE;
ALTER TABLE public.leave_balance ADD CONSTRAINT fk_leave_balance_leave_type_id FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT;
ALTER TABLE public.leave_balance ADD CONSTRAINT fk_leave_balance_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.leave_balance ADD CONSTRAINT leave_balance_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES leave_types(id);
ALTER TABLE public.leave_holidays_bridge ADD CONSTRAINT leave_holidays_bridge_leave_application_id_fkey FOREIGN KEY (leave_application_id) REFERENCES leave_applications(id) ON DELETE CASCADE;
ALTER TABLE public.leave_policy ADD CONSTRAINT leave_policy_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE;
ALTER TABLE public.leave_type_policy_override ADD CONSTRAINT leave_type_policy_override_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE;
ALTER TABLE public.module_usage_logs ADD CONSTRAINT module_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.opening_stock_entries ADD CONSTRAINT opening_stock_entries_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES uom_master(id);
ALTER TABLE public.orders ADD CONSTRAINT orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES profiles(id);
ALTER TABLE public.orders ADD CONSTRAINT orders_event_id_fkey FOREIGN KEY (event_id) REFERENCES activity_events(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_parent_order_id_fkey FOREIGN KEY (parent_order_id) REFERENCES orders(id);
ALTER TABLE public.orders ADD CONSTRAINT orders_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.packing_list_assignments ADD CONSTRAINT packing_list_assignments_packing_list_id_fkey FOREIGN KEY (packing_list_id) REFERENCES packing_lists(id) ON DELETE CASCADE;
ALTER TABLE public.packing_list_item_batches ADD CONSTRAINT packing_list_item_batches_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE RESTRICT;
ALTER TABLE public.packing_list_item_batches ADD CONSTRAINT packing_list_item_batches_packing_list_item_id_fkey FOREIGN KEY (packing_list_item_id) REFERENCES packing_list_items(id) ON DELETE CASCADE;
ALTER TABLE public.packing_list_item_sources ADD CONSTRAINT packing_list_item_sources_packing_list_item_id_fkey FOREIGN KEY (packing_list_item_id) REFERENCES packing_list_items(id) ON DELETE CASCADE;
ALTER TABLE public.packing_list_items ADD CONSTRAINT packing_list_items_packing_list_id_fkey FOREIGN KEY (packing_list_id) REFERENCES packing_lists(id) ON DELETE CASCADE;
ALTER TABLE public.packing_list_items ADD CONSTRAINT packing_list_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES uom_master(id);
ALTER TABLE public.packing_list_orders ADD CONSTRAINT packing_list_orders_packing_list_id_fkey FOREIGN KEY (packing_list_id) REFERENCES packing_lists(id) ON DELETE CASCADE;
ALTER TABLE public.packing_lists ADD CONSTRAINT packing_lists_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id);
ALTER TABLE public.packing_lists ADD CONSTRAINT packing_lists_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
ALTER TABLE public.permission_set_group_permissions ADD CONSTRAINT permission_set_group_permissions_group_id_fkey FOREIGN KEY (group_id) REFERENCES permission_set_groups(id) ON DELETE CASCADE;
ALTER TABLE public.permission_set_group_users ADD CONSTRAINT permission_set_group_users_group_id_fkey FOREIGN KEY (group_id) REFERENCES permission_set_groups(id) ON DELETE CASCADE;
ALTER TABLE public.permission_set_group_users ADD CONSTRAINT permission_set_group_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.petty_cash_funds ADD CONSTRAINT petty_cash_funds_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.petty_cash_funds ADD CONSTRAINT petty_cash_funds_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.petty_cash_limits ADD CONSTRAINT petty_cash_limits_fund_id_fkey FOREIGN KEY (fund_id) REFERENCES petty_cash_funds(id) ON DELETE CASCADE;
ALTER TABLE public.petty_cash_transactions ADD CONSTRAINT petty_cash_transactions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES profiles(id);
ALTER TABLE public.petty_cash_transactions ADD CONSTRAINT petty_cash_transactions_fund_id_fkey FOREIGN KEY (fund_id) REFERENCES petty_cash_funds(id) ON DELETE CASCADE;
ALTER TABLE public.petty_cash_transactions ADD CONSTRAINT petty_cash_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.plan_enabled_metrics ADD CONSTRAINT plan_enabled_metrics_fy_config_id_fkey FOREIGN KEY (fy_config_id) REFERENCES fy_target_config(id) ON DELETE CASCADE;
ALTER TABLE public.plan_enabled_metrics ADD CONSTRAINT plan_enabled_metrics_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES target_metric_definitions(id) ON DELETE CASCADE;
ALTER TABLE public.pm_ai_insights ADD CONSTRAINT pm_ai_insights_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.pm_ai_insights ADD CONSTRAINT pm_ai_insights_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_ideas ADD CONSTRAINT pm_ideas_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_ideas ADD CONSTRAINT pm_ideas_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES profiles(id);
ALTER TABLE public.pm_knowledge_documents ADD CONSTRAINT pm_knowledge_documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_knowledge_documents ADD CONSTRAINT pm_knowledge_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(id);
ALTER TABLE public.pm_milestones ADD CONSTRAINT pm_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_project_members ADD CONSTRAINT pm_project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_project_members ADD CONSTRAINT pm_project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.pm_project_resources ADD CONSTRAINT pm_project_resources_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_project_resources ADD CONSTRAINT pm_project_resources_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.pm_projects ADD CONSTRAINT pm_projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.pm_projects ADD CONSTRAINT pm_projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.pm_projects ADD CONSTRAINT pm_projects_source_template_id_fkey FOREIGN KEY (source_template_id) REFERENCES pm_templates(id) ON DELETE SET NULL;
ALTER TABLE public.pm_risks ADD CONSTRAINT pm_risks_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.pm_risks ADD CONSTRAINT pm_risks_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_sections ADD CONSTRAINT pm_sections_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_sprints ADD CONSTRAINT pm_sprints_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_support_requests ADD CONSTRAINT pm_support_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_support_requests ADD CONSTRAINT pm_support_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES profiles(id);
ALTER TABLE public.pm_task_attachments ADD CONSTRAINT pm_task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES pm_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.pm_task_attachments ADD CONSTRAINT pm_task_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(id);
ALTER TABLE public.pm_task_collaborators ADD CONSTRAINT pm_task_collaborators_task_id_fkey FOREIGN KEY (task_id) REFERENCES pm_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.pm_task_collaborators ADD CONSTRAINT pm_task_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.pm_task_comments ADD CONSTRAINT pm_task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES pm_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.pm_task_comments ADD CONSTRAINT pm_task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.pm_task_dependencies ADD CONSTRAINT pm_task_dependencies_depends_on_task_id_fkey FOREIGN KEY (depends_on_task_id) REFERENCES pm_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.pm_task_dependencies ADD CONSTRAINT pm_task_dependencies_task_id_fkey FOREIGN KEY (task_id) REFERENCES pm_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.pm_task_templates ADD CONSTRAINT pm_task_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.pm_task_templates ADD CONSTRAINT pm_task_templates_project_template_id_fkey FOREIGN KEY (project_template_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_tasks ADD CONSTRAINT pm_tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.pm_tasks ADD CONSTRAINT pm_tasks_collaborator_id_fkey FOREIGN KEY (collaborator_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.pm_tasks ADD CONSTRAINT pm_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.pm_tasks ADD CONSTRAINT pm_tasks_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES pm_milestones(id) ON DELETE SET NULL;
ALTER TABLE public.pm_tasks ADD CONSTRAINT pm_tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES pm_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.pm_tasks ADD CONSTRAINT pm_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_tasks ADD CONSTRAINT pm_tasks_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.pm_tasks ADD CONSTRAINT pm_tasks_section_id_fkey FOREIGN KEY (section_id) REFERENCES pm_sections(id) ON DELETE SET NULL;
ALTER TABLE public.pm_tasks ADD CONSTRAINT pm_tasks_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES pm_sprints(id) ON DELETE SET NULL;
ALTER TABLE public.pm_template_attachments ADD CONSTRAINT pm_template_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES pm_template_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.pm_template_attachments ADD CONSTRAINT pm_template_attachments_template_id_fkey FOREIGN KEY (template_id) REFERENCES pm_templates(id) ON DELETE CASCADE;
ALTER TABLE public.pm_template_attachments ADD CONSTRAINT pm_template_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);
ALTER TABLE public.pm_template_dependencies ADD CONSTRAINT pm_template_dependencies_depends_on_task_id_fkey FOREIGN KEY (depends_on_task_id) REFERENCES pm_template_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.pm_template_dependencies ADD CONSTRAINT pm_template_dependencies_task_id_fkey FOREIGN KEY (task_id) REFERENCES pm_template_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.pm_template_dependencies ADD CONSTRAINT pm_template_dependencies_template_id_fkey FOREIGN KEY (template_id) REFERENCES pm_templates(id) ON DELETE CASCADE;
ALTER TABLE public.pm_template_sections ADD CONSTRAINT pm_template_sections_template_id_fkey FOREIGN KEY (template_id) REFERENCES pm_templates(id) ON DELETE CASCADE;
ALTER TABLE public.pm_template_tasks ADD CONSTRAINT pm_template_tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES pm_template_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.pm_template_tasks ADD CONSTRAINT pm_template_tasks_section_id_fkey FOREIGN KEY (section_id) REFERENCES pm_template_sections(id) ON DELETE SET NULL;
ALTER TABLE public.pm_template_tasks ADD CONSTRAINT pm_template_tasks_template_id_fkey FOREIGN KEY (template_id) REFERENCES pm_templates(id) ON DELETE CASCADE;
ALTER TABLE public.pm_templates ADD CONSTRAINT pm_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.pm_time_logs ADD CONSTRAINT pm_time_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm_projects(id) ON DELETE CASCADE;
ALTER TABLE public.pm_time_logs ADD CONSTRAINT pm_time_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES pm_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.pm_time_logs ADD CONSTRAINT pm_time_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.price_book_entries ADD CONSTRAINT price_book_entries_price_book_id_fkey FOREIGN KEY (price_book_id) REFERENCES price_books(id) ON DELETE CASCADE;
ALTER TABLE public.price_book_entries ADD CONSTRAINT price_book_entries_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.price_book_entries ADD CONSTRAINT price_book_entries_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES uom_master(id);
ALTER TABLE public.price_book_entries ADD CONSTRAINT price_book_entries_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
ALTER TABLE public.price_books ADD CONSTRAINT price_books_cloned_from_fkey FOREIGN KEY (cloned_from) REFERENCES price_books(id) ON DELETE SET NULL;
ALTER TABLE public.price_books ADD CONSTRAINT price_books_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.price_books ADD CONSTRAINT price_books_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES territories(id) ON DELETE SET NULL;
ALTER TABLE public.primary_invoices ADD CONSTRAINT primary_invoices_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id);
ALTER TABLE public.primary_invoices ADD CONSTRAINT primary_invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES primary_orders(id);
ALTER TABLE public.primary_order_items ADD CONSTRAINT primary_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES primary_orders(id) ON DELETE CASCADE;
ALTER TABLE public.primary_order_items ADD CONSTRAINT primary_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE public.primary_order_items ADD CONSTRAINT primary_order_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES uom_master(id);
ALTER TABLE public.primary_order_items ADD CONSTRAINT primary_order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id);
ALTER TABLE public.primary_order_schemes ADD CONSTRAINT primary_order_schemes_order_id_fkey FOREIGN KEY (order_id) REFERENCES primary_orders(id) ON DELETE CASCADE;
ALTER TABLE public.primary_order_schemes ADD CONSTRAINT primary_order_schemes_scheme_id_fkey FOREIGN KEY (scheme_id) REFERENCES product_schemes(id);
ALTER TABLE public.primary_order_status_history ADD CONSTRAINT primary_order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES primary_orders(id) ON DELETE CASCADE;
ALTER TABLE public.primary_orders ADD CONSTRAINT primary_orders_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.primary_orders ADD CONSTRAINT primary_orders_packing_list_id_fkey FOREIGN KEY (packing_list_id) REFERENCES packing_lists(id) ON DELETE SET NULL;
ALTER TABLE public.primary_orders ADD CONSTRAINT primary_orders_parent_order_id_fkey FOREIGN KEY (parent_order_id) REFERENCES primary_orders(id);
ALTER TABLE public.primary_orders ADD CONSTRAINT primary_orders_source_distributor_id_fkey FOREIGN KEY (source_distributor_id) REFERENCES distributors(id);
ALTER TABLE public.primary_orders ADD CONSTRAINT primary_orders_target_distributor_id_fkey FOREIGN KEY (target_distributor_id) REFERENCES distributors(id);
ALTER TABLE public.primary_return_items ADD CONSTRAINT primary_return_items_return_note_id_fkey FOREIGN KEY (return_note_id) REFERENCES primary_return_notes(id) ON DELETE CASCADE;
ALTER TABLE public.primary_return_notes ADD CONSTRAINT primary_return_notes_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id);
ALTER TABLE public.primary_return_notes ADD CONSTRAINT primary_return_notes_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES goods_receipt_notes(id);
ALTER TABLE public.primary_return_notes ADD CONSTRAINT primary_return_notes_order_id_fkey FOREIGN KEY (order_id) REFERENCES primary_orders(id);
ALTER TABLE public.primary_shipments ADD CONSTRAINT primary_shipments_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id);
ALTER TABLE public.primary_shipments ADD CONSTRAINT primary_shipments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES primary_invoices(id);
ALTER TABLE public.primary_shipments ADD CONSTRAINT primary_shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES primary_orders(id);
ALTER TABLE public.product_price_list ADD CONSTRAINT product_price_list_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.product_price_list ADD CONSTRAINT product_price_list_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES uom_master(id);
ALTER TABLE public.product_schemes ADD CONSTRAINT product_schemes_ai_suggestion_id_fkey FOREIGN KEY (ai_suggestion_id) REFERENCES ai_scheme_suggestions(id);
ALTER TABLE public.product_schemes ADD CONSTRAINT product_schemes_category_id_fkey FOREIGN KEY (category_id) REFERENCES product_categories(id);
ALTER TABLE public.product_schemes ADD CONSTRAINT product_schemes_free_product_id_fkey FOREIGN KEY (free_product_id) REFERENCES products(id);
ALTER TABLE public.product_schemes ADD CONSTRAINT product_schemes_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.product_schemes ADD CONSTRAINT product_schemes_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id);
ALTER TABLE public.product_uom_mapping ADD CONSTRAINT product_uom_mapping_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.product_uom_mapping ADD CONSTRAINT product_uom_mapping_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES uom_master(id) ON DELETE RESTRICT;
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES product_categories(id);
ALTER TABLE public.products ADD CONSTRAINT products_default_purchase_uom_id_fkey FOREIGN KEY (default_purchase_uom_id) REFERENCES uom_master(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD CONSTRAINT products_default_sales_uom_id_fkey FOREIGN KEY (default_sales_uom_id) REFERENCES uom_master(id);
ALTER TABLE public.products ADD CONSTRAINT products_price_basis_uom_id_fkey FOREIGN KEY (price_basis_uom_id) REFERENCES uom_master(id);
ALTER TABLE public.profile_attachments ADD CONSTRAINT profile_attachments_attached_by_fkey FOREIGN KEY (attached_by) REFERENCES auth.users(id);
ALTER TABLE public.profile_attachments ADD CONSTRAINT profile_attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profile_object_permissions ADD CONSTRAINT profile_object_permissions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES security_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES role_definitions(id);
ALTER TABLE public.push_content_execution_log ADD CONSTRAINT push_content_execution_log_post_id_fkey FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE SET NULL;
ALTER TABLE public.push_content_execution_log ADD CONSTRAINT push_content_execution_log_template_id_fkey FOREIGN KEY (template_id) REFERENCES push_content_templates(id) ON DELETE CASCADE;
ALTER TABLE public.push_content_execution_log ADD CONSTRAINT push_content_execution_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.push_content_posts ADD CONSTRAINT push_content_posts_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES user_push_content_subscriptions(id);
ALTER TABLE public.push_content_posts ADD CONSTRAINT push_content_posts_template_id_fkey FOREIGN KEY (template_id) REFERENCES push_content_templates(id);
ALTER TABLE public.recommendation_feedback ADD CONSTRAINT recommendation_feedback_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE;
ALTER TABLE public.recommendation_feedback ADD CONSTRAINT recommendation_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.regularization_requests ADD CONSTRAINT fk_regularization_requests_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_credit_scores ADD CONSTRAINT retailer_credit_scores_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_gift_redemptions ADD CONSTRAINT retailer_gift_redemptions_gift_id_fkey FOREIGN KEY (gift_id) REFERENCES retailer_loyalty_gifts(id);
ALTER TABLE public.retailer_gift_redemptions ADD CONSTRAINT retailer_gift_redemptions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES retailer_gift_subscriptions(id);
ALTER TABLE public.retailer_gift_subscriptions ADD CONSTRAINT retailer_gift_subscriptions_gift_id_fkey FOREIGN KEY (gift_id) REFERENCES retailer_loyalty_gifts(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_loyalty_actions ADD CONSTRAINT retailer_loyalty_actions_program_id_fkey FOREIGN KEY (program_id) REFERENCES retailer_loyalty_programs(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_loyalty_feedback ADD CONSTRAINT retailer_loyalty_feedback_action_id_fkey FOREIGN KEY (action_id) REFERENCES retailer_loyalty_actions(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_loyalty_gifts ADD CONSTRAINT retailer_loyalty_gifts_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES retailer_loyalty_plans(id) ON DELETE SET NULL;
ALTER TABLE public.retailer_loyalty_parameters ADD CONSTRAINT retailer_loyalty_parameters_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES retailer_loyalty_plans(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_loyalty_points ADD CONSTRAINT retailer_loyalty_points_action_id_fkey FOREIGN KEY (action_id) REFERENCES retailer_loyalty_actions(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_loyalty_points ADD CONSTRAINT retailer_loyalty_points_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES retailer_loyalty_parameters(id);
ALTER TABLE public.retailer_loyalty_points ADD CONSTRAINT retailer_loyalty_points_program_id_fkey FOREIGN KEY (program_id) REFERENCES retailer_loyalty_programs(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_loyalty_points ADD CONSTRAINT retailer_loyalty_points_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_loyalty_programs ADD CONSTRAINT retailer_loyalty_programs_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public.retailer_loyalty_redemptions ADD CONSTRAINT retailer_loyalty_redemptions_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES profiles(id);
ALTER TABLE public.retailer_loyalty_redemptions ADD CONSTRAINT retailer_loyalty_redemptions_program_id_fkey FOREIGN KEY (program_id) REFERENCES retailer_loyalty_programs(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_loyalty_redemptions ADD CONSTRAINT retailer_loyalty_redemptions_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_loyalty_reward_redemptions ADD CONSTRAINT retailer_loyalty_reward_redemptions_program_id_fkey FOREIGN KEY (program_id) REFERENCES retailer_loyalty_programs(id);
ALTER TABLE public.retailer_loyalty_reward_redemptions ADD CONSTRAINT retailer_loyalty_reward_redemptions_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id);
ALTER TABLE public.retailer_loyalty_reward_redemptions ADD CONSTRAINT retailer_loyalty_reward_redemptions_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES retailer_loyalty_rewards(id);
ALTER TABLE public.retailer_loyalty_rewards ADD CONSTRAINT retailer_loyalty_rewards_program_id_fkey FOREIGN KEY (program_id) REFERENCES retailer_loyalty_programs(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_loyalty_tracking ADD CONSTRAINT retailer_loyalty_tracking_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.retailer_visit_logs ADD CONSTRAINT retailer_visit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.retailer_visit_logs ADD CONSTRAINT retailer_visit_logs_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id);
ALTER TABLE public.retailers ADD CONSTRAINT retailers_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id);
ALTER TABLE public.retailers ADD CONSTRAINT retailers_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.retailers ADD CONSTRAINT retailers_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES territories(id);
ALTER TABLE public.role_targets ADD CONSTRAINT role_targets_kpi_id_fkey FOREIGN KEY (kpi_id) REFERENCES target_kpi_definitions(id) ON DELETE CASCADE;
ALTER TABLE public.role_targets ADD CONSTRAINT role_targets_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES territories(id);
ALTER TABLE public.saved_reports ADD CONSTRAINT saved_reports_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE SET NULL;
ALTER TABLE public.saved_reports ADD CONSTRAINT saved_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.scheme_applicability ADD CONSTRAINT scheme_applicability_scheme_id_fkey FOREIGN KEY (scheme_id) REFERENCES product_schemes(id) ON DELETE CASCADE;
ALTER TABLE public.sensitive_data_access_log ADD CONSTRAINT sensitive_data_access_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.social_comments ADD CONSTRAINT social_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE;
ALTER TABLE public.social_comments ADD CONSTRAINT social_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.social_likes ADD CONSTRAINT social_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE;
ALTER TABLE public.social_likes ADD CONSTRAINT social_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_template_id_fkey FOREIGN KEY (template_id) REFERENCES push_content_templates(id) ON DELETE SET NULL;
ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.social_reactions ADD CONSTRAINT social_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.stockist_attachments ADD CONSTRAINT stockist_attachments_stockist_id_fkey FOREIGN KEY (stockist_id) REFERENCES vendors(id) ON DELETE CASCADE;
ALTER TABLE public.stockist_contacts ADD CONSTRAINT stockist_contacts_reports_to_fkey FOREIGN KEY (reports_to) REFERENCES stockist_contacts(id) ON DELETE SET NULL;
ALTER TABLE public.stockist_contacts ADD CONSTRAINT stockist_contacts_stockist_id_fkey FOREIGN KEY (stockist_id) REFERENCES vendors(id) ON DELETE CASCADE;
ALTER TABLE public.stockist_locations ADD CONSTRAINT stockist_locations_stockist_id_fkey FOREIGN KEY (stockist_id) REFERENCES vendors(id) ON DELETE CASCADE;
ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);
ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.target_actual_logs ADD CONSTRAINT target_actual_logs_kpi_id_fkey FOREIGN KEY (kpi_id) REFERENCES target_kpi_definitions(id);
ALTER TABLE public.target_breakdowns ADD CONSTRAINT target_breakdowns_fy_config_id_fkey FOREIGN KEY (fy_config_id) REFERENCES fy_target_config(id) ON DELETE CASCADE;
ALTER TABLE public.target_breakdowns ADD CONSTRAINT target_breakdowns_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.target_plans ADD CONSTRAINT target_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.target_plans ADD CONSTRAINT target_plans_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES target_policies(id) ON DELETE CASCADE;
ALTER TABLE public.target_policies ADD CONSTRAINT target_policies_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.target_policies ADD CONSTRAINT target_policies_target_type_id_fkey FOREIGN KEY (target_type_id) REFERENCES target_types(id) ON DELETE CASCADE;
ALTER TABLE public.target_setup_master ADD CONSTRAINT target_setup_master_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.target_setup_master ADD CONSTRAINT target_setup_master_state_territory_id_fkey FOREIGN KEY (state_territory_id) REFERENCES territories(id);
ALTER TABLE public.target_setup_master ADD CONSTRAINT target_setup_master_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES territories(id);
ALTER TABLE public.target_types ADD CONSTRAINT target_types_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.tax_components ADD CONSTRAINT tax_components_tax_master_id_fkey FOREIGN KEY (tax_master_id) REFERENCES tax_masters(id) ON DELETE CASCADE;
ALTER TABLE public.tax_masters ADD CONSTRAINT tax_masters_cloned_from_id_fkey FOREIGN KEY (cloned_from_id) REFERENCES tax_masters(id);
ALTER TABLE public.tax_product_map ADD CONSTRAINT tax_product_map_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
ALTER TABLE public.tax_product_map ADD CONSTRAINT tax_product_map_tax_master_id_fkey FOREIGN KEY (tax_master_id) REFERENCES tax_masters(id) ON DELETE CASCADE;
ALTER TABLE public.team_expense_config ADD CONSTRAINT team_expense_config_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.territories ADD CONSTRAINT territories_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.territories ADD CONSTRAINT territories_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.territories ADD CONSTRAINT territories_last_updated_by_fkey FOREIGN KEY (last_updated_by) REFERENCES auth.users(id);
ALTER TABLE public.territories ADD CONSTRAINT territories_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);
ALTER TABLE public.territories ADD CONSTRAINT territories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES territories(id) ON DELETE SET NULL;
ALTER TABLE public.territory_assignment_history ADD CONSTRAINT territory_assignment_history_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES territories(id) ON DELETE CASCADE;
ALTER TABLE public.unhandled_queries ADD CONSTRAINT unhandled_queries_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id);
ALTER TABLE public.uom_master ADD CONSTRAINT uom_master_category_id_fkey FOREIGN KEY (category_id) REFERENCES uom_category(id);
ALTER TABLE public.user_approvals ADD CONSTRAINT user_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES auth.users(id);
ALTER TABLE public.user_approvals ADD CONSTRAINT user_approvals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE;
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.user_business_plan_distributors ADD CONSTRAINT user_business_plan_distributors_business_plan_id_fkey FOREIGN KEY (business_plan_id) REFERENCES user_business_plans(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_distributors ADD CONSTRAINT user_business_plan_distributors_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_month_products ADD CONSTRAINT user_business_plan_month_products_business_plan_id_fkey FOREIGN KEY (business_plan_id) REFERENCES user_business_plans(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_month_products ADD CONSTRAINT user_business_plan_month_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_months ADD CONSTRAINT user_business_plan_months_business_plan_id_fkey FOREIGN KEY (business_plan_id) REFERENCES user_business_plans(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_products ADD CONSTRAINT user_business_plan_products_business_plan_id_fkey FOREIGN KEY (business_plan_id) REFERENCES user_business_plans(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_products ADD CONSTRAINT user_business_plan_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_retailers ADD CONSTRAINT user_business_plan_retailers_business_plan_id_fkey FOREIGN KEY (business_plan_id) REFERENCES user_business_plans(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_retailers ADD CONSTRAINT user_business_plan_retailers_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_territories ADD CONSTRAINT user_business_plan_territories_business_plan_id_fkey FOREIGN KEY (business_plan_id) REFERENCES user_business_plans(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_territories ADD CONSTRAINT user_business_plan_territories_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES territories(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_territory_beats ADD CONSTRAINT user_business_plan_territory_beats_beat_id_fkey FOREIGN KEY (beat_id) REFERENCES beats(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_territory_beats ADD CONSTRAINT user_business_plan_territory_beats_business_plan_id_fkey FOREIGN KEY (business_plan_id) REFERENCES user_business_plans(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plan_territory_beats ADD CONSTRAINT user_business_plan_territory_beats_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES territories(id) ON DELETE CASCADE;
ALTER TABLE public.user_business_plans ADD CONSTRAINT user_business_plans_hierarchy_allocation_id_fkey FOREIGN KEY (hierarchy_allocation_id) REFERENCES hierarchy_target_allocations(id);
ALTER TABLE public.user_business_plans ADD CONSTRAINT user_business_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_competency_monthly_scores ADD CONSTRAINT user_competency_monthly_scores_competency_template_id_fkey FOREIGN KEY (competency_template_id) REFERENCES competency_templates(id) ON DELETE CASCADE;
ALTER TABLE public.user_context ADD CONSTRAINT user_context_last_order_id_fkey FOREIGN KEY (last_order_id) REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE public.user_data_usage ADD CONSTRAINT user_data_usage_session_id_fkey FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.user_expense_config ADD CONSTRAINT user_expense_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_invitations ADD CONSTRAINT user_invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.user_invitations ADD CONSTRAINT user_invitations_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES auth.users(id);
ALTER TABLE public.user_leave_policy ADD CONSTRAINT user_leave_policy_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE;
ALTER TABLE public.user_leave_policy ADD CONSTRAINT user_leave_policy_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_object_permissions ADD CONSTRAINT user_object_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_onboarding_progress ADD CONSTRAINT user_onboarding_progress_task_id_fkey FOREIGN KEY (task_id) REFERENCES onboarding_tasks(id) ON DELETE CASCADE;
ALTER TABLE public.user_onboarding_progress ADD CONSTRAINT user_onboarding_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_page_views ADD CONSTRAINT user_page_views_session_id_fkey FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.user_period_allocations ADD CONSTRAINT user_period_allocations_business_plan_id_fkey FOREIGN KEY (business_plan_id) REFERENCES user_business_plans(id) ON DELETE CASCADE;
ALTER TABLE public.user_period_targets ADD CONSTRAINT user_period_targets_kpi_id_fkey FOREIGN KEY (kpi_id) REFERENCES target_kpi_definitions(id) ON DELETE CASCADE;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES security_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_push_content_subscriptions ADD CONSTRAINT user_push_content_subscriptions_template_id_fkey FOREIGN KEY (template_id) REFERENCES push_content_templates(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.van_beat_assignments ADD CONSTRAINT van_beat_assignments_beat_id_fkey FOREIGN KEY (beat_id) REFERENCES beats(id) ON DELETE CASCADE;
ALTER TABLE public.van_beat_assignments ADD CONSTRAINT van_beat_assignments_van_id_fkey FOREIGN KEY (van_id) REFERENCES vans(id) ON DELETE CASCADE;
ALTER TABLE public.van_closing_stock ADD CONSTRAINT van_closing_stock_van_id_fkey FOREIGN KEY (van_id) REFERENCES vans(id) ON DELETE CASCADE;
ALTER TABLE public.van_closing_stock_items ADD CONSTRAINT van_closing_stock_items_closing_stock_id_fkey FOREIGN KEY (closing_stock_id) REFERENCES van_closing_stock(id) ON DELETE CASCADE;
ALTER TABLE public.van_closing_stock_items ADD CONSTRAINT van_closing_stock_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE public.van_closing_stock_items ADD CONSTRAINT van_closing_stock_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id);
ALTER TABLE public.van_inward_grn ADD CONSTRAINT van_inward_grn_beat_id_fkey FOREIGN KEY (beat_id) REFERENCES beats(id);
ALTER TABLE public.van_inward_grn ADD CONSTRAINT van_inward_grn_van_id_fkey FOREIGN KEY (van_id) REFERENCES vans(id) ON DELETE CASCADE;
ALTER TABLE public.van_inward_grn_items ADD CONSTRAINT van_inward_grn_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES van_inward_grn(id) ON DELETE CASCADE;
ALTER TABLE public.van_inward_grn_items ADD CONSTRAINT van_inward_grn_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE public.van_inward_grn_items ADD CONSTRAINT van_inward_grn_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id);
ALTER TABLE public.van_live_inventory ADD CONSTRAINT van_live_inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE public.van_live_inventory ADD CONSTRAINT van_live_inventory_van_id_fkey FOREIGN KEY (van_id) REFERENCES vans(id) ON DELETE CASCADE;
ALTER TABLE public.van_live_inventory ADD CONSTRAINT van_live_inventory_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id);
ALTER TABLE public.van_order_fulfillment ADD CONSTRAINT van_order_fulfillment_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.van_order_fulfillment ADD CONSTRAINT van_order_fulfillment_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE;
ALTER TABLE public.van_order_fulfillment ADD CONSTRAINT van_order_fulfillment_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE public.van_order_fulfillment ADD CONSTRAINT van_order_fulfillment_van_id_fkey FOREIGN KEY (van_id) REFERENCES vans(id);
ALTER TABLE public.van_order_fulfillment ADD CONSTRAINT van_order_fulfillment_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id);
ALTER TABLE public.van_return_grn ADD CONSTRAINT van_return_grn_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id);
ALTER TABLE public.van_return_grn ADD CONSTRAINT van_return_grn_van_id_fkey FOREIGN KEY (van_id) REFERENCES vans(id) ON DELETE CASCADE;
ALTER TABLE public.van_return_grn ADD CONSTRAINT van_return_grn_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id);
ALTER TABLE public.van_return_grn_items ADD CONSTRAINT van_return_grn_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE public.van_return_grn_items ADD CONSTRAINT van_return_grn_items_return_grn_id_fkey FOREIGN KEY (return_grn_id) REFERENCES van_return_grn(id) ON DELETE CASCADE;
ALTER TABLE public.van_return_grn_items ADD CONSTRAINT van_return_grn_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id);
ALTER TABLE public.van_stock ADD CONSTRAINT van_stock_beat_id_fkey FOREIGN KEY (beat_id) REFERENCES beats(id);
ALTER TABLE public.van_stock ADD CONSTRAINT van_stock_van_id_fkey FOREIGN KEY (van_id) REFERENCES vans(id) ON DELETE CASCADE;
ALTER TABLE public.van_stock_adjustments ADD CONSTRAINT van_stock_adjustments_van_stock_id_fkey FOREIGN KEY (van_stock_id) REFERENCES van_stock(id) ON DELETE CASCADE;
ALTER TABLE public.van_stock_items ADD CONSTRAINT van_stock_items_van_stock_id_fkey FOREIGN KEY (van_stock_id) REFERENCES van_stock(id) ON DELETE CASCADE;
ALTER TABLE public.van_stock_opening_edits ADD CONSTRAINT van_stock_opening_edits_van_stock_id_fkey FOREIGN KEY (van_stock_id) REFERENCES van_stock(id) ON DELETE CASCADE;
ALTER TABLE public.vans ADD CONSTRAINT vans_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES auth.users(id);
ALTER TABLE public.visit_ai_insights ADD CONSTRAINT visit_ai_insights_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;
ALTER TABLE public.visit_ai_insights ADD CONSTRAINT visit_ai_insights_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;
ALTER TABLE public.whatsapp_config ADD CONSTRAINT whatsapp_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.whatsapp_sessions ADD CONSTRAINT whatsapp_sessions_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES retailers(id);
ALTER TABLE public.work_experiences ADD CONSTRAINT work_experiences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.workflow_steps ADD CONSTRAINT workflow_steps_specific_user_id_fkey FOREIGN KEY (specific_user_id) REFERENCES auth.users(id);
ALTER TABLE public.workflow_steps ADD CONSTRAINT workflow_steps_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE;

-- INDEXES (non-constraint)
-- ============================================================

CREATE INDEX idx_activity_events_activity_date ON public.activity_events USING btree (activity_date);
CREATE INDEX idx_activity_events_user_id ON public.activity_events USING btree (user_id);
CREATE INDEX idx_activity_events_visit_id ON public.activity_events USING btree (visit_id);
CREATE INDEX idx_ai_autonomous_actions_action_type ON public.ai_autonomous_actions USING btree (action_type);
CREATE INDEX idx_ai_autonomous_actions_status ON public.ai_autonomous_actions USING btree (status);
CREATE INDEX idx_ai_autonomous_actions_user_id ON public.ai_autonomous_actions USING btree (user_id);
CREATE INDEX idx_ai_feature_feedback_feature ON public.ai_feature_feedback USING btree (feature);
CREATE INDEX idx_ai_feature_feedback_user ON public.ai_feature_feedback USING btree (user_id);
CREATE INDEX idx_ai_insights_expires ON public.ai_insights USING btree (expires_at) WHERE (expires_at IS NOT NULL);
CREATE INDEX idx_ai_insights_priority ON public.ai_insights USING btree (priority, created_at DESC);
CREATE INDEX idx_ai_insights_user_id ON public.ai_insights USING btree (user_id);
CREATE INDEX idx_ai_insights_user_unread ON public.ai_insights USING btree (user_id, is_read) WHERE ((is_read = false) AND (is_dismissed = false));
CREATE INDEX idx_ai_scheme_suggestions_analysis_type ON public.ai_scheme_suggestions USING btree (analysis_type);
CREATE INDEX idx_ai_scheme_suggestions_created_at ON public.ai_scheme_suggestions USING btree (created_at DESC);
CREATE INDEX idx_ai_scheme_suggestions_status ON public.ai_scheme_suggestions USING btree (status);
CREATE INDEX idx_approval_audit_entity ON public.approval_audit_log USING btree (entity_type, entity_id);
CREATE INDEX idx_approval_audit_request ON public.approval_audit_log USING btree (approval_request_id);
CREATE INDEX idx_approval_requests_entity ON public.approval_requests USING btree (entity_type, entity_id);
CREATE INDEX idx_approval_requests_requester ON public.approval_requests USING btree (requester_id);
CREATE INDEX idx_approval_requests_status ON public.approval_requests USING btree (status);
CREATE INDEX idx_approval_steps_approver ON public.approval_steps USING btree (approver_id, status);
CREATE INDEX idx_approval_steps_request ON public.approval_steps USING btree (approval_request_id);
CREATE INDEX idx_attendance_date ON public.attendance USING btree (date);
CREATE INDEX idx_attendance_status ON public.attendance USING btree (status);
CREATE INDEX idx_attendance_user_date_status ON public.attendance USING btree (user_id, date, status);
CREATE INDEX idx_daily_summary_date ON public.attendance_daily_admin_summary USING btree (date DESC);
CREATE INDEX idx_monthly_summary_user_year_month ON public.attendance_user_monthly_summary USING btree (user_id, year, month);
CREATE INDEX idx_monthly_summary_year_month ON public.attendance_user_monthly_summary USING btree (year, month);
CREATE UNIQUE INDEX one_row_auto_end_day ON public.auto_end_day_policy USING btree ((true));
CREATE INDEX idx_beat_plans_user_date ON public.beat_plans USING btree (user_id, plan_date);
CREATE INDEX idx_beats_beat_id ON public.beats USING btree (beat_id);
CREATE INDEX idx_beats_created_by ON public.beats USING btree (created_by);
CREATE INDEX idx_beats_distributor_id ON public.beats USING btree (distributor_id);
CREATE INDEX idx_beats_territory_id ON public.beats USING btree (territory_id);
CREATE INDEX idx_chat_conversations_user_id ON public.chat_conversations USING btree (user_id);
CREATE INDEX idx_chat_feedback_message_id ON public.chat_feedback USING btree (message_id);
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages USING btree (conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at);
CREATE INDEX idx_competency_coaching_notes_scorecard ON public.competency_coaching_notes USING btree (scorecard_id);
CREATE INDEX idx_competency_coaching_notes_user ON public.competency_coaching_notes USING btree (user_id);
CREATE INDEX idx_competency_templates_role ON public.competency_templates USING btree (role_type, is_active);
CREATE INDEX idx_competition_contacts_competitor_id ON public.competition_contacts USING btree (competitor_id);
CREATE INDEX idx_competition_data_retailer_id ON public.competition_data USING btree (retailer_id);
CREATE INDEX idx_competition_data_user_id ON public.competition_data USING btree (user_id);
CREATE INDEX idx_competition_data_visit_id ON public.competition_data USING btree (visit_id);
CREATE INDEX idx_competition_insights_competitor_name ON public.competition_insights USING btree (lower(competitor_name));
CREATE INDEX idx_competition_skus_competitor_id ON public.competition_skus USING btree (competitor_id);
CREATE INDEX idx_counter_sale_items_product_id ON public.counter_sale_items USING btree (product_id);
CREATE INDEX idx_counter_sale_items_sale_id ON public.counter_sale_items USING btree (counter_sale_id);
CREATE INDEX idx_counter_sales_pos_customer_id ON public.counter_sales USING btree (pos_customer_id);
CREATE INDEX idx_counter_sales_sale_date ON public.counter_sales USING btree (sale_date);
CREATE INDEX idx_counter_sales_user_id ON public.counter_sales USING btree (user_id);
CREATE INDEX idx_counter_sales_visit_id ON public.counter_sales USING btree (visit_id);
CREATE INDEX idx_credit_ledger_reference ON public.credit_ledger USING btree (reference_id);
CREATE INDEX idx_credit_ledger_retailer ON public.credit_ledger USING btree (retailer_id);
CREATE INDEX idx_credit_config_territories ON public.credit_management_config USING gin (territory_ids);
CREATE INDEX idx_daily_gps_distance_user_date ON public.daily_gps_distance USING btree (user_id, date);
CREATE INDEX idx_drpl_pl ON public.delivery_run_packing_lists USING btree (packing_list_id);
CREATE INDEX idx_drpl_run ON public.delivery_run_packing_lists USING btree (delivery_run_id);
CREATE INDEX idx_device_battery_logs_recorded_at ON public.device_battery_logs USING btree (recorded_at DESC);
CREATE INDEX idx_device_battery_logs_user_id ON public.device_battery_logs USING btree (user_id);
CREATE INDEX idx_distributor_beat_mappings_beat ON public.distributor_beat_mappings USING btree (beat_id);
CREATE INDEX idx_distributor_beat_mappings_distributor ON public.distributor_beat_mappings USING btree (distributor_id);
CREATE INDEX idx_distributor_plan_months_plan_id ON public.distributor_business_plan_months USING btree (business_plan_id);
CREATE INDEX idx_distributor_business_plans_distributor ON public.distributor_business_plans USING btree (distributor_id);
CREATE INDEX idx_distributor_claims_distributor ON public.distributor_claims USING btree (distributor_id);
CREATE INDEX idx_distributor_claims_status ON public.distributor_claims USING btree (status);
CREATE INDEX idx_distributor_claims_type ON public.distributor_claims USING btree (claim_type);
CREATE INDEX idx_company_returns_distributor ON public.distributor_company_returns USING btree (distributor_id);
CREATE INDEX idx_company_returns_status ON public.distributor_company_returns USING btree (status);
CREATE INDEX idx_distributor_evaluation_tasks_distributor_id ON public.distributor_evaluation_tasks USING btree (distributor_id);
CREATE INDEX idx_distributor_ideas_category ON public.distributor_ideas USING btree (category);
CREATE INDEX idx_distributor_ideas_distributor ON public.distributor_ideas USING btree (distributor_id);
CREATE INDEX idx_distributor_ideas_status ON public.distributor_ideas USING btree (status);
CREATE INDEX idx_distributor_inventory_distributor_id ON public.distributor_inventory USING btree (distributor_id);
CREATE INDEX idx_distributor_inventory_expiry ON public.distributor_inventory USING btree (expiry_date);
CREATE INDEX idx_inventory_warehouse ON public.distributor_inventory USING btree (warehouse_id);
CREATE INDEX idx_dit_product_id ON public.distributor_inventory_transactions USING btree (product_id);
CREATE INDEX idx_dit_transaction_type ON public.distributor_inventory_transactions USING btree (distributor_id, product_id, warehouse_id, transaction_type);
CREATE INDEX idx_inventory_transactions_date ON public.distributor_inventory_transactions USING btree (created_at);
CREATE INDEX idx_inventory_transactions_distributor ON public.distributor_inventory_transactions USING btree (distributor_id);
CREATE INDEX idx_transactions_warehouse ON public.distributor_inventory_transactions USING btree (warehouse_id);
CREATE INDEX idx_dp_distributor_retailer ON public.distributor_payments USING btree (distributor_id, retailer_id);
CREATE INDEX idx_dp_payment_date ON public.distributor_payments USING btree (payment_date);
CREATE INDEX idx_distributor_price_books_active ON public.distributor_price_books USING btree (is_active);
CREATE INDEX idx_distributor_price_books_distributor ON public.distributor_price_books USING btree (distributor_id);
CREATE INDEX idx_drl_distributor_retailer ON public.distributor_retailer_ledger USING btree (distributor_id, retailer_id);
CREATE INDEX idx_drl_transaction_date ON public.distributor_retailer_ledger USING btree (transaction_date);
CREATE INDEX idx_distributor_returns_distributor ON public.distributor_returns USING btree (distributor_id);
CREATE INDEX idx_distributor_returns_retailer ON public.distributor_returns USING btree (retailer_id);
CREATE INDEX idx_distributor_returns_status ON public.distributor_returns USING btree (status);
CREATE INDEX idx_distributor_support_distributor ON public.distributor_support_requests USING btree (distributor_id);
CREATE INDEX idx_distributor_support_priority ON public.distributor_support_requests USING btree (priority);
CREATE INDEX idx_distributor_support_status ON public.distributor_support_requests USING btree (status);
CREATE INDEX idx_distributor_users_auth_user_id ON public.distributor_users USING btree (auth_user_id);
CREATE INDEX idx_distributor_users_distributor_id ON public.distributor_users USING btree (distributor_id);
CREATE INDEX idx_distributor_users_email ON public.distributor_users USING btree (email);
CREATE INDEX idx_distributor_users_is_active ON public.distributor_users USING btree (is_active);
CREATE INDEX idx_distributor_users_status ON public.distributor_users USING btree (user_status);
CREATE INDEX idx_distributors_parent_id ON public.distributors USING btree (parent_id);
CREATE INDEX idx_distributors_parent_type ON public.distributors USING btree (parent_type);
CREATE INDEX idx_distributors_type_id ON public.distributors USING btree (type_id);
CREATE INDEX idx_dic_expires ON public.district_intelligence_cache USING btree (expires_at);
CREATE INDEX idx_dic_state_district ON public.district_intelligence_cache USING btree (state, district);
CREATE INDEX idx_employee_badges_user_id ON public.employee_badges USING btree (user_id);
CREATE INDEX idx_employee_competencies_user_id ON public.employee_competencies USING btree (user_id);
CREATE INDEX idx_employee_connections_follower ON public.employee_connections USING btree (follower_id);
CREATE INDEX idx_employee_connections_following ON public.employee_connections USING btree (following_id);
CREATE INDEX idx_employee_recommendations_user_id ON public.employee_recommendations USING btree (user_id);
CREATE INDEX idx_employees_secondary_manager_id ON public.employees USING btree (secondary_manager_id);
CREATE INDEX idx_enabled_units_order ON public.enabled_units USING btree (display_order);
CREATE INDEX idx_fy_period_targets_config ON public.fy_period_targets USING btree (fy_config_id);
CREATE INDEX idx_fy_period_targets_type ON public.fy_period_targets USING btree (period_type);
CREATE INDEX idx_daily_tracking_action_date ON public.gamification_daily_tracking USING btree (action_id, tracking_date);
CREATE INDEX idx_daily_tracking_user_date ON public.gamification_daily_tracking USING btree (user_id, tracking_date);
CREATE INDEX idx_gamification_points_earned_at ON public.gamification_points USING btree (earned_at);
CREATE INDEX idx_gamification_points_game_id ON public.gamification_points USING btree (game_id);
CREATE INDEX idx_gamification_points_user_id ON public.gamification_points USING btree (user_id);
CREATE INDEX idx_gamification_redemptions_status ON public.gamification_redemptions USING btree (status);
CREATE INDEX idx_gamification_redemptions_user_id ON public.gamification_redemptions USING btree (user_id);
CREATE INDEX idx_retailer_sequences_retailer ON public.gamification_retailer_sequences USING btree (retailer_id);
CREATE INDEX idx_retailer_sequences_user ON public.gamification_retailer_sequences USING btree (user_id);
CREATE UNIQUE INDEX global_leave_policy_singleton ON public.global_leave_policy USING btree ((true));
CREATE UNIQUE INDEX one_row_global_leave ON public.global_leave_policy USING btree ((true));
CREATE INDEX idx_gps_tracking_timestamp ON public.gps_tracking USING btree ("timestamp");
CREATE INDEX idx_gps_tracking_user_date ON public.gps_tracking USING btree (user_id, date);
CREATE INDEX idx_hierarchy_allocations_manager ON public.hierarchy_target_allocations USING btree (manager_id);
CREATE INDEX idx_hierarchy_allocations_target ON public.hierarchy_target_allocations USING btree (hierarchy_target_id);
CREATE INDEX idx_hierarchy_allocations_user ON public.hierarchy_target_allocations USING btree (user_id);
CREATE INDEX idx_hierarchy_history_target ON public.hierarchy_target_history USING btree (hierarchy_target_id);
CREATE INDEX idx_hierarchy_history_user ON public.hierarchy_target_history USING btree (user_id);
CREATE INDEX idx_hierarchy_targets_fy_year ON public.hierarchy_targets USING btree (fy_year);
CREATE INDEX idx_hierarchy_targets_root_user ON public.hierarchy_targets USING btree (root_user_id);
CREATE INDEX idx_holidays_created_by ON public.holidays USING btree (created_by);
CREATE INDEX idx_holidays_year_date ON public.holidays USING btree (year, date);
CREATE INDEX idx_inst_accounts_owner ON public.inst_accounts USING btree (account_owner);
CREATE INDEX idx_inst_collections_invoice ON public.inst_collections USING btree (invoice_id);
CREATE INDEX idx_inst_invoices_account ON public.inst_invoices USING btree (account_id);
CREATE INDEX idx_inst_invoices_status ON public.inst_invoices USING btree (status);
CREATE INDEX idx_inst_leads_assigned ON public.inst_leads USING btree (assigned_to);
CREATE INDEX idx_inst_leads_status ON public.inst_leads USING btree (lead_status);
CREATE INDEX idx_inst_opportunities_account ON public.inst_opportunities USING btree (account_id);
CREATE INDEX idx_inst_opportunities_stage ON public.inst_opportunities USING btree (stage);
CREATE INDEX idx_inst_quotes_account ON public.inst_quotes USING btree (account_id);
CREATE INDEX idx_inst_quotes_status ON public.inst_quotes USING btree (status);
CREATE INDEX idx_batches_warehouse ON public.inventory_batches USING btree (warehouse_id);
CREATE INDEX idx_inventory_batches_lookup ON public.inventory_batches USING btree (distributor_id, product_id, batch_no);
CREATE INDEX idx_invoices_order_id ON public.invoices USING btree (order_id);
CREATE INDEX idx_leave_accrual_log_created_at ON public.leave_accrual_log USING btree (created_at DESC);
CREATE INDEX idx_leave_accrual_log_leave_type ON public.leave_accrual_log USING btree (leave_type_id);
CREATE INDEX idx_leave_accrual_log_user_year ON public.leave_accrual_log USING btree (user_id, year);
CREATE INDEX idx_leave_accrual_log_user_year_type ON public.leave_accrual_log USING btree (user_id, year, leave_type_id);
CREATE INDEX idx_leave_applications_start_date ON public.leave_applications USING btree (start_date);
CREATE INDEX idx_leave_applications_status ON public.leave_applications USING btree (status);
CREATE INDEX idx_leave_applications_user_id ON public.leave_applications USING btree (user_id);
CREATE INDEX idx_leave_applications_user_status ON public.leave_applications USING btree (user_id, status);
CREATE INDEX idx_leave_approval_workflow_leave_type ON public.leave_approval_workflow USING btree (leave_type_id);
CREATE INDEX idx_leave_holidays_bridge_application ON public.leave_holidays_bridge USING btree (leave_application_id);
CREATE INDEX idx_module_usage_module ON public.module_usage_logs USING btree (module_name);
CREATE INDEX idx_module_usage_user_date ON public.module_usage_logs USING btree (user_id, started_at);
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences USING btree (user_id);
CREATE INDEX idx_notification_rules_event_code ON public.notification_rules USING btree (event_code, is_active);
CREATE INDEX idx_notifications_retailer_id ON public.notifications USING btree (retailer_id) WHERE (retailer_id IS NOT NULL);
CREATE INDEX idx_notifications_target_portal ON public.notifications USING btree (target_portal);
CREATE INDEX idx_cancellation_log_order ON public.order_cancellation_log USING btree (order_id);
CREATE INDEX idx_orders_cancelled_at ON public.orders USING btree (cancelled_at) WHERE (cancelled_at IS NOT NULL);
CREATE INDEX idx_orders_credit ON public.orders USING btree (retailer_id, is_credit_order) WHERE (is_credit_order = true);
CREATE INDEX idx_orders_delivery_date ON public.orders USING btree (delivery_date);
CREATE INDEX idx_orders_delivery_status ON public.orders USING btree (delivery_status);
CREATE INDEX idx_orders_event_id ON public.orders USING btree (event_id) WHERE (event_id IS NOT NULL);
CREATE UNIQUE INDEX idx_orders_idempotency_key ON public.orders USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_orders_order_date ON public.orders USING btree (order_date);
CREATE INDEX idx_orders_packing_list ON public.orders USING btree (packing_list_id);
CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);
CREATE INDEX idx_orders_user_date ON public.orders USING btree (user_id, order_date);
CREATE INDEX idx_orders_user_retailer_date ON public.orders USING btree (user_id, retailer_id, created_at);
CREATE INDEX idx_packing_list_assignments_pl ON public.packing_list_assignments USING btree (packing_list_id);
CREATE INDEX idx_plib_batch_id ON public.packing_list_item_batches USING btree (batch_id);
CREATE INDEX idx_plib_pli_id ON public.packing_list_item_batches USING btree (packing_list_item_id);
CREATE INDEX idx_plis_order_item_id ON public.packing_list_item_sources USING btree (order_item_id);
CREATE INDEX idx_plis_pli_id ON public.packing_list_item_sources USING btree (packing_list_item_id);
CREATE INDEX idx_pli_packing_list_id ON public.packing_list_items USING btree (packing_list_id);
CREATE INDEX idx_plo_order ON public.packing_list_orders USING btree (order_id);
CREATE INDEX idx_plo_packing_list ON public.packing_list_orders USING btree (packing_list_id);
CREATE INDEX idx_packing_lists_delivery_date ON public.packing_lists USING btree (delivery_date);
CREATE INDEX idx_packing_lists_distributor ON public.packing_lists USING btree (distributor_id);
CREATE INDEX idx_packing_lists_status ON public.packing_lists USING btree (status);
CREATE INDEX idx_password_reset_attempts_email_time ON public.password_reset_attempts USING btree (email, attempted_at DESC);
CREATE INDEX idx_password_reset_tokens_expires ON public.password_reset_tokens USING btree (expires_at);
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);
CREATE INDEX idx_pincode_master_district ON public.pincode_master USING btree (district);
CREATE INDEX idx_pincode_master_pincode ON public.pincode_master USING btree (pincode);
CREATE INDEX idx_pincode_master_statename ON public.pincode_master USING btree (statename);
CREATE INDEX idx_pincode_top_retailers_pincode_fetched ON public.pincode_top_retailers USING btree (pincode, fetched_at DESC);
CREATE UNIQUE INDEX uq_pincode_top_retailers_pincode_place ON public.pincode_top_retailers USING btree (pincode, place_id) WHERE (place_id IS NOT NULL);
CREATE INDEX idx_pm_ai_insights_project ON public.pm_ai_insights USING btree (project_id, insight_type);
CREATE INDEX idx_pm_sections_project_id ON public.pm_sections USING btree (project_id);
CREATE INDEX idx_pm_task_collaborators_task_id ON public.pm_task_collaborators USING btree (task_id);
CREATE INDEX idx_pm_task_collaborators_user_id ON public.pm_task_collaborators USING btree (user_id);
CREATE INDEX idx_pm_tasks_parent ON public.pm_tasks USING btree (parent_task_id);
CREATE INDEX idx_pm_tasks_project ON public.pm_tasks USING btree (project_id);
CREATE INDEX idx_pm_tasks_section_id ON public.pm_tasks USING btree (section_id);
CREATE INDEX idx_pm_tasks_sprint ON public.pm_tasks USING btree (sprint_id);
CREATE INDEX idx_pm_tasks_status ON public.pm_tasks USING btree (status);
CREATE INDEX idx_pm_time_logs_task ON public.pm_time_logs USING btree (task_id);
CREATE INDEX idx_pm_time_logs_user ON public.pm_time_logs USING btree (user_id);
CREATE INDEX idx_pos_customers_name_lower ON public.pos_customers USING btree (lower(name));
CREATE INDEX idx_pos_customers_phone ON public.pos_customers USING btree (phone) WHERE (phone IS NOT NULL);
CREATE INDEX idx_pos_customers_user_id ON public.pos_customers USING btree (user_id);
CREATE INDEX idx_price_book_entries_price_book ON public.price_book_entries USING btree (price_book_id);
CREATE UNIQUE INDEX price_book_entries_book_product_uom_uniq ON public.price_book_entries USING btree (price_book_id, product_id, COALESCE(uom_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX idx_price_books_active ON public.price_books USING btree (is_active);
CREATE INDEX idx_price_books_type ON public.price_books USING btree (price_book_type);
CREATE INDEX idx_primary_order_items_order_id ON public.primary_order_items USING btree (order_id);
CREATE INDEX idx_primary_order_items_product_id ON public.primary_order_items USING btree (product_id);
CREATE INDEX idx_primary_orders_distributor_id ON public.primary_orders USING btree (distributor_id);
CREATE INDEX idx_primary_orders_order_date ON public.primary_orders USING btree (order_date);
CREATE INDEX idx_primary_orders_status ON public.primary_orders USING btree (status);
CREATE INDEX idx_primary_orders_unassigned ON public.primary_orders USING btree (packing_list_id) WHERE (packing_list_id IS NULL);
CREATE UNIQUE INDEX product_price_list_one_default ON public.product_price_list USING btree (product_id) WHERE (is_default_price = true);
CREATE INDEX product_price_list_product_idx ON public.product_price_list USING btree (product_id);
CREATE INDEX idx_product_schemes_variant_id ON public.product_schemes USING btree (variant_id);
CREATE INDEX idx_pum_product ON public.product_uom_mapping USING btree (product_id);
CREATE INDEX idx_pum_uom ON public.product_uom_mapping USING btree (uom_id);
CREATE UNIQUE INDEX product_uom_mapping_one_price_basis ON public.product_uom_mapping USING btree (product_id) WHERE (is_price_basis = true);
CREATE UNIQUE INDEX uq_product_uom_default_purchase ON public.product_uom_mapping USING btree (product_id) WHERE (is_default_purchase = true);
CREATE INDEX idx_product_variants_active ON public.product_variants USING btree (is_active);
CREATE INDEX idx_product_variants_name_trgm ON public.product_variants USING gin (variant_name gin_trgm_ops);
CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);
CREATE INDEX idx_product_variants_sku ON public.product_variants USING btree (sku);
CREATE INDEX idx_product_variants_sku_trgm ON public.product_variants USING gin (sku gin_trgm_ops);
CREATE INDEX idx_products_focused ON public.products USING btree (is_focused_product) WHERE (is_focused_product = true);
CREATE INDEX idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_sku_trgm ON public.products USING gin (sku gin_trgm_ops);
CREATE UNIQUE INDEX products_product_number_unique ON public.products USING btree (product_number) WHERE (product_number IS NOT NULL);
CREATE INDEX idx_profile_attachments_user_id ON public.profile_attachments USING btree (user_id);
CREATE INDEX idx_profiles_preferred_language ON public.profiles USING btree (preferred_language);
CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);
CREATE INDEX idx_execution_log_execution_time ON public.push_content_execution_log USING btree (execution_time DESC);
CREATE INDEX idx_execution_log_status ON public.push_content_execution_log USING btree (status);
CREATE INDEX idx_execution_log_template_id ON public.push_content_execution_log USING btree (template_id);
CREATE INDEX idx_execution_log_user_id ON public.push_content_execution_log USING btree (user_id);
CREATE INDEX idx_push_content_posts_posted_at ON public.push_content_posts USING btree (posted_at);
CREATE INDEX idx_push_content_posts_user ON public.push_content_posts USING btree (user_id);
CREATE INDEX idx_feedback_recommendation ON public.recommendation_feedback USING btree (recommendation_id);
CREATE INDEX idx_recommendations_created ON public.recommendations USING btree (created_at DESC);
CREATE INDEX idx_recommendations_entity ON public.recommendations USING btree (entity_id, is_active);
CREATE INDEX idx_recommendations_user_type ON public.recommendations USING btree (user_id, recommendation_type, is_active);
CREATE UNIQUE INDEX one_row_regularization ON public.regularization_policy USING btree ((true));
CREATE INDEX idx_regularization_requests_user_date ON public.regularization_requests USING btree (user_id, attendance_date);
CREATE INDEX idx_retailer_credit_scores_retailer_id ON public.retailer_credit_scores USING btree (retailer_id);
CREATE INDEX idx_retailer_credit_scores_score ON public.retailer_credit_scores USING btree (score);
CREATE INDEX idx_ext_match_score ON public.retailer_external_db USING btree (match_score);
CREATE INDEX idx_retailer_ext_state ON public.retailer_external_db USING btree (state);
CREATE INDEX idx_retailer_ext_state_city ON public.retailer_external_db USING btree (state, city);
CREATE INDEX idx_retailer_feedback_date ON public.retailer_feedback USING btree (retailer_id, feedback_date, user_id);
CREATE INDEX idx_gift_redemptions_retailer ON public.retailer_gift_redemptions USING btree (retailer_id);
CREATE INDEX idx_gift_redemptions_status ON public.retailer_gift_redemptions USING btree (status);
CREATE INDEX idx_gift_subscriptions_retailer ON public.retailer_gift_subscriptions USING btree (retailer_id);
CREATE INDEX idx_gift_subscriptions_status ON public.retailer_gift_subscriptions USING btree (status);
CREATE INDEX idx_loyalty_feedback_action ON public.retailer_loyalty_feedback USING btree (action_id);
CREATE INDEX idx_loyalty_feedback_date ON public.retailer_loyalty_feedback USING btree (feedback_date);
CREATE INDEX idx_loyalty_feedback_user ON public.retailer_loyalty_feedback USING btree (fse_user_id);
CREATE INDEX idx_loyalty_gifts_plan_id ON public.retailer_loyalty_gifts USING btree (plan_id);
CREATE INDEX idx_loyalty_parameters_plan_id ON public.retailer_loyalty_parameters USING btree (plan_id);
CREATE INDEX idx_loyalty_parameters_type ON public.retailer_loyalty_parameters USING btree (parameter_type);
CREATE INDEX idx_loyalty_points_parameter ON public.retailer_loyalty_points USING btree (parameter_id);
CREATE INDEX idx_retailer_loyalty_points_program ON public.retailer_loyalty_points USING btree (program_id);
CREATE INDEX idx_retailer_loyalty_points_retailer ON public.retailer_loyalty_points USING btree (retailer_id, earned_at DESC);
CREATE INDEX idx_retailer_loyalty_redemptions_retailer ON public.retailer_loyalty_redemptions USING btree (retailer_id, requested_at DESC);
CREATE INDEX idx_retailer_loyalty_redemptions_status ON public.retailer_loyalty_redemptions USING btree (status);
CREATE INDEX idx_reward_redemptions_retailer ON public.retailer_loyalty_reward_redemptions USING btree (retailer_id);
CREATE INDEX idx_reward_redemptions_status ON public.retailer_loyalty_reward_redemptions USING btree (status);
CREATE INDEX idx_loyalty_rewards_active ON public.retailer_loyalty_rewards USING btree (is_active);
CREATE INDEX idx_loyalty_rewards_program ON public.retailer_loyalty_rewards USING btree (program_id);
CREATE INDEX idx_retailer_loyalty_tracking_retailer ON public.retailer_loyalty_tracking USING btree (retailer_id);
CREATE INDEX idx_retailer_visit_logs_retailer ON public.retailer_visit_logs USING btree (retailer_id);
CREATE INDEX idx_retailer_visit_logs_user_date ON public.retailer_visit_logs USING btree (user_id, visit_date);
CREATE INDEX idx_retailer_visit_logs_visit ON public.retailer_visit_logs USING btree (visit_id);
CREATE INDEX idx_retailers_distributor_id ON public.retailers USING btree (distributor_id);
CREATE INDEX idx_retailers_entity_type ON public.retailers USING btree (entity_type);
CREATE INDEX idx_retailers_owner_id ON public.retailers USING btree (owner_id);
CREATE INDEX idx_retailers_phone ON public.retailers USING btree (phone);
CREATE INDEX idx_retailers_territory_id ON public.retailers USING btree (territory_id);
CREATE INDEX idx_retailers_user_beat ON public.retailers USING btree (user_id, beat_id);
CREATE INDEX idx_retailers_user_category ON public.retailers USING btree (user_id, category);
CREATE INDEX idx_retailers_user_status ON public.retailers USING btree (user_id, status);
CREATE INDEX idx_retailers_verified ON public.retailers USING btree (verified);
CREATE INDEX idx_saved_reports_user_id ON public.saved_reports USING btree (user_id);
CREATE INDEX idx_scheme_applicability_level ON public.scheme_applicability USING btree (applicability_level, entity_id);
CREATE INDEX idx_scheme_applicability_scheme ON public.scheme_applicability USING btree (scheme_id);
CREATE INDEX idx_access_log_table_action ON public.sensitive_data_access_log USING btree (table_name, action, accessed_at DESC);
CREATE INDEX idx_access_log_user_time ON public.sensitive_data_access_log USING btree (user_id, accessed_at DESC);
CREATE INDEX idx_social_comments_post_id ON public.social_comments USING btree (post_id);
CREATE INDEX idx_social_likes_post_id ON public.social_likes USING btree (post_id);
CREATE INDEX idx_social_post_attachments_post_id ON public.social_post_attachments USING btree (post_id);
CREATE INDEX idx_social_posts_created_at ON public.social_posts USING btree (created_at DESC);
CREATE INDEX idx_social_posts_is_automated ON public.social_posts USING btree (is_automated) WHERE (is_automated = true);
CREATE INDEX idx_social_posts_scheduled_time ON public.social_posts USING btree (scheduled_time) WHERE (scheduled_time IS NOT NULL);
CREATE INDEX idx_social_posts_template_id ON public.social_posts USING btree (template_id) WHERE (template_id IS NOT NULL);
CREATE INDEX idx_social_posts_user_id ON public.social_posts USING btree (user_id);
CREATE INDEX idx_social_reactions_post_id ON public.social_reactions USING btree (post_id);
CREATE INDEX idx_stock_composite ON public.stock USING btree (user_id, retailer_id, visit_id, product_id);
CREATE INDEX idx_stock_product ON public.stock USING btree (product_id);
CREATE INDEX idx_stock_user_retailer_visit ON public.stock USING btree (user_id, retailer_id, visit_id);
CREATE INDEX idx_stock_cycle_product ON public.stock_cycle_data USING btree (product_id);
CREATE INDEX idx_stock_cycle_user_retailer ON public.stock_cycle_data USING btree (user_id, retailer_id);
CREATE INDEX idx_stock_cycle_visit_date ON public.stock_cycle_data USING btree (visit_date DESC);
CREATE INDEX idx_territories_assigned_distributors ON public.territories USING gin (assigned_distributor_ids);
CREATE INDEX idx_territories_assigned_user ON public.territories USING btree (assigned_user_id);
CREATE INDEX idx_territories_assigned_users ON public.territories USING gin (assigned_user_ids);
CREATE INDEX idx_territories_parent_id ON public.territories USING btree (parent_id);
CREATE INDEX idx_territory_assignment_history_territory_id ON public.territory_assignment_history USING btree (territory_id);
CREATE INDEX idx_territory_assignment_history_user_id ON public.territory_assignment_history USING btree (assigned_user_id);
CREATE UNIQUE INDEX idx_unhandled_queries_dedup ON public.unhandled_queries USING btree (phone, message, created_date);
CREATE INDEX idx_unhandled_queries_phone ON public.unhandled_queries USING btree (phone);
CREATE INDEX idx_unhandled_queries_status ON public.unhandled_queries USING btree (status);
CREATE INDEX idx_user_business_plan_distributors_distributor_id ON public.user_business_plan_distributors USING btree (distributor_id);
CREATE INDEX idx_user_business_plan_distributors_plan_id ON public.user_business_plan_distributors USING btree (business_plan_id);
CREATE INDEX idx_user_business_plan_month_products_month ON public.user_business_plan_month_products USING btree (business_plan_id, month_number);
CREATE INDEX idx_user_business_plan_month_products_plan_id ON public.user_business_plan_month_products USING btree (business_plan_id);
CREATE INDEX idx_user_competency_monthly_scores_competency ON public.user_competency_monthly_scores USING btree (competency_template_id);
CREATE INDEX idx_user_competency_monthly_scores_user_month ON public.user_competency_monthly_scores USING btree (user_id, month_year);
CREATE INDEX idx_user_data_usage_session_id ON public.user_data_usage USING btree (session_id);
CREATE INDEX idx_user_data_usage_user_id ON public.user_data_usage USING btree (user_id);
CREATE INDEX idx_user_monthly_scorecards_manager ON public.user_monthly_scorecards USING btree (manager_id);
CREATE INDEX idx_user_monthly_scorecards_user_month ON public.user_monthly_scorecards USING btree (user_id, month_year);
CREATE INDEX idx_user_page_views_session_id ON public.user_page_views USING btree (session_id);
CREATE INDEX idx_user_page_views_user_id ON public.user_page_views USING btree (user_id);
CREATE INDEX idx_user_page_views_visited_at ON public.user_page_views USING btree (visited_at);
CREATE INDEX idx_user_period_allocations_plan ON public.user_period_allocations USING btree (business_plan_id);
CREATE INDEX idx_user_period_allocations_type ON public.user_period_allocations USING btree (period_type);
CREATE INDEX idx_user_push_subscriptions_template ON public.user_push_content_subscriptions USING btree (template_id);
CREATE INDEX idx_user_push_subscriptions_user ON public.user_push_content_subscriptions USING btree (user_id);
CREATE INDEX idx_user_sessions_login_at ON public.user_sessions USING btree (login_at);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);
CREATE INDEX idx_van_closing_stock_van_date ON public.van_closing_stock USING btree (van_id, closing_date);
CREATE INDEX idx_van_inward_grn_van_date ON public.van_inward_grn USING btree (van_id, grn_date);
CREATE INDEX idx_van_inward_grn_items_grn ON public.van_inward_grn_items USING btree (grn_id);
CREATE INDEX idx_van_live_inventory_van_date ON public.van_live_inventory USING btree (van_id, date);
CREATE INDEX idx_van_order_fulfillment_order ON public.van_order_fulfillment USING btree (order_id);
CREATE INDEX idx_van_return_grn_van_date ON public.van_return_grn USING btree (van_id, return_date);
CREATE INDEX idx_van_return_grn_items_return ON public.van_return_grn_items USING btree (return_grn_id);
CREATE INDEX idx_van_stock_opening_edits_created_at ON public.van_stock_opening_edits USING btree (created_at);
CREATE INDEX idx_van_stock_opening_edits_user_id ON public.van_stock_opening_edits USING btree (user_id);
CREATE INDEX idx_van_stock_opening_edits_van_stock_id ON public.van_stock_opening_edits USING btree (van_stock_id);
CREATE INDEX idx_vans_assigned_user_id ON public.vans USING btree (assigned_user_id);
CREATE INDEX idx_visit_ai_insights_user_retailer ON public.visit_ai_insights USING btree (user_id, retailer_id);
CREATE INDEX idx_visits_user_date ON public.visits USING btree (user_id, planned_date);
CREATE INDEX idx_warehouses_distributor ON public.warehouses USING btree (distributor_id);
CREATE UNIQUE INDEX one_default_per_distributor ON public.warehouses USING btree (distributor_id) WHERE (is_default = true);
CREATE UNIQUE INDEX idx_wa_session_phone ON public.whatsapp_sessions USING btree (phone_number);

-- ============================================================
-- VIEWS
-- ============================================================

-- View: public.orders_total_amount
CREATE OR REPLACE VIEW public.orders_total_amount AS
 SELECT total_amount
   FROM orders;

-- View: public.productive_summary_daywise
CREATE OR REPLACE VIEW public.productive_summary_daywise AS
 SELECT to_char((planned_date)::timestamp with time zone, 'FMMonth DD, YYYY'::text) AS planned_date,
    count(CASE WHEN (status = 'productive'::text) THEN 1 ELSE NULL::integer END) AS productive_visits,
    count(CASE WHEN (status = 'unproductive'::text) THEN 1 ELSE NULL::integer END) AS unproductive_visits,
    count(id) AS total_visits,
    round((((count(CASE WHEN (status = 'productive'::text) THEN 1 ELSE NULL::integer END))::numeric / (NULLIF(count(id), 0))::numeric) * (100)::numeric), 2) AS productivity_percentage
   FROM visits v
  WHERE ((status = ANY (ARRAY['productive'::text, 'unproductive'::text])) AND ((planned_date >= '2025-12-01'::date) AND (planned_date <= '2025-12-26'::date)))
  GROUP BY planned_date
  ORDER BY v.planned_date DESC;

-- View: public.productive_summary_week
CREATE OR REPLACE VIEW public.productive_summary_week AS
 SELECT to_char((planned_date)::timestamp with time zone, 'FMMonth DD, YYYY'::text) AS planned_date,
    count(CASE WHEN (status = 'productive'::text) THEN 1 ELSE NULL::integer END) AS productive_visits,
    count(CASE WHEN (status = 'unproductive'::text) THEN 1 ELSE NULL::integer END) AS unproductive_visits,
    count(id) AS total_visits,
    round((((count(CASE WHEN (status = 'productive'::text) THEN 1 ELSE NULL::integer END))::numeric / (NULLIF(count(id), 0))::numeric) * (100)::numeric), 2) AS productivity_percentage
   FROM visits v
  WHERE ((status = ANY (ARRAY['productive'::text, 'unproductive'::text])) AND ((planned_date >= '2025-12-15'::date) AND (planned_date <= '2025-12-26'::date)))
  GROUP BY planned_date
  ORDER BY v.planned_date DESC;

-- View: public.productive_view
CREATE OR REPLACE VIEW public.productive_view AS
 SELECT p.full_name,
    count(CASE WHEN (v.status = 'productive'::text) THEN 1 ELSE NULL::integer END) AS productive_visits,
    count(v.id) AS total_visits,
    round((((count(CASE WHEN (v.status = 'productive'::text) THEN 1 ELSE NULL::integer END))::numeric / (NULLIF(count(v.id), 0))::numeric) * (100)::numeric), 2) AS productivity_percentage
   FROM (visits v
     LEFT JOIN profiles p ON ((v.user_id = p.id)))
  WHERE ((v.status = ANY (ARRAY['productive'::text, 'unproductive'::text])) AND ((v.planned_date >= '2025-12-01'::date) AND (v.planned_date <= '2025-12-26'::date)))
  GROUP BY p.full_name;

-- View: public.retailer_loyalty_balance
CREATE OR REPLACE VIEW public.retailer_loyalty_balance AS
 SELECT retailer_id,
    COALESCE(sum(points), (0)::numeric) AS total_points,
    count(*) AS total_transactions
   FROM retailer_loyalty_points
  GROUP BY retailer_id;

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.allocate_inventory_batches(p_distributor_id uuid, p_product_id uuid, p_required_qty integer, p_strategy text DEFAULT 'FEFO'::text, p_warehouse_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch RECORD;
  v_remaining INTEGER := p_required_qty;
  v_alloc_qty INTEGER;
  v_allocations JSONB := '[]'::JSONB;
  v_total_allocated INTEGER := 0;
  v_available INTEGER;
BEGIN
  FOR v_batch IN
    SELECT id, batch_no, expiry_date, quantity, reserved_qty
    FROM inventory_batches
    WHERE distributor_id = p_distributor_id
      AND product_id = p_product_id
      AND (quantity - reserved_qty) > 0
      AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
      AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
    ORDER BY
      CASE WHEN p_strategy = 'FEFO' THEN expiry_date END ASC NULLS LAST,
      CASE WHEN p_strategy = 'FIFO' THEN created_at END ASC,
      CASE WHEN p_strategy = 'LIFO' THEN created_at END DESC
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_available := v_batch.quantity - v_batch.reserved_qty;
    v_alloc_qty := LEAST(v_available, v_remaining);

    v_allocations := v_allocations || jsonb_build_object(
      'batch_id', v_batch.id,
      'batch_no', v_batch.batch_no,
      'expiry_date', v_batch.expiry_date,
      'allocated_qty', v_alloc_qty,
      'available_qty', v_available
    );

    v_total_allocated := v_total_allocated + v_alloc_qty;
    v_remaining := v_remaining - v_alloc_qty;
  END LOOP;

  RETURN jsonb_build_object(
    'allocations', v_allocations,
    'total_allocated', v_total_allocated,
    'shortfall_qty', GREATEST(0, v_remaining)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_regularization_to_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
  v_check_in timestamptz;
  v_check_out timestamptz;
  v_total_hours numeric;
  v_policy RECORD;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN

    -- Fetch policy settings
    SELECT update_attendance_on_approval, recalculate_hours
    INTO v_policy
    FROM regularization_policy LIMIT 1;

    -- If policy says don't update attendance, just return
    IF v_policy IS NOT NULL AND v_policy.update_attendance_on_approval = false THEN
      RETURN NEW;
    END IF;

    SELECT id INTO v_existing_id
    FROM attendance
    WHERE user_id = NEW.user_id AND date = NEW.attendance_date;

    IF v_existing_id IS NOT NULL THEN
      UPDATE attendance SET
        check_in_time  = COALESCE(NEW.requested_check_in_time::timestamptz, check_in_time),
        check_out_time = COALESCE(NEW.requested_check_out_time::timestamptz, check_out_time),
        status = 'regularized',
        regularized_request_id = NEW.id,
        total_hours = CASE
          WHEN (v_policy IS NULL OR v_policy.recalculate_hours = true)
               AND COALESCE(NEW.requested_check_out_time::timestamptz, check_out_time) IS NOT NULL
               AND COALESCE(NEW.requested_check_in_time::timestamptz, check_in_time) IS NOT NULL
          THEN ROUND(
            EXTRACT(EPOCH FROM (
              COALESCE(NEW.requested_check_out_time::timestamptz, check_out_time)
              - COALESCE(NEW.requested_check_in_time::timestamptz, check_in_time)
            )) / 3600.0, 2
          )
          ELSE total_hours
        END,
        updated_at = now()
      WHERE id = v_existing_id;
    ELSE
      v_check_in  := NEW.requested_check_in_time::timestamptz;
      v_check_out := NEW.requested_check_out_time::timestamptz;

      IF (v_policy IS NULL OR v_policy.recalculate_hours = true)
         AND v_check_in IS NOT NULL AND v_check_out IS NOT NULL THEN
        v_total_hours := ROUND(EXTRACT(EPOCH FROM (v_check_out - v_check_in)) / 3600.0, 2);
      ELSE
        v_total_hours := NULL;
      END IF;

      INSERT INTO attendance (
        user_id, date, check_in_time, check_out_time,
        status, regularized_request_id, total_hours
      ) VALUES (
        NEW.user_id, NEW.attendance_date, v_check_in, v_check_out,
        'regularized', NEW.id, v_total_hours
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_approve_regularization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_approval_mode text;
BEGIN
  SELECT approval_mode INTO v_approval_mode
  FROM regularization_policy LIMIT 1;

  IF v_approval_mode = 'auto' THEN
    NEW.status := 'approved';
    NEW.approved_at := now();
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_ledger_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO distributor_retailer_ledger (
    distributor_id, retailer_id, transaction_date, transaction_type,
    reference_id, reference_number, description,
    debit_amount, credit_amount, payment_mode, created_by
  ) VALUES (
    NEW.distributor_id, NEW.retailer_id, NEW.payment_date, 'payment',
    NEW.id::text, NEW.receipt_number,
    'Payment received via ' || NEW.payment_mode,
    0, NEW.amount, NEW.payment_mode, NEW.created_by
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_ledger_on_secondary_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO distributor_retailer_ledger (
    distributor_id, retailer_id, transaction_date, transaction_type,
    reference_number, description, debit_amount, credit_amount
  ) VALUES (
    NEW.distributor_id, NEW.retailer_id, NEW.invoice_date, 'invoice',
    NEW.invoice_number, 'Invoice ' || NEW.invoice_number,
    NEW.total_amount, 0
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_seed_system_admin_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip if the inserting profile is already a system profile
  IF EXISTS (SELECT 1 FROM security_profiles WHERE id = NEW.profile_id AND is_system = true) THEN
    RETURN NEW;
  END IF;

  -- Auto-insert for all system admin profiles if not already present
  INSERT INTO profile_object_permissions (
    profile_id, object_name, permission_type, parent_module,
    can_read, can_create, can_edit, can_delete, can_view_all, can_modify_all
  )
  SELECT
    sp.id, NEW.object_name, NEW.permission_type, NEW.parent_module,
    true, true, true, true, true, true
  FROM security_profiles sp
  WHERE sp.is_system = true
    AND NOT EXISTS (
      SELECT 1 FROM profile_object_permissions pop
      WHERE pop.profile_id = sp.id
        AND pop.object_name = NEW.object_name
        AND pop.permission_type = NEW.permission_type
    );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_update_visit_status_on_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_visit_id UUID;
BEGIN
  -- Only process confirmed orders
  IF NEW.status = 'confirmed' THEN
    -- First try to use the provided visit_id
    target_visit_id := NEW.visit_id;
    
    -- If no visit_id provided, find the most recent visit for this retailer today
    IF target_visit_id IS NULL AND NEW.retailer_id IS NOT NULL AND NEW.user_id IS NOT NULL THEN
      SELECT id INTO target_visit_id
      FROM visits
      WHERE retailer_id = NEW.retailer_id
        AND user_id = NEW.user_id
        AND planned_date = NEW.order_date
        AND status IN ('planned', 'in-progress', 'unproductive')
      ORDER BY created_at DESC
      LIMIT 1;
      
      -- Log for debugging
      RAISE LOG 'auto_update_visit_status_on_order: order % has NULL visit_id, found visit %', NEW.id, target_visit_id;
    END IF;
    
    -- Update the visit if found
    IF target_visit_id IS NOT NULL THEN
      UPDATE visits
      SET 
        status = 'productive',
        check_out_time = COALESCE(check_out_time, NEW.created_at),
        no_order_reason = NULL,
        updated_at = NOW()
      WHERE id = target_visit_id
        AND status IN ('planned', 'in-progress', 'unproductive');
        
      RAISE LOG 'auto_update_visit_status_on_order: updated visit % to productive', target_visit_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calc_transaction_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prev_balance INTEGER;
  v_inward BOOLEAN;
  v_movement INTEGER;
BEGIN
  -- Movement amount comes in via balance_qty (callers pass a positive integer).
  v_movement := COALESCE(NEW.balance_qty, 0);

  -- Get previous running balance for this product+distributor (per-warehouse)
  SELECT running_balance INTO v_prev_balance
  FROM public.distributor_inventory_transactions
  WHERE distributor_id = NEW.distributor_id
    AND product_id = NEW.product_id
    AND COALESCE(warehouse_id::text, '') = COALESCE(NEW.warehouse_id::text, '')
    AND id != NEW.id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  v_prev_balance := COALESCE(v_prev_balance, 0);

  -- Inward types add to the running balance; everything else subtracts.
  v_inward := NEW.transaction_type IN ('GRN', 'OPENING_STOCK', 'RETURN', 'ADJUSTMENT_IN', 'RELEASE');

  IF v_inward THEN
    NEW.running_balance := v_prev_balance + ABS(v_movement);
  ELSE
    NEW.running_balance := v_prev_balance - ABS(v_movement);
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_beat_adherence(p_user_id uuid, p_start date, p_end date)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  planned_count INTEGER;
  actual_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO planned_count
  FROM public.beat_plans bp
  WHERE bp.user_id = p_user_id AND bp.plan_date BETWEEN p_start AND p_end;
  
  SELECT COUNT(DISTINCT v.id) INTO actual_count
  FROM public.visits v
  JOIN public.beat_plans bp ON v.beat_id = bp.beat_id AND v.planned_date = bp.plan_date
  WHERE v.user_id = p_user_id AND v.planned_date BETWEEN p_start AND p_end
    AND v.status IN ('productive', 'unproductive');
  
  IF planned_count = 0 THEN RETURN 0; END IF;
  RETURN ROUND((actual_count::NUMERIC / planned_count::NUMERIC) * 100, 2);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_leave_days(p_start_date date, p_end_date date, p_leave_type_id uuid, p_is_half_day boolean DEFAULT false)
 RETURNS TABLE(total_days numeric, sandwich_days integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sandwich_enabled BOOLEAN;
  v_base_days NUMERIC;
  v_sandwich_count INTEGER := 0;
BEGIN
  -- Get sandwich rule setting
  SELECT COALESCE(sandwich_rule_enabled, false) INTO v_sandwich_enabled
  FROM leave_policy WHERE leave_type_id = p_leave_type_id AND is_active = true;
  
  -- Calculate base days
  v_base_days := (p_end_date - p_start_date + 1);
  
  IF p_is_half_day THEN
    v_base_days := 0.5;
  END IF;
  
  -- If sandwich rule enabled, count weekends/holidays between
  IF v_sandwich_enabled AND NOT p_is_half_day THEN
    SELECT COUNT(*) INTO v_sandwich_count
    FROM generate_series(p_start_date, p_end_date, '1 day'::interval) d
    LEFT JOIN holidays h ON h.holiday_date = d::DATE
    WHERE EXTRACT(DOW FROM d) IN (0, 6) OR h.id IS NOT NULL;
  END IF;
  
  RETURN QUERY SELECT v_base_days, v_sandwich_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_new_retailers(p_user_id uuid, p_start date, p_end date)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::NUMERIC
  FROM public.retailers
  WHERE user_id = p_user_id
    AND created_at::DATE BETWEEN p_start AND p_end;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_productive_visits(p_user_id uuid, p_start date, p_end date)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(DISTINCT v.id)::NUMERIC
  FROM public.visits v
  WHERE v.user_id = p_user_id
    AND v.planned_date BETWEEN p_start AND p_end
    AND v.status = 'productive';
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_revenue_contribution(p_user_id uuid, p_start date, p_end date)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(total_amount), 0)
  FROM public.orders
  WHERE user_id = p_user_id
    AND status IN ('confirmed', 'delivered')
    AND order_date BETWEEN p_start AND p_end;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_user_kpi_actual(p_user_id uuid, p_kpi_key text, p_start date, p_end date)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  CASE p_kpi_key
    WHEN 'revenue_contribution' THEN 
      RETURN calculate_revenue_contribution(p_user_id, p_start, p_end);
    WHEN 'new_retailer_addition' THEN 
      RETURN calculate_new_retailers(p_user_id, p_start, p_end);
    WHEN 'productive_visits' THEN 
      RETURN calculate_productive_visits(p_user_id, p_start, p_end);
    WHEN 'beat_adherence' THEN 
      RETURN calculate_beat_adherence(p_user_id, p_start, p_end);
    WHEN 'visit_completion_rate' THEN
      RETURN calculate_visit_completion_rate(p_user_id, p_start, p_end);
    ELSE 
      RETURN 0;
  END CASE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_visit_completion_rate(p_user_id uuid, p_start date, p_end date)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  planned_count INTEGER;
  completed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO planned_count
  FROM public.visits
  WHERE user_id = p_user_id AND planned_date BETWEEN p_start AND p_end;
  
  SELECT COUNT(*) INTO completed_count
  FROM public.visits
  WHERE user_id = p_user_id 
    AND planned_date BETWEEN p_start AND p_end
    AND status IN ('productive', 'unproductive');
  
  IF planned_count = 0 THEN RETURN 0; END IF;
  RETURN ROUND((completed_count::NUMERIC / planned_count::NUMERIC) * 100, 2);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_access_invitation(_invitation_token text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_invitations 
    WHERE invitation_token = _invitation_token
      AND status = 'pending'
      AND expires_at > now()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.can_access_object(user_id_param uuid, object_name_param text, permission_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  has_permission BOOLEAN := false;
  is_admin BOOLEAN;
BEGIN
  -- Admins have full access
  SELECT has_role(user_id_param, 'admin'::app_role) INTO is_admin;
  IF is_admin THEN
    RETURN true;
  END IF;
  
  -- Check profile permissions
  SELECT CASE permission_type
    WHEN 'read' THEN COALESCE(pop.can_read, false)
    WHEN 'create' THEN COALESCE(pop.can_create, false)
    WHEN 'edit' THEN COALESCE(pop.can_edit, false)
    WHEN 'delete' THEN COALESCE(pop.can_delete, false)
    WHEN 'view_all' THEN COALESCE(pop.can_view_all, false)
    WHEN 'modify_all' THEN COALESCE(pop.can_modify_all, false)
    ELSE false
  END INTO has_permission
  FROM profile_object_permissions pop
  JOIN user_profiles up ON up.profile_id = pop.profile_id
  WHERE up.user_id = user_id_param
    AND pop.object_name = object_name_param;
  
  RETURN COALESCE(has_permission, false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_access_packing_list(_packing_list_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_dist_id uuid;
BEGIN
  v_dist_id := public.get_distributor_id_for_auth_user();
  IF v_dist_id IS NULL THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.packing_lists pl
    WHERE pl.id = _packing_list_id
      AND (pl.distributor_id = v_dist_id
           OR pl.distributor_id IN (SELECT id FROM public.distributors WHERE parent_id = v_dist_id))
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_distributor(_distributor_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.distributors
    WHERE id = _distributor_id
      AND (
        -- Self: the distributor the user belongs to
        id = public.get_distributor_id_for_auth_user()
        OR
        -- Direct child: parent_id matches the user's distributor
        parent_id = public.get_distributor_id_for_auth_user()
      )
  )
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_employee(_target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (auth.uid() = _target_user_id) 
    OR is_system_admin(auth.uid());
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_profile(_target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (auth.uid() = _target_user_id) 
    OR is_system_admin(auth.uid());
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_order_atomic(p_order_id uuid, p_reason text, p_cancelled_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_visit RECORD;
  v_credit_reversed NUMERIC := 0;
  v_gamification_points_reversed NUMERIC := 0;
  v_loyalty_points_reversed NUMERIC := 0;
  v_invoice_cancelled BOOLEAN := false;
  v_visit_reverted BOOLEAN := false;
  v_other_confirmed_orders INT;
  v_gam_row RECORD;
  v_loyalty_row RECORD;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', true, 'already_cancelled', true);
  END IF;

  IF v_order.status NOT IN ('confirmed', 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel order with status: ' || v_order.status);
  END IF;

  UPDATE orders SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = p_reason,
    cancelled_by = p_cancelled_by,
    updated_at = now()
  WHERE id = p_order_id;

  UPDATE invoices SET
    status = 'cancelled',
    updated_at = now()
  WHERE order_id = p_order_id AND status != 'cancelled';

  IF FOUND THEN
    v_invoice_cancelled := true;
  END IF;

  IF v_order.is_credit_order AND v_order.credit_pending_amount > 0 THEN
    v_credit_reversed := v_order.credit_pending_amount;

    INSERT INTO credit_ledger (retailer_id, amount, type, reference_id, created_by)
    VALUES (v_order.retailer_id, -v_credit_reversed, 'order_cancel', p_order_id, p_cancelled_by);
  END IF;

  UPDATE retailers SET
    last_order_date = (
      SELECT MAX(order_date) FROM orders
      WHERE retailer_id = v_order.retailer_id
      AND status = 'confirmed'
      AND id != p_order_id
    ),
    updated_at = now()
  WHERE id = v_order.retailer_id;

  IF v_order.visit_id IS NOT NULL THEN
    SELECT * INTO v_visit FROM visits WHERE id = v_order.visit_id;

    IF FOUND AND v_visit.status = 'productive' AND COALESCE(v_visit.completion_source, 'order') = 'order' THEN
      SELECT COUNT(*) INTO v_other_confirmed_orders
      FROM orders
      WHERE visit_id = v_order.visit_id
      AND id != p_order_id
      AND status = 'confirmed';

      IF v_other_confirmed_orders = 0 THEN
        UPDATE visits SET
          status = 'planned',
          completion_source = NULL,
          updated_at = now()
        WHERE id = v_order.visit_id;

        v_visit_reverted := true;
      END IF;
    END IF;
  END IF;

  -- Gamification reversal using real table schema
  FOR v_gam_row IN
    SELECT game_id, user_id, action_id, SUM(points) AS points_to_reverse
    FROM gamification_points
    WHERE reference_id = p_order_id
      AND reference_type = 'order'
      AND points > 0
    GROUP BY game_id, user_id, action_id
  LOOP
    INSERT INTO gamification_points (
      game_id,
      user_id,
      action_id,
      points,
      reference_type,
      reference_id,
      earned_at,
      metadata
    ) VALUES (
      v_gam_row.game_id,
      v_gam_row.user_id,
      v_gam_row.action_id,
      -v_gam_row.points_to_reverse,
      'order',
      p_order_id,
      now(),
      jsonb_build_object('type', 'order_cancellation_reversal', 'order_id', p_order_id)
    );

    v_gamification_points_reversed := v_gamification_points_reversed + v_gam_row.points_to_reverse;
  END LOOP;

  -- Loyalty reversal using real table schema
  FOR v_loyalty_row IN
    SELECT
      program_id,
      retailer_id,
      action_id,
      COALESCE(awarded_by_user_id, p_cancelled_by) AS awarded_by_user_id,
      SUM(points) AS points_to_reverse
    FROM retailer_loyalty_points
    WHERE reference_id = p_order_id
      AND points > 0
    GROUP BY program_id, retailer_id, action_id, COALESCE(awarded_by_user_id, p_cancelled_by)
  LOOP
    INSERT INTO retailer_loyalty_points (
      program_id,
      retailer_id,
      action_id,
      points,
      reference_type,
      reference_id,
      earned_at,
      awarded_by_user_id,
      metadata,
      description,
      visit_id
    ) VALUES (
      v_loyalty_row.program_id,
      v_loyalty_row.retailer_id,
      v_loyalty_row.action_id,
      -v_loyalty_row.points_to_reverse,
      'order',
      p_order_id,
      now(),
      v_loyalty_row.awarded_by_user_id,
      jsonb_build_object('type', 'order_cancellation_reversal', 'order_id', p_order_id),
      'Order cancellation reversal',
      v_order.visit_id
    );

    v_loyalty_points_reversed := v_loyalty_points_reversed + v_loyalty_row.points_to_reverse;
  END LOOP;

  UPDATE gamification_retailer_sequences
  SET consecutive_orders = GREATEST(0, consecutive_orders - 1),
      updated_at = now()
  WHERE user_id = v_order.user_id
  AND retailer_id = v_order.retailer_id;

  UPDATE gamification_daily_tracking
  SET count = GREATEST(0, count - 1),
      updated_at = now()
  WHERE user_id = v_order.user_id
  AND tracking_date = v_order.order_date;

  INSERT INTO order_cancellation_log (order_id, reason, cancelled_by, reversal_summary)
  VALUES (
    p_order_id,
    p_reason,
    p_cancelled_by,
    jsonb_build_object(
      'credit_reversed', v_credit_reversed,
      'gamification_points_reversed', v_gamification_points_reversed,
      'loyalty_points_reversed', v_loyalty_points_reversed,
      'invoice_cancelled', v_invoice_cancelled,
      'visit_reverted', v_visit_reverted,
      'retailer_id', v_order.retailer_id,
      'order_date', v_order.order_date
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'credit_reversed', v_credit_reversed,
    'gamification_points_reversed', v_gamification_points_reversed,
    'loyalty_points_reversed', v_loyalty_points_reversed,
    'invoice_cancelled', v_invoice_cancelled,
    'visit_reverted', v_visit_reverted,
    'retailer_id', v_order.retailer_id,
    'order_date', v_order.order_date
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_packing_list_reservations(p_packing_list_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rec RECORD;
  v_total_released INTEGER := 0;
  v_dist_id UUID;
  v_release_qty INTEGER;
  v_status TEXT;
  v_order_type TEXT;
BEGIN
  SELECT distributor_id, status, order_type
  INTO v_dist_id, v_status, v_order_type
  FROM packing_lists
  WHERE id = p_packing_list_id;

  IF v_dist_id IS NULL AND v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Packing list not found');
  END IF;

  IF v_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already cancelled');
  END IF;

  -- Release all batch reservations
  FOR v_rec IN
    SELECT plib.id AS plib_id, plib.batch_id, plib.allocated_qty, plib.picked_qty,
           pli.product_id
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
    FOR UPDATE OF plib
  LOOP
    v_release_qty := v_rec.allocated_qty;

    IF v_release_qty > 0 THEN
      UPDATE inventory_batches
      SET reserved_qty = GREATEST(0, reserved_qty - v_release_qty)
      WHERE id = v_rec.batch_id;

      v_total_released := v_total_released + v_release_qty;
    END IF;
  END LOOP;

  -- Update distributor_inventory by recalculating from batches
  IF v_dist_id IS NOT NULL THEN
    UPDATE distributor_inventory di
    SET reserved_quantity = COALESCE((
      SELECT SUM(ib.reserved_qty) FROM inventory_batches ib
      WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id
        AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)
    ), 0)
    WHERE di.distributor_id = v_dist_id
      AND di.product_id IN (SELECT DISTINCT pli.product_id FROM packing_list_items pli WHERE pli.packing_list_id = p_packing_list_id);
  END IF;

  -- Reset backorder_qty on source order items
  FOR v_rec IN
    SELECT plis.order_item_id
    FROM packing_list_item_sources plis
    JOIN packing_list_items pli ON pli.id = plis.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id AND plis.order_item_id IS NOT NULL
  LOOP
    UPDATE order_items SET backorder_qty = 0 WHERE id = v_rec.order_item_id;
    UPDATE primary_order_items SET backorder_qty = 0 WHERE id = v_rec.order_item_id;
  END LOOP;

  -- Update packing list status to cancelled
  UPDATE packing_lists
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_packing_list_id;

  -- Reset linked orders
  IF v_order_type = 'primary' THEN
    UPDATE primary_orders
    SET packing_list_id = NULL, status = 'confirmed'
    WHERE packing_list_id = p_packing_list_id AND status != 'delivered';
  ELSE
    UPDATE orders
    SET packing_list_id = NULL, delivery_status = 'pending', updated_at = now()
    WHERE packing_list_id = p_packing_list_id AND delivery_status != 'delivered';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_released', v_total_released,
    'status', 'cancelled'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_duplicate_competitor(competitor_name_param text)
 RETURNS TABLE(is_duplicate boolean, competitor_id uuid, competitor_name text, competitor_image_url text, product_details text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    TRUE as is_duplicate,
    ci.id as competitor_id,
    ci.competitor_name,
    ci.competitor_image_url,
    ci.product_details
  FROM public.competition_insights ci
  WHERE LOWER(TRIM(ci.competitor_name)) = LOWER(TRIM(competitor_name_param))
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.check_opening_stock_exists(p_distributor_id uuid, p_product_id uuid, p_warehouse_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Multi-batch opening stock now allowed; never block from UI.
  RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clamp_inventory_batch_available()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max INTEGER;
BEGIN
  v_max := GREATEST(0, COALESCE(NEW.quantity,0) - COALESCE(NEW.reserved_qty,0));
  IF NEW.available_qty IS NULL OR NEW.available_qty > v_max THEN
    NEW.available_qty := v_max;
  END IF;
  IF NEW.available_qty < 0 THEN
    NEW.available_qty := 0;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_insights()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM ai_insights 
  WHERE expires_at IS NOT NULL 
    AND expires_at < now();
  
  -- Also delete old dismissed insights (older than 7 days)
  DELETE FROM ai_insights 
  WHERE is_dismissed = true 
    AND created_at < now() - interval '7 days';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_recommendations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.recommendations
  SET is_active = false
  WHERE expires_at < now() AND is_active = true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < now() OR used = true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_execution_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.push_content_execution_log
  WHERE execution_time < NOW() - INTERVAL '30 days';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_approval_request(p_entity_type text, p_entity_id uuid, p_requester_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_chain RECORD;
  v_config RECORD;
  v_request_id uuid;
  v_levels integer := 0;
BEGIN
  -- Get config for this entity type
  SELECT * INTO v_config 
  FROM approval_config 
  WHERE entity_type = p_entity_type;

  -- Count levels from reporting chain
  FOR v_chain IN 
    SELECT manager_id, level 
    FROM get_reporting_chain(p_requester_id)
    ORDER BY level
    LIMIT COALESCE(v_config.max_levels, 10)
  LOOP
    v_levels := v_levels + 1;
  END LOOP;

  -- If no chain, use 1 level (admin must approve)
  IF v_levels = 0 THEN
    v_levels := 1;
  END IF;

  -- Create master request
  INSERT INTO approval_requests (entity_type, entity_id, requester_id, current_level, total_levels, status)
  VALUES (p_entity_type, p_entity_id, p_requester_id, 1, v_levels, 'pending')
  RETURNING id INTO v_request_id;

  -- Create a step for each manager in chain
  FOR v_chain IN 
    SELECT manager_id, level 
    FROM get_reporting_chain(p_requester_id)
    ORDER BY level
    LIMIT COALESCE(v_config.max_levels, 10)
  LOOP
    INSERT INTO approval_steps (approval_request_id, level, approver_id, status)
    VALUES (v_request_id, v_chain.level, v_chain.manager_id, 'pending');
  END LOOP;

  -- Log submission event
  INSERT INTO approval_audit_log (approval_request_id, entity_type, entity_id, action, performed_by, level, metadata)
  VALUES (v_request_id, p_entity_type, p_entity_id, 'submitted', p_requester_id, 0, 
          jsonb_build_object('total_levels', v_levels));

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_approval_workflow(user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    approver_rec RECORD;
BEGIN
    -- Insert approval records for each level
    FOR approver_rec IN 
        SELECT user_id as approver_id, approver_level 
        FROM public.approvers 
        WHERE is_active = true 
        ORDER BY approver_level
    LOOP
        INSERT INTO public.user_approvals (user_id, approver_id, approval_level)
        VALUES (user_id_param, approver_rec.approver_id, approver_rec.approver_level);
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_packing_list_atomic(p_order_ids uuid[], p_items jsonb, p_delivery_date date, p_distributor_id uuid, p_order_type text DEFAULT 'secondary'::text, p_total_value numeric DEFAULT 0, p_warehouse_id uuid DEFAULT NULL::uuid, p_batch_allocations jsonb DEFAULT NULL::jsonb, p_strategy text DEFAULT 'FEFO'::text, p_sources jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_packing_list_id uuid;
  v_packing_list_number text;
  v_item jsonb;
  v_pl_item_id uuid;
  v_alloc jsonb;
  v_batch record;
  v_remaining numeric;
  v_alloc_qty numeric;
  v_source jsonb;
  v_total_items integer := 0;
  v_manual_batch jsonb;
  v_already_assigned text;
  v_available numeric;
  v_total_shortfall numeric := 0;
  v_uom_id uuid;
  v_uom_code text;
  v_conv numeric;
  v_qty numeric;
  v_base_qty numeric;
BEGIN
  -- IDEMPOTENCY CHECK
  IF p_order_type = 'secondary' THEN
    SELECT string_agg(o.id::text, ', ') INTO v_already_assigned
    FROM orders o WHERE o.id = ANY(p_order_ids) AND o.packing_list_id IS NOT NULL;
  ELSE
    SELECT string_agg(po.id::text, ', ') INTO v_already_assigned
    FROM primary_orders po WHERE po.id = ANY(p_order_ids) AND po.packing_list_id IS NOT NULL;
  END IF;

  IF v_already_assigned IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orders already allocated to a packing list: ' || v_already_assigned);
  END IF;

  v_packing_list_number := 'PL-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 10000)::text, 4, '0');

  INSERT INTO packing_lists (
    packing_list_number, delivery_date, distributor_id, status, order_type,
    total_items, total_value, warehouse_id, created_by
  ) VALUES (
    v_packing_list_number, p_delivery_date, p_distributor_id, 'draft', p_order_type,
    0, p_total_value, p_warehouse_id, auth.uid()
  ) RETURNING id INTO v_packing_list_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty     := (v_item->>'quantity')::numeric;
    v_uom_id  := NULLIF(v_item->>'uom_id', '')::uuid;
    v_uom_code:= NULLIF(v_item->>'uom_code', '');
    v_conv    := NULLIF(v_item->>'conversion_to_base', '')::numeric;

    -- base_qty: prefer client value, then conv*qty, then qty
    IF (v_item ? 'base_qty') AND NULLIF(v_item->>'base_qty','') IS NOT NULL THEN
      v_base_qty := (v_item->>'base_qty')::numeric;
    ELSIF v_conv IS NOT NULL AND v_conv > 0 THEN
      v_base_qty := v_qty * v_conv;
    ELSE
      v_base_qty := v_qty;
    END IF;

    INSERT INTO packing_list_items (
      packing_list_id, product_id, product_name, unit, ordered_qty, picked_qty, short_qty,
      uom_id, uom_code, conversion_to_base, base_qty
    ) VALUES (
      v_packing_list_id, (v_item->>'product_id')::uuid, v_item->>'product_name',
      v_item->>'unit', v_qty, 0, 0,
      v_uom_id, v_uom_code, v_conv, v_base_qty
    ) RETURNING id INTO v_pl_item_id;

    v_total_items := v_total_items + COALESCE(v_qty, 0)::integer;

    IF p_batch_allocations IS NOT NULL THEN
      FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_batch_allocations)
      LOOP
        IF (v_alloc->>'product_id') = (v_item->>'product_id') THEN
          IF v_alloc->'manual_batches' IS NOT NULL AND jsonb_array_length(v_alloc->'manual_batches') > 0 THEN
            -- MANUAL ALLOCATION
            FOR v_manual_batch IN SELECT * FROM jsonb_array_elements(v_alloc->'manual_batches')
            LOOP
              v_alloc_qty := (v_manual_batch->>'allocate_qty')::numeric;
              IF v_alloc_qty <= 0 THEN CONTINUE; END IF;

              SELECT * INTO v_batch FROM inventory_batches
              WHERE id = (v_manual_batch->>'batch_id')::uuid FOR UPDATE SKIP LOCKED;

              IF NOT FOUND THEN RAISE EXCEPTION 'Batch % not found or locked', v_manual_batch->>'batch_id'; END IF;

              v_available := COALESCE(v_batch.available_qty, v_batch.quantity - COALESCE(v_batch.reserved_qty, 0));
              IF v_available < v_alloc_qty THEN
                RAISE EXCEPTION 'Batch % insufficient stock: avail %, need %', v_batch.batch_no, v_available, v_alloc_qty;
              END IF;
              IF v_batch.expiry_date IS NOT NULL AND v_batch.expiry_date < CURRENT_DATE THEN
                RAISE EXCEPTION 'Batch % is expired', v_batch.batch_no;
              END IF;

              UPDATE inventory_batches
              SET reserved_qty = COALESCE(reserved_qty, 0) + v_alloc_qty,
                  available_qty = GREATEST(0, COALESCE(available_qty, quantity) - v_alloc_qty)
              WHERE id = v_batch.id;

              UPDATE distributor_inventory
              SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_alloc_qty
              WHERE distributor_id = p_distributor_id AND product_id = (v_item->>'product_id')::uuid
                AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id);

              INSERT INTO packing_list_item_batches (packing_list_item_id, batch_id, batch_number, expiry_date, allocated_qty, picked_qty)
              VALUES (v_pl_item_id, v_batch.id, v_batch.batch_no, v_batch.expiry_date, v_alloc_qty, 0);
            END LOOP;
          ELSE
            -- AUTO ALLOCATION (FEFO/FIFO/LIFO)
            v_remaining := (v_alloc->>'required_qty')::numeric;
            FOR v_batch IN
              SELECT * FROM inventory_batches
              WHERE distributor_id = p_distributor_id AND product_id = (v_item->>'product_id')::uuid
                AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
                AND COALESCE(available_qty, quantity - COALESCE(reserved_qty, 0)) > 0
                AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
              ORDER BY
                CASE WHEN p_strategy = 'FEFO' THEN expiry_date END ASC NULLS LAST,
                CASE WHEN p_strategy = 'FIFO' THEN created_at END ASC,
                CASE WHEN p_strategy = 'LIFO' THEN created_at END DESC
              FOR UPDATE SKIP LOCKED
            LOOP
              EXIT WHEN v_remaining <= 0;
              v_available := COALESCE(v_batch.available_qty, v_batch.quantity - COALESCE(v_batch.reserved_qty, 0));
              v_alloc_qty := LEAST(v_remaining, v_available);

              UPDATE inventory_batches
              SET reserved_qty = COALESCE(reserved_qty, 0) + v_alloc_qty,
                  available_qty = GREATEST(0, COALESCE(available_qty, quantity) - v_alloc_qty)
              WHERE id = v_batch.id;

              UPDATE distributor_inventory
              SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_alloc_qty
              WHERE distributor_id = p_distributor_id AND product_id = (v_item->>'product_id')::uuid
                AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id);

              INSERT INTO packing_list_item_batches (packing_list_item_id, batch_id, batch_number, expiry_date, allocated_qty, picked_qty)
              VALUES (v_pl_item_id, v_batch.id, v_batch.batch_no, v_batch.expiry_date, v_alloc_qty, 0);

              v_remaining := v_remaining - v_alloc_qty;
            END LOOP;

            IF v_remaining > 0 THEN
              v_total_shortfall := v_total_shortfall + v_remaining;
              UPDATE packing_list_items SET short_qty = v_remaining WHERE id = v_pl_item_id;
            END IF;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  UPDATE packing_lists SET total_items = v_total_items WHERE id = v_packing_list_id;

  IF p_order_type = 'secondary' THEN
    UPDATE orders SET packing_list_id = v_packing_list_id, delivery_date = p_delivery_date, delivery_status = 'in_packing_list'
    WHERE id = ANY(p_order_ids);
  ELSE
    UPDATE primary_orders SET packing_list_id = v_packing_list_id, status = 'allocated'
    WHERE id = ANY(p_order_ids);
  END IF;

  IF p_sources IS NOT NULL THEN
    FOR v_source IN SELECT * FROM jsonb_array_elements(p_sources)
    LOOP
      DECLARE
        v_src_pl_item_id uuid;
        v_src_order_item_id uuid;
      BEGIN
        SELECT id INTO v_src_pl_item_id FROM packing_list_items
        WHERE packing_list_id = v_packing_list_id AND product_id = (v_source->>'product_id')::uuid LIMIT 1;

        IF v_source->>'order_item_id' IS NOT NULL AND v_source->>'order_item_id' != '' THEN
          v_src_order_item_id := (v_source->>'order_item_id')::uuid;
        ELSE
          IF p_order_type = 'secondary' THEN
            SELECT oi.id INTO v_src_order_item_id FROM order_items oi
            WHERE oi.order_id = (v_source->>'order_id')::uuid AND oi.product_id = (v_source->>'product_id')::uuid LIMIT 1;
          ELSE
            SELECT poi.id INTO v_src_order_item_id FROM primary_order_items poi
            WHERE poi.order_id = (v_source->>'order_id')::uuid AND poi.product_id = (v_source->>'product_id')::uuid LIMIT 1;
          END IF;
        END IF;

        IF v_src_pl_item_id IS NOT NULL THEN
          INSERT INTO packing_list_item_sources (packing_list_item_id, order_id, order_item_id, product_id, allocated_qty)
          VALUES (v_src_pl_item_id, (v_source->>'order_id')::uuid, v_src_order_item_id, (v_source->>'product_id')::uuid, COALESCE((v_source->>'allocated_qty')::numeric, 0));

          IF (v_source->>'backorder_qty') IS NOT NULL AND (v_source->>'backorder_qty')::numeric > 0 THEN
            IF p_order_type = 'secondary' AND v_src_order_item_id IS NOT NULL THEN
              UPDATE order_items SET backorder_qty = (v_source->>'backorder_qty')::numeric WHERE id = v_src_order_item_id;
            ELSIF p_order_type = 'primary' AND v_src_order_item_id IS NOT NULL THEN
              UPDATE primary_order_items SET backorder_qty = (v_source->>'backorder_qty')::numeric WHERE id = v_src_order_item_id;
            END IF;
          END IF;
        END IF;
      END;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'packing_list_id', v_packing_list_id,
    'packing_list_number', v_packing_list_number,
    'total_items', v_total_items,
    'total_shortfall', v_total_shortfall
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.credit_ledger_sync_pending_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE retailers
  SET pending_amount = GREATEST(0, COALESCE(pending_amount, 0) + NEW.amount),
      updated_at = now()
  WHERE id = NEW.retailer_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_packing_list_atomic(p_packing_list_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pl record;
  v_batch record;
  v_total_released numeric := 0;
  v_rec record;
BEGIN
  SELECT * INTO v_pl FROM packing_lists WHERE id = p_packing_list_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Packing list not found'); END IF;
  IF v_pl.status != 'draft' THEN RETURN jsonb_build_object('success', false, 'error', 'Can only delete draft packing lists'); END IF;

  FOR v_batch IN
    SELECT plib.batch_id, plib.allocated_qty
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
  LOOP
    UPDATE inventory_batches
    SET reserved_qty = GREATEST(0, reserved_qty - v_batch.allocated_qty)
    WHERE id = v_batch.batch_id;
    v_total_released := v_total_released + v_batch.allocated_qty;
  END LOOP;

  IF v_pl.distributor_id IS NOT NULL THEN
    UPDATE distributor_inventory di
    SET reserved_quantity = COALESCE((
      SELECT SUM(ib.reserved_qty) FROM inventory_batches ib
      WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id
        AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)
    ), 0)
    WHERE di.distributor_id = v_pl.distributor_id
      AND di.product_id IN (SELECT DISTINCT pli.product_id FROM packing_list_items pli WHERE pli.packing_list_id = p_packing_list_id);
  END IF;

  -- Reset backorder_qty on source order items
  FOR v_rec IN
    SELECT plis.order_item_id
    FROM packing_list_item_sources plis
    JOIN packing_list_items pli ON pli.id = plis.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id AND plis.order_item_id IS NOT NULL
  LOOP
    UPDATE order_items SET backorder_qty = 0 WHERE id = v_rec.order_item_id;
    UPDATE primary_order_items SET backorder_qty = 0 WHERE id = v_rec.order_item_id;
  END LOOP;

  UPDATE orders SET packing_list_id = NULL, delivery_date = NULL, delivery_status = 'pending' WHERE packing_list_id = p_packing_list_id;
  UPDATE primary_orders SET packing_list_id = NULL, status = 'confirmed' WHERE packing_list_id = p_packing_list_id;
  DELETE FROM packing_lists WHERE id = p_packing_list_id;

  RETURN jsonb_build_object('success', true, 'total_released', v_total_released);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.dispatch_batch_stock(p_distributor_id uuid, p_product_id uuid, p_batch_id uuid, p_qty integer, p_packing_list_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch RECORD;
  v_product_name TEXT;
  v_wh_id UUID;
BEGIN
  SELECT id, reserved_qty, batch_no, warehouse_id
  INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch not found: %', p_batch_id;
  END IF;

  IF v_batch.reserved_qty < p_qty THEN
    RAISE EXCEPTION 'Insufficient reserved stock in batch %: has %, needs %',
      v_batch.batch_no, v_batch.reserved_qty, p_qty;
  END IF;

  v_wh_id := v_batch.warehouse_id;

  UPDATE inventory_batches
  SET reserved_qty = reserved_qty - p_qty
  WHERE id = p_batch_id;

  -- Deduct from summary (available_quantity is generated, don't touch it)
  UPDATE distributor_inventory
  SET quantity = GREATEST(0, quantity - p_qty),
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_qty)
  WHERE distributor_id = p_distributor_id
    AND product_id = p_product_id;

  SELECT name INTO v_product_name FROM products WHERE id = p_product_id;

  -- Insert ledger entry with warehouse_id (NOT NULL column)
  INSERT INTO distributor_inventory_transactions (
    distributor_id, product_id, product_name, transaction_type,
    quantity, reference_type, reference_id, notes, warehouse_id, batch_number
  ) VALUES (
    p_distributor_id, p_product_id, v_product_name, 'DISPATCH',
    p_qty, 'packing_list', p_packing_list_id,
    'Batch ' || v_batch.batch_no || ' dispatched', v_wh_id, v_batch.batch_no
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.dispatch_packing_list_atomic(p_packing_list_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pl record;
  v_batch record;
  v_total_dispatched numeric := 0;
  v_total_released numeric := 0;
  v_total_backorder numeric := 0;
  v_dispatch_qty numeric;
  v_leftover numeric;
  v_source record;
  v_item_shortfall numeric;
  v_batch_detail record;
BEGIN
  SELECT * INTO v_pl FROM packing_lists WHERE id = p_packing_list_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Packing list not found'); END IF;

  IF v_pl.status != 'ready' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only dispatch packing lists with status ready, current status: ' || v_pl.status);
  END IF;

  FOR v_batch IN
    SELECT plib.id AS plib_id, plib.batch_id, plib.allocated_qty, plib.picked_qty, pli.product_id, pli.product_name
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
  LOOP
    v_dispatch_qty := CASE WHEN COALESCE(v_batch.picked_qty, 0) > 0 THEN v_batch.picked_qty ELSE v_batch.allocated_qty END;
    v_leftover := v_batch.allocated_qty - v_dispatch_qty;

    UPDATE inventory_batches
    SET quantity = GREATEST(0, quantity - v_dispatch_qty),
        reserved_qty = GREATEST(0, reserved_qty - v_batch.allocated_qty)
    WHERE id = v_batch.batch_id;

    SELECT batch_no, expiry_date, warehouse_id INTO v_batch_detail
    FROM inventory_batches WHERE id = v_batch.batch_id;

    INSERT INTO distributor_inventory_transactions (
      distributor_id, product_id, product_name, transaction_type, balance_qty,
      reference_type, reference_id, batch_number, expiry_date, warehouse_id,
      notes, created_by
    ) VALUES (
      v_pl.distributor_id, v_batch.product_id, v_batch.product_name, 'DISPATCH',
      -v_dispatch_qty, 'packing_list', p_packing_list_id,
      v_batch_detail.batch_no, v_batch_detail.expiry_date, v_batch_detail.warehouse_id,
      'Dispatched via PL ' || v_pl.packing_list_number, auth.uid()
    );

    v_total_dispatched := v_total_dispatched + v_dispatch_qty;
    IF v_leftover > 0 THEN v_total_released := v_total_released + v_leftover; END IF;
  END LOOP;

  IF v_pl.distributor_id IS NOT NULL THEN
    UPDATE distributor_inventory di
    SET quantity = COALESCE((
          SELECT SUM(ib.quantity) FROM inventory_batches ib
          WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id
            AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)
        ), 0),
        reserved_quantity = COALESCE((
          SELECT SUM(ib.reserved_qty) FROM inventory_batches ib
          WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id
            AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)
        ), 0)
    WHERE di.distributor_id = v_pl.distributor_id
      AND di.product_id IN (SELECT DISTINCT pli.product_id FROM packing_list_items pli WHERE pli.packing_list_id = p_packing_list_id);
  END IF;

  FOR v_source IN
    SELECT plis.order_item_id, plis.allocated_qty, pli.picked_qty as item_picked, pli.ordered_qty as item_ordered
    FROM packing_list_item_sources plis
    JOIN packing_list_items pli ON pli.id = plis.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id AND plis.order_item_id IS NOT NULL
  LOOP
    v_item_shortfall := GREATEST(0, v_source.allocated_qty - LEAST(v_source.allocated_qty, COALESCE(v_source.item_picked, 0)));
    IF v_item_shortfall > 0 THEN
      UPDATE order_items SET backorder_qty = COALESCE(backorder_qty, 0) + v_item_shortfall WHERE id = v_source.order_item_id;
      IF NOT FOUND THEN
        UPDATE primary_order_items SET backorder_qty = COALESCE(backorder_qty, 0) + v_item_shortfall WHERE id = v_source.order_item_id;
      END IF;
      v_total_backorder := v_total_backorder + v_item_shortfall;
    END IF;
  END LOOP;

  UPDATE packing_lists SET status = 'dispatched', updated_at = now() WHERE id = p_packing_list_id;
  UPDATE orders SET delivery_status = 'dispatched' WHERE packing_list_id = p_packing_list_id;
  UPDATE primary_orders SET status = 'dispatched' WHERE packing_list_id = p_packing_list_id;

  RETURN jsonb_build_object('success', true, 'total_dispatched', v_total_dispatched, 'total_released', v_total_released, 'total_backorder_added', v_total_backorder);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.emit_notification_event(p_event_code text, p_source_table text, p_record_id text, p_actor_user_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id uuid;
  v_rule RECORD;
  v_receiver_id uuid;
  v_title text;
  v_message text;
  v_actor_name text;
  v_module_name text;
  v_record_uuid uuid;
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
          v_message := REPLACE(v_message, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
          v_message := REPLACE(v_message, '{module_name}', v_module_name);
          v_message := REPLACE(v_message, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
          v_message := REPLACE(v_message, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
          v_message := REPLACE(v_message, '{points}', COALESCE(p_metadata->>'points', '0'));

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
          v_message := REPLACE(v_message, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
          v_message := REPLACE(v_message, '{module_name}', v_module_name);
          v_message := REPLACE(v_message, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
          v_message := REPLACE(v_message, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
          v_message := REPLACE(v_message, '{points}', COALESCE(p_metadata->>'points', '0'));

          INSERT INTO notifications (user_id, title, message, type, related_table, related_id)
          VALUES (v_receiver_id, v_title, v_message, p_event_code, p_source_table, v_record_uuid);
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
      v_message := REPLACE(v_message, '{user_name}', COALESCE(v_actor_name, 'Unknown'));
      v_message := REPLACE(v_message, '{module_name}', v_module_name);
      v_message := REPLACE(v_message, '{record_name}', COALESCE(p_metadata->>'record_name', ''));
      v_message := REPLACE(v_message, '{date}', COALESCE(p_metadata->>'date', TO_CHAR(now(), 'YYYY-MM-DD')));
      v_message := REPLACE(v_message, '{points}', COALESCE(p_metadata->>'points', '0'));

      INSERT INTO notifications (user_id, title, message, type, related_table, related_id)
      VALUES (v_receiver_id, v_title, v_message, p_event_code, p_source_table, v_record_uuid);
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_base_factor_one()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_base = true AND NEW.conversion_to_base <> 1 THEN
    RAISE EXCEPTION 'Base unit must have conversion_to_base = 1 (got %)', NEW.conversion_to_base;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_category_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base_category text;
  v_new_category text;
BEGIN
  SELECT m.category INTO v_new_category
  FROM public.uom_master m WHERE m.id = NEW.uom_id;

  SELECT m.category INTO v_base_category
  FROM public.product_uom_mapping p
  JOIN public.uom_master m ON m.id = p.uom_id
  WHERE p.product_id = NEW.product_id AND p.is_base = true
    AND p.id <> NEW.id
  LIMIT 1;

  -- Allow Quantity-category packaging units (PIECE / BOX / STRIP / CARTON)
  -- on Weight or Volume products. A 100g pouch is physically a PIECE that
  -- weighs 100g — the conversion_to_base column already encodes that.
  IF v_base_category IS NOT NULL
     AND v_new_category <> v_base_category
     AND v_new_category <> 'Quantity' THEN
    RAISE EXCEPTION 'Unit category % does not match product base category %', v_new_category, v_base_category;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_delivery_run_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  allowed_transitions jsonb := '{
    "ready": ["assigned"],
    "assigned": ["out_for_delivery"],
    "out_for_delivery": ["delivered"]
  }'::jsonb;
  allowed jsonb;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  allowed := allowed_transitions -> OLD.status;
  IF allowed IS NULL OR NOT (allowed ? NEW.status) THEN
    RAISE EXCEPTION 'Invalid delivery run status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_single_base_per_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_product_id uuid;
BEGIN
  -- For each affected product, count base rows
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
  ELSE
    v_product_id := NEW.product_id;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.product_uom_mapping
  WHERE product_id = v_product_id AND is_base = true;

  IF v_count > 1 THEN
    RAISE EXCEPTION 'Product % cannot have more than one base unit (found %)', v_product_id, v_count;
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_inventory_batch_quantity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.quantity IS NULL OR NEW.quantity = 0)
     AND (COALESCE(NEW.available_qty, 0) > 0 OR COALESCE(NEW.reserved_qty, 0) > 0) THEN
    NEW.quantity := COALESCE(NEW.available_qty, 0) + COALESCE(NEW.reserved_qty, 0);
  END IF;
  RETURN NEW;
END; $function$
;

CREATE OR REPLACE FUNCTION public.execute_stock_action(p_distributor_id uuid, p_product_id uuid, p_action text, p_quantity integer, p_notes text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid, p_warehouse_id uuid DEFAULT NULL::uuid, p_batch_no text DEFAULT NULL::text, p_expiry_date date DEFAULT NULL::date, p_reference_id uuid DEFAULT NULL::uuid, p_reference_number text DEFAULT NULL::text, p_supplier_batch_code text DEFAULT NULL::text, p_mfg_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inventory RECORD;
  v_new_available INTEGER;
  v_new_reserved INTEGER;
  v_new_damaged INTEGER;
  v_new_expired INTEGER;
  v_new_quantity INTEGER;
  v_txn_type TEXT;
  v_movement TEXT;
  v_batch_id UUID;
  v_wh_id UUID;
  v_system_batch_code TEXT;
  v_signed_qty INTEGER;
  v_product_name TEXT;
  v_product_unit TEXT;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
  END IF;

  v_wh_id := p_warehouse_id;
  IF v_wh_id IS NULL THEN
    SELECT id INTO v_wh_id
    FROM public.warehouses
    WHERE distributor_id = p_distributor_id AND is_default = true
    LIMIT 1;
  END IF;

  IF v_wh_id IS NULL THEN
    INSERT INTO public.warehouses (distributor_id, name, code, is_default)
    VALUES (p_distributor_id, 'Main Warehouse', 'MAIN', true)
    ON CONFLICT (distributor_id, name) DO NOTHING
    RETURNING id INTO v_wh_id;

    IF v_wh_id IS NULL THEN
      SELECT id INTO v_wh_id FROM public.warehouses
      WHERE distributor_id = p_distributor_id AND name = 'Main Warehouse'
      LIMIT 1;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.warehouses
    WHERE id = v_wh_id AND distributor_id = p_distributor_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid warehouse for this distributor');
  END IF;

  SELECT * INTO v_inventory
  FROM public.distributor_inventory
  WHERE distributor_id = p_distributor_id
    AND product_id = p_product_id
    AND warehouse_id = v_wh_id
  FOR UPDATE;

  IF NOT FOUND AND p_action NOT IN ('OPENING_STOCK', 'GRN') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found in inventory');
  END IF;

  v_new_quantity := COALESCE(v_inventory.quantity, 0);
  v_new_reserved := COALESCE(v_inventory.reserved_quantity, 0);
  v_new_damaged := COALESCE(v_inventory.damaged_quantity, 0);
  v_new_expired := COALESCE(v_inventory.expired_quantity, 0);

  -- Resolve product metadata for ledger row (name/unit)
  SELECT COALESCE(v_inventory.product_name, p.name, 'Product'),
         COALESCE(v_inventory.unit, p.unit, 'pcs')
    INTO v_product_name, v_product_unit
  FROM public.products p
  WHERE p.id = p_product_id;

  IF v_product_name IS NULL THEN
    v_product_name := COALESCE(v_inventory.product_name, 'Product');
    v_product_unit := COALESCE(v_inventory.unit, 'pcs');
  END IF;

  -- For OPENING_STOCK / GRN, resolve / auto-generate the system batch code
  IF p_action IN ('OPENING_STOCK', 'GRN') THEN
    IF p_batch_no IS NULL OR TRIM(p_batch_no) = '' THEN
      v_system_batch_code := public.generate_system_batch_code(v_wh_id, p_product_id, CURRENT_DATE);
    ELSE
      v_system_batch_code := TRIM(p_batch_no);
    END IF;
  ELSE
    v_system_batch_code := p_batch_no;
  END IF;

  CASE p_action
    WHEN 'OPENING_STOCK' THEN
      IF v_inventory.id IS NULL THEN
        INSERT INTO public.distributor_inventory (
          distributor_id, product_id, product_name, quantity,
          reserved_quantity, damaged_quantity, expired_quantity,
          unit, batch_number, expiry_date, warehouse_id
        )
        SELECT p_distributor_id, p_product_id, COALESCE(p.name, 'Product'), p_quantity,
               0, 0, 0, COALESCE(p.unit, 'pcs'), v_system_batch_code, p_expiry_date, v_wh_id
        FROM public.products p WHERE p.id = p_product_id;

        IF NOT FOUND THEN
          INSERT INTO public.distributor_inventory (
            distributor_id, product_id, product_name, quantity,
            reserved_quantity, damaged_quantity, expired_quantity,
            unit, warehouse_id
          ) VALUES (
            p_distributor_id, p_product_id, COALESCE(p_notes, 'Product'), p_quantity,
            0, 0, 0, 'pcs', v_wh_id
          );
        END IF;

        v_new_quantity := p_quantity;
      ELSE
        v_new_quantity := v_new_quantity + p_quantity;
      END IF;

      INSERT INTO public.inventory_batches (
        distributor_id, product_id, batch_no, system_batch_code, supplier_batch_code,
        mfg_date, expiry_date, quantity, available_qty, warehouse_id
      ) VALUES (
        p_distributor_id, p_product_id, v_system_batch_code, v_system_batch_code, p_supplier_batch_code,
        p_mfg_date, p_expiry_date, p_quantity, p_quantity, v_wh_id
      )
      ON CONFLICT (distributor_id, product_id, batch_no, warehouse_id)
      DO UPDATE SET
        available_qty = public.inventory_batches.available_qty + EXCLUDED.available_qty,
        quantity = public.inventory_batches.quantity + EXCLUDED.quantity,
        supplier_batch_code = COALESCE(EXCLUDED.supplier_batch_code, public.inventory_batches.supplier_batch_code),
        mfg_date = COALESCE(EXCLUDED.mfg_date, public.inventory_batches.mfg_date),
        expiry_date = COALESCE(EXCLUDED.expiry_date, public.inventory_batches.expiry_date)
      RETURNING id INTO v_batch_id;

      v_txn_type := 'OPENING_STOCK';
      v_movement := 'NULL → Available';
      v_signed_qty := p_quantity;

    WHEN 'GRN' THEN
      IF v_inventory.id IS NULL THEN
        INSERT INTO public.distributor_inventory (
          distributor_id, product_id, product_name, quantity,
          reserved_quantity, damaged_quantity, expired_quantity,
          unit, batch_number, expiry_date, warehouse_id
        )
        SELECT p_distributor_id, p_product_id, COALESCE(p.name, 'Product'), p_quantity,
               0, 0, 0, COALESCE(p.unit, 'pcs'), v_system_batch_code, p_expiry_date, v_wh_id
        FROM public.products p WHERE p.id = p_product_id;

        IF NOT FOUND THEN
          INSERT INTO public.distributor_inventory (
            distributor_id, product_id, product_name, quantity,
            reserved_quantity, damaged_quantity, expired_quantity,
            unit, warehouse_id
          ) VALUES (
            p_distributor_id, p_product_id, COALESCE(p_notes, 'Product'), p_quantity,
            0, 0, 0, 'pcs', v_wh_id
          );
        END IF;
        v_new_quantity := p_quantity;
      ELSE
        v_new_quantity := v_new_quantity + p_quantity;
      END IF;

      INSERT INTO public.inventory_batches (
        distributor_id, product_id, batch_no, system_batch_code, supplier_batch_code,
        mfg_date, expiry_date, quantity, available_qty, warehouse_id
      ) VALUES (
        p_distributor_id, p_product_id, v_system_batch_code, v_system_batch_code, p_supplier_batch_code,
        p_mfg_date, p_expiry_date, p_quantity, p_quantity, v_wh_id
      )
      ON CONFLICT (distributor_id, product_id, batch_no, warehouse_id)
      DO UPDATE SET
        available_qty = public.inventory_batches.available_qty + EXCLUDED.available_qty,
        quantity = public.inventory_batches.quantity + EXCLUDED.quantity,
        supplier_batch_code = COALESCE(EXCLUDED.supplier_batch_code, public.inventory_batches.supplier_batch_code),
        mfg_date = COALESCE(EXCLUDED.mfg_date, public.inventory_batches.mfg_date),
        expiry_date = COALESCE(EXCLUDED.expiry_date, public.inventory_batches.expiry_date)
      RETURNING id INTO v_batch_id;

      v_txn_type := 'GRN';
      v_movement := 'Inward → Available';
      v_signed_qty := p_quantity;

    WHEN 'RESERVE' THEN
      IF v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available stock to reserve');
      END IF;
      v_new_reserved := v_new_reserved + p_quantity;
      v_txn_type := 'RESERVE';
      v_movement := 'Available → Reserved';
      v_signed_qty := p_quantity;

    WHEN 'RELEASE' THEN
      IF v_new_reserved < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot release more than reserved quantity');
      END IF;
      v_new_reserved := v_new_reserved - p_quantity;
      v_txn_type := 'RELEASE';
      v_movement := 'Reserved → Available';
      v_signed_qty := p_quantity;

    WHEN 'MARK_DAMAGED' THEN
      v_new_available := v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired;
      IF v_new_available < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available stock');
      END IF;
      v_new_damaged := v_new_damaged + p_quantity;
      v_txn_type := 'MARK_DAMAGED';
      v_movement := 'Available → Damaged';
      v_signed_qty := p_quantity;

    WHEN 'MARK_EXPIRED' THEN
      v_new_available := v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired;
      IF v_new_available < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available stock');
      END IF;
      v_new_expired := v_new_expired + p_quantity;
      v_txn_type := 'MARK_EXPIRED';
      v_movement := 'Available → Expired';
      v_signed_qty := p_quantity;

    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Unknown action: ' || p_action);
  END CASE;

  -- Update aggregate row when it existed
  IF v_inventory.id IS NOT NULL THEN
    UPDATE public.distributor_inventory
    SET quantity = v_new_quantity,
        reserved_quantity = v_new_reserved,
        damaged_quantity = v_new_damaged,
        expired_quantity = v_new_expired,
        updated_at = now()
    WHERE id = v_inventory.id;
  END IF;

  -- Insert into ledger using current schema (balance_qty, not legacy "quantity")
  INSERT INTO public.distributor_inventory_transactions (
    distributor_id, product_id, product_name, transaction_type, balance_qty,
    running_balance, unit, notes, created_by, batch_number,
    reference_type, reference_id, reference_number, warehouse_id, expiry_date
  ) VALUES (
    p_distributor_id, p_product_id, v_product_name, v_txn_type, v_signed_qty,
    v_new_quantity, v_product_unit, p_notes, p_created_by, v_system_batch_code,
    NULL, p_reference_id, p_reference_number, v_wh_id, p_expiry_date
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'quantity', p_quantity,
    'warehouse_id', v_wh_id,
    'system_batch_code', v_system_batch_code,
    'new_total', v_new_quantity,
    'new_available', v_new_quantity - v_new_reserved - v_new_damaged - v_new_expired,
    'new_reserved', v_new_reserved,
    'new_damaged', v_new_damaged,
    'new_expired', v_new_expired
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_stock_action_numeric(p_distributor_id uuid, p_product_id uuid, p_action text, p_quantity numeric, p_notes text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid, p_warehouse_id uuid DEFAULT NULL::uuid, p_batch_no text DEFAULT NULL::text, p_expiry_date date DEFAULT NULL::date, p_reference_id uuid DEFAULT NULL::uuid, p_reference_number text DEFAULT NULL::text, p_supplier_batch_code text DEFAULT NULL::text, p_mfg_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
  END IF;

  RETURN public.execute_stock_action(
    p_distributor_id,
    p_product_id,
    p_action,
    ROUND(p_quantity)::integer,
    p_notes,
    p_created_by,
    p_warehouse_id,
    p_batch_no,
    p_expiry_date,
    p_reference_id,
    p_reference_number,
    p_supplier_batch_code,
    p_mfg_date
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_company_return_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := 'CRET-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         LPAD(NEXTVAL('distributor_company_return_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_distributor_claim_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.claim_number IS NULL OR NEW.claim_number = '' THEN
    NEW.claim_number := 'CLM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(NEXTVAL('distributor_claim_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_distributor_return_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := 'RET-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         LPAD(NEXTVAL('distributor_return_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_grn_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  seq_val integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(grn_number FROM 'GRN-\\d{4}-(\\d+)') AS integer)), 0) + 1
  INTO seq_val FROM public.goods_receipt_notes;
  RETURN 'GRN-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(seq_val::text, 5, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_idea_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.idea_number IS NULL OR NEW.idea_number = '' THEN
    NEW.idea_number := 'IDEA-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                       LPAD(NEXTVAL('distributor_idea_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  next_val BIGINT;
  year_part TEXT;
  candidate TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

  LOOP
    next_val := nextval('public.invoice_number_seq');
    candidate := 'INV' || year_part || '-' || LPAD(next_val::TEXT, 3, '0');

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.invoice_number = candidate
    );
  END LOOP;

  RETURN candidate;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_packing_list_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.packing_list_number IS NULL OR NEW.packing_list_number = '' THEN
    SELECT COALESCE(MAX(
      CASE 
        WHEN packing_list_number ~ '^PL-[0-9]{8}-[0-9]+$' 
        THEN CAST(SPLIT_PART(packing_list_number, '-', 3) AS INTEGER)
        ELSE 0
      END
    ), 0) + 1 INTO next_num
    FROM packing_lists 
    WHERE delivery_date = NEW.delivery_date;
    
    NEW.packing_list_number := 'PL-' || TO_CHAR(NEW.delivery_date, 'YYYYMMDD') || '-' || LPAD(next_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_payment_receipt_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := 'RCT-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(nextval('payment_receipt_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_primary_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  seq_val integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'PINV-\\d{4}-(\\d+)') AS integer)), 0) + 1
  INTO seq_val FROM public.primary_invoices;
  RETURN 'PINV-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(seq_val::text, 5, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_primary_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(NEXTVAL('primary_order_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_return_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  seq_val integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM 'RET-\\d{4}-(\\d+)') AS integer)), 0) + 1
  INTO seq_val FROM public.primary_return_notes;
  RETURN 'RET-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(seq_val::text, 5, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_shipment_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  seq_val integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(shipment_number FROM 'SHP-\\d{4}-(\\d+)') AS integer)), 0) + 1
  INTO seq_val FROM public.primary_shipments;
  RETURN 'SHP-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(seq_val::text, 5, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_support_ticket_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         LPAD(NEXTVAL('distributor_support_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_system_batch_code(p_warehouse_id uuid, p_product_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wh_code text;
  v_prod_code text;
  v_date_part text;
  v_prefix text;
  v_seq int;
  v_code text;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(code), ''), 'WH') INTO v_wh_code
  FROM public.warehouses WHERE id = p_warehouse_id;
  IF v_wh_code IS NULL THEN v_wh_code := 'WH'; END IF;

  SELECT COALESCE(NULLIF(TRIM(sku), ''), 'PRD') INTO v_prod_code
  FROM public.products WHERE id = p_product_id;
  IF v_prod_code IS NULL THEN v_prod_code := 'PRD'; END IF;

  v_date_part := to_char(p_date, 'YYMMDD');
  v_prefix := v_wh_code || '-' || v_date_part || '-' || v_prod_code || '-';

  -- Find max sequence with this prefix in this wh+product
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(system_batch_code, '^' || v_prefix, ''), '') AS int)
  ), 0)
  INTO v_seq
  FROM public.inventory_batches
  WHERE warehouse_id = p_warehouse_id
    AND product_id = p_product_id
    AND system_batch_code LIKE v_prefix || '%'
    AND system_batch_code ~ ('^' || v_prefix || '[0-9]+$');

  v_seq := v_seq + 1;
  v_code := v_prefix || lpad(v_seq::text, 3, '0');
  RETURN v_code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_activity_logging_summary(p_days integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  v_window_start timestamptz;
BEGIN
  IF NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: System Administrator required';
  END IF;

  v_window_start := date_trunc('day', now()) - ((p_days - 1) || ' days')::interval;

  SELECT jsonb_agg(row_data) INTO result
  FROM (
    SELECT jsonb_build_object(
      'user_id', p.id,
      'full_name', COALESCE(p.full_name, p.username, 'Unknown'),
      'total_usage_seconds', COALESCE(att.total_seconds, -1),
      'most_used_module', COALESCE(most.module_name, '-'),
      'most_used_count', COALESCE(most.visit_count, 0),
      'least_used_module', COALESCE(least.module_name, '-'),
      'least_used_count', COALESCE(least.visit_count, 0),
      'data_usage_bytes', COALESCE(du.total_bytes, 0)
    ) as row_data
    FROM public.profiles p
    INNER JOIN (
      -- Users who have either attendance or page views in the window
      SELECT user_id FROM public.attendance
      WHERE check_in_time >= v_window_start AND check_in_time <= now()
      UNION
      SELECT user_id FROM public.user_page_views
      WHERE visited_at >= v_window_start
    ) active_users ON active_users.user_id = p.id
    LEFT JOIN (
      SELECT
        user_id,
        SUM(
          EXTRACT(EPOCH FROM (COALESCE(check_out_time, now()) - check_in_time))
        )::bigint AS total_seconds
      FROM public.attendance
      WHERE check_in_time >= v_window_start
        AND check_in_time <= now()
      GROUP BY user_id
    ) att ON att.user_id = p.id
    LEFT JOIN LATERAL (
      SELECT module_name, COUNT(*)::integer as visit_count
      FROM public.user_page_views
      WHERE user_id = p.id AND visited_at >= v_window_start
      GROUP BY module_name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) most ON true
    LEFT JOIN LATERAL (
      SELECT module_name, COUNT(*)::integer as visit_count
      FROM public.user_page_views
      WHERE user_id = p.id AND visited_at >= v_window_start
      GROUP BY module_name
      ORDER BY COUNT(*) ASC
      LIMIT 1
    ) least ON true
    LEFT JOIN (
      SELECT user_id, SUM(bytes_uploaded + bytes_downloaded)::bigint as total_bytes
      FROM public.user_data_usage
      WHERE recorded_at >= v_window_start
      GROUP BY user_id
    ) du ON du.user_id = p.id
    ORDER BY COALESCE(att.total_seconds, -1) DESC
  ) sub;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_all_subordinates(manager_user_id uuid)
 RETURNS TABLE(subordinate_user_id uuid, level integer, full_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinate_tree AS (
    -- Base case: the manager themselves (level 0)
    SELECT manager_user_id as user_id, 0 as lvl
    UNION ALL
    -- Recursive case: all employees reporting to current level
    SELECT e.user_id, st.lvl + 1
    FROM employees e
    INNER JOIN subordinate_tree st ON e.manager_id = st.user_id
    WHERE e.user_id != manager_user_id -- Prevent self-reference loops
  )
  SELECT 
    st.user_id as subordinate_user_id,
    st.lvl as level,
    COALESCE(p.full_name, p.username, 'Unknown') as full_name
  FROM subordinate_tree st
  LEFT JOIN profiles p ON p.id = st.user_id
  ORDER BY st.lvl, p.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(lookup_email text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT id FROM auth.users WHERE email = lookup_email LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_authenticated_email()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT email FROM auth.users WHERE id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_basic_profiles_for_admin()
 RETURNS TABLE(id uuid, username text, full_name text, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.created_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role);
$function$
;

CREATE OR REPLACE FUNCTION public.get_database_metrics()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Only allow System Administrators
  IF NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: System Administrator required';
  END IF;

  SELECT jsonb_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'uptime_seconds', EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time())),
    'postmaster_start_time', pg_postmaster_start_time(),
    'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'total_connections', (SELECT count(*) FROM pg_stat_activity),
    'idle_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'),
    'cache_hit_ratio', (
      SELECT ROUND(
        COALESCE(sum(blks_hit)::numeric / NULLIF(sum(blks_hit) + sum(blks_read), 0) * 100, 0), 2
      ) FROM pg_stat_database WHERE datname = current_database()
    ),
    'total_transactions', (
      SELECT COALESCE(xact_commit + xact_rollback, 0) FROM pg_stat_database WHERE datname = current_database()
    ),
    'commits', (SELECT COALESCE(xact_commit, 0) FROM pg_stat_database WHERE datname = current_database()),
    'rollbacks', (SELECT COALESCE(xact_rollback, 0) FROM pg_stat_database WHERE datname = current_database()),
    'rows_read', (SELECT COALESCE(tup_returned, 0) FROM pg_stat_database WHERE datname = current_database()),
    'rows_inserted', (SELECT COALESCE(tup_inserted, 0) FROM pg_stat_database WHERE datname = current_database()),
    'rows_updated', (SELECT COALESCE(tup_updated, 0) FROM pg_stat_database WHERE datname = current_database()),
    'rows_deleted', (SELECT COALESCE(tup_deleted, 0) FROM pg_stat_database WHERE datname = current_database()),
    'deadlocks', (SELECT COALESCE(deadlocks, 0) FROM pg_stat_database WHERE datname = current_database()),
    'temp_files', (SELECT COALESCE(temp_files, 0) FROM pg_stat_database WHERE datname = current_database()),
    'blks_read', (SELECT COALESCE(blks_read, 0) FROM pg_stat_database WHERE datname = current_database()),
    'blks_hit', (SELECT COALESCE(blks_hit, 0) FROM pg_stat_database WHERE datname = current_database()),
    'total_table_count', (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'),
    'db_name', current_database()
  ) INTO result;

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_direct_reports(manager_user_id uuid)
 RETURNS TABLE(subordinate_user_id uuid, full_name text, profile_picture_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    e.user_id as subordinate_user_id,
    COALESCE(p.full_name, p.username, 'Unknown') as full_name,
    p.profile_picture_url
  FROM employees e
  LEFT JOIN profiles p ON p.id = e.user_id
  WHERE e.manager_id = manager_user_id
  ORDER BY p.full_name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_distinct_districts(p_state text)
 RETURNS TABLE(district text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT district FROM pincode_master WHERE statename = p_state ORDER BY district;
$function$
;

CREATE OR REPLACE FUNCTION public.get_distinct_pincodes(p_state text, p_district text)
 RETURNS TABLE(pincode text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT pincode FROM pincode_master WHERE statename = p_state AND district = p_district ORDER BY pincode;
$function$
;

CREATE OR REPLACE FUNCTION public.get_distinct_states()
 RETURNS TABLE(statename text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT statename FROM pincode_master ORDER BY statename;
$function$
;

CREATE OR REPLACE FUNCTION public.get_distributor_id_for_auth_user()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT distributor_id
  FROM public.distributor_users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1
$function$
;

CREATE OR REPLACE FUNCTION public.get_employee_basic_info(employee_user_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, hq text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.user_id, p.full_name, e.hq
  FROM employees e
  LEFT JOIN profiles p ON p.id = e.user_id
  WHERE e.user_id = employee_user_id;
$function$
;

CREATE OR REPLACE FUNCTION public.get_enabled_units(p_category text DEFAULT NULL::text)
 RETURNS TABLE(uom_id uuid, code text, name text, category text, display_order integer, is_default boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.id, m.code, m.name, m.category, e.display_order, e.is_default
  FROM public.uom_master m
  JOIN public.enabled_units e ON e.uom_id = m.id
  WHERE e.enabled = true
    AND (p_category IS NULL OR m.category = p_category)
  ORDER BY m.category, e.display_order, m.name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_estimated_memory_usage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  WITH active_queries AS (
    SELECT COUNT(*) AS active_count
    FROM pg_stat_activity
    WHERE state != 'idle'
  ),
  settings AS (
    SELECT
      pg_size_bytes(current_setting('shared_buffers')) AS shared_buffers_bytes,
      pg_size_bytes(current_setting('work_mem')) AS work_mem_bytes
  )
  SELECT jsonb_build_object(
    'estimated_memory_usage_percent', ROUND(
      ((shared_buffers_bytes + (work_mem_bytes * active_count))
       / (1024 * 1024 * 1024.0)
      ) * 100, 2
    ),
    'shared_buffers', pg_size_pretty(shared_buffers_bytes),
    'work_mem_total', pg_size_pretty(work_mem_bytes * active_count),
    'active_queries', active_count
  ) INTO result
  FROM settings, active_queries;

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_leave_date_constraints(p_user_id uuid, p_leave_type_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_policy JSONB;
  v_max_backdate_date DATE;
  v_min_notice_date DATE;
BEGIN
  v_policy := resolve_effective_leave_policy(p_user_id, p_leave_type_id);
  
  IF v_policy ? 'error' THEN
    RETURN jsonb_build_object('error', 'No policy configured');
  END IF;

  IF (v_policy->>'allow_backdated_leave')::boolean THEN
    v_max_backdate_date := CURRENT_DATE - (v_policy->>'max_backdate_days')::integer;
  ELSE
    v_max_backdate_date := CURRENT_DATE;
  END IF;

  IF (v_policy->>'min_notice_period_days')::integer > 0 THEN
    v_min_notice_date := CURRENT_DATE + (v_policy->>'min_notice_period_days')::integer;
  ELSE
    v_min_notice_date := CURRENT_DATE;
  END IF;

  RETURN jsonb_build_object(
    'allow_half_day', (v_policy->>'enable_half_day')::boolean,
    'allow_backdated_leave', (v_policy->>'allow_backdated_leave')::boolean,
    'max_backdate_date', v_max_backdate_date,
    'min_notice_date', v_min_notice_date,
    'min_notice_period_days', (v_policy->>'min_notice_period_days')::integer,
    'max_continuous_days', v_policy->>'max_continuous_leave_days',
    'is_enabled', (v_policy->>'is_enabled')::boolean,
    'allow_negative_balance', (v_policy->>'allow_negative_balance')::boolean,
    'max_negative_limit', (v_policy->>'max_negative_limit')::integer
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_limited_profiles_for_admin()
 RETURNS TABLE(id uuid, username text, full_name text, created_at timestamp with time zone, user_status user_status, profile_picture_url text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.created_at,
    p.user_status,
    p.profile_picture_url
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role);
$function$
;

CREATE OR REPLACE FUNCTION public.get_password_reset_stats()
 RETURNS TABLE(email text, total_attempts bigint, failed_attempts bigint, is_locked boolean, last_attempt timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    pra.email,
    COUNT(*)::BIGINT as total_attempts,
    COUNT(*) FILTER (WHERE was_successful = false)::BIGINT as failed_attempts,
    public.is_account_locked(pra.email) as is_locked,
    MAX(pra.attempted_at) as last_attempt
  FROM public.password_reset_attempts pra
  WHERE pra.attempted_at > NOW() - INTERVAL '24 hours'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  GROUP BY pra.email
  ORDER BY last_attempt DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.get_product_revenue_performance(user_full_name text, start_date date DEFAULT '2025-12-19'::date, end_date date DEFAULT '2025-12-26'::date)
 RETURNS TABLE(full_name text, product_name text, unit text, quantity_sold bigint, revenue numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.full_name::text,
    oi.product_name::text,
    oi.unit::text,
    SUM(oi.quantity)::bigint AS quantity_sold,
    SUM(oi.total)::numeric AS revenue
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN profiles p ON o.user_id = p.id
  WHERE o.created_at::date BETWEEN start_date AND end_date
    AND trim(p.full_name) ILIKE trim(user_full_name)
  GROUP BY p.full_name, oi.product_name, oi.unit
  ORDER BY revenue DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_product_units(p_product_id uuid)
 RETURNS TABLE(mapping_id uuid, uom_id uuid, code text, name text, category text, conversion_to_base numeric, is_base boolean, is_default_sales boolean, is_active boolean, is_price_basis boolean, is_default_purchase boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, m.id, m.code, m.name, m.category,
         p.conversion_to_base, p.is_base, p.is_default_sales,
         COALESCE(p.is_active, true) AS is_active,
         COALESCE(p.is_price_basis, false) AS is_price_basis,
         COALESCE(p.is_default_purchase, false) AS is_default_purchase
  FROM public.product_uom_mapping p
  JOIN public.uom_master m ON m.id = p.uom_id
  LEFT JOIN public.enabled_units eu ON eu.uom_id = m.id
  WHERE p.product_id = p_product_id
    AND COALESCE(p.is_active, true) = true
    AND (
      COALESCE(p.is_base, false) = true
      OR COALESCE(eu.enabled, true) = true
    )
  ORDER BY p.is_base DESC, p.is_default_sales DESC, m.name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_productivity_summary(user_full_name text, start_date date DEFAULT '2025-12-19'::date, end_date date DEFAULT '2025-12-26'::date)
 RETURNS TABLE(full_name text, planned_date text, productive_visits bigint, unproductive_visits bigint, total_visits bigint, productivity_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.full_name::TEXT,
    TO_CHAR(v.planned_date, 'FMMonth FMDD, YYYY') AS planned_date,
    COUNT(CASE WHEN v.status = 'productive' THEN 1 END) AS productive_visits,
    COUNT(CASE WHEN v.status = 'unproductive' THEN 1 END) AS unproductive_visits,
    COUNT(v.id) AS total_visits,
    ROUND(
      COUNT(CASE WHEN v.status = 'productive' THEN 1 END)::NUMERIC /
      NULLIF(COUNT(v.id), 0) * 100,
      2
    ) AS productivity_percentage
  FROM visits v
  JOIN profiles p ON v.user_id = p.id
  WHERE v.status IN ('productive', 'unproductive')
    AND v.planned_date BETWEEN start_date AND end_date
    AND p.full_name ILIKE user_full_name
  GROUP BY p.full_name, v.planned_date
  ORDER BY v.planned_date DESC, p.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_productivity_summary(user_full_name text)
 RETURNS TABLE(full_name text, planned_date text, productive_visits bigint, unproductive_visits bigint, total_visits bigint, productivity_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.full_name::TEXT,
    TO_CHAR(v.planned_date, 'FMMonth FMDD, YYYY') AS planned_date,
    COUNT(CASE WHEN v.status = 'productive' THEN 1 END) AS productive_visits,
    COUNT(CASE WHEN v.status = 'unproductive' THEN 1 END) AS unproductive_visits,
    COUNT(v.id) AS total_visits,
    ROUND(
      COUNT(CASE WHEN v.status = 'productive' THEN 1 END)::NUMERIC /
      NULLIF(COUNT(v.id), 0) * 100,
      2
    ) AS productivity_percentage
  FROM visits v
  JOIN profiles p ON v.user_id = p.id
  WHERE v.status IN ('productive', 'unproductive')
    AND v.planned_date BETWEEN '2025-12-19' AND '2025-12-26'
    AND p.full_name ILIKE user_full_name
  GROUP BY p.full_name, v.planned_date
  ORDER BY v.planned_date DESC, p.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_profiles_for_selector()
 RETURNS TABLE(id uuid, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.full_name
  FROM public.profiles p
  WHERE p.full_name IS NOT NULL
    AND (
      -- Own profile
      p.id = auth.uid()
      OR
      -- All subordinates (recursive hierarchy)
      p.id IN (
        SELECT subordinate_user_id 
        FROM get_all_subordinates(auth.uid())
      )
      OR
      -- Admin access - sees everyone
      public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  ORDER BY p.full_name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_vendors()
 RETURNS TABLE(id uuid, name text, skills text[], region_pincodes text[], city text, state text, is_approved boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    v.id,
    v.name,
    v.skills,
    v.region_pincodes,
    v.city,
    v.state,
    v.is_approved,
    v.created_at
  FROM public.vendors v
  WHERE v.is_approved = true
    AND auth.uid() IS NOT NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.get_reporting_chain(p_user_id uuid)
 RETURNS TABLE(manager_id uuid, level integer, full_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH RECURSIVE chain AS (
    SELECT e.manager_id, 1 AS lvl
    FROM employees e
    WHERE e.user_id = p_user_id
      AND e.manager_id IS NOT NULL

    UNION ALL

    SELECT e.manager_id, c.lvl + 1
    FROM employees e
    INNER JOIN chain c ON e.user_id = c.manager_id
    WHERE e.manager_id IS NOT NULL
      AND c.lvl < 10
  )
  SELECT 
    c.manager_id,
    c.lvl as level,
    COALESCE(p.full_name, p.username, 'Unknown') as full_name
  FROM chain c
  LEFT JOIN profiles p ON p.id = c.manager_id
  ORDER BY c.lvl;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_retailer_ext_cities(selected_state text)
 RETURNS TABLE(city text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT DISTINCT r.city
  FROM public.retailer_external_db r
  WHERE r.state = selected_state
    AND r.city IS NOT NULL
  ORDER BY r.city;
$function$
;

CREATE OR REPLACE FUNCTION public.get_retailer_ext_states()
 RETURNS TABLE(state text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT DISTINCT r.state
  FROM public.retailer_external_db r
  WHERE r.state IS NOT NULL
  ORDER BY r.state;
$function$
;

CREATE OR REPLACE FUNCTION public.get_retailer_unsorted_cities(p_state text, p_district text)
 RETURNS TABLE(city text, count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT city, COUNT(*) as count
  FROM retailer_external_unsorted
  WHERE state = p_state
    AND district = p_district
    AND city IS NOT NULL AND city != ''
  GROUP BY city
  ORDER BY city;
$function$
;

CREATE OR REPLACE FUNCTION public.get_retailer_unsorted_districts(p_state text)
 RETURNS TABLE(district text, count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT district, COUNT(*) as count
  FROM retailer_external_unsorted
  WHERE state = p_state
    AND district IS NOT NULL AND district != ''
  GROUP BY district
  ORDER BY district;
$function$
;

CREATE OR REPLACE FUNCTION public.get_retailer_unsorted_states()
 RETURNS TABLE(state text, count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT state, COUNT(*) as count
  FROM retailer_external_unsorted
  WHERE state IS NOT NULL AND state != ''
  GROUP BY state
  ORDER BY state;
$function$
;

CREATE OR REPLACE FUNCTION public.get_state_analytics()
 RETURNS TABLE(state_name text, total_districts bigint, total_pincodes bigint, total_retailers bigint, converted_retailers bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.statename AS state_name,
    COUNT(DISTINCT p.district) AS total_districts,
    COUNT(DISTINCT p.pincode) AS total_pincodes,
    COALESCE(r.total, 0) AS total_retailers,
    COALESCE(r.converted, 0) AS converted_retailers
  FROM (
    SELECT DISTINCT statename, district, pincode 
    FROM pincode_master 
    WHERE statename IS NOT NULL AND statename != '' AND statename != 'NA'
  ) p
  LEFT JOIN (
    SELECT 
      regexp_replace(UPPER(TRIM(state)), '\\s*&\\s*', ' AND ', 'g') AS state_norm,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_converted = true) AS converted
    FROM retailer_external_db
    WHERE state IS NOT NULL AND TRIM(state) != ''
    GROUP BY regexp_replace(UPPER(TRIM(state)), '\\s*&\\s*', ' AND ', 'g')
  ) r ON regexp_replace(UPPER(TRIM(p.statename)), '\\s*&\\s*', ' AND ', 'g') = r.state_norm
  GROUP BY p.statename, r.total, r.converted
  ORDER BY p.statename;
$function$
;

CREATE OR REPLACE FUNCTION public.get_subordinate_users(user_id_param uuid)
 RETURNS TABLE(subordinate_user_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT e.user_id
  FROM employees e
  WHERE e.manager_id = user_id_param;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_suspicious_access_attempts()
 RETURNS TABLE(user_id uuid, table_name text, action text, attempt_count bigint, first_attempt timestamp with time zone, last_attempt timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    sal.user_id,
    sal.table_name,
    sal.action,
    COUNT(*)::BIGINT as attempt_count,
    MIN(sal.accessed_at) as first_attempt,
    MAX(sal.accessed_at) as last_attempt
  FROM public.sensitive_data_access_log sal
  WHERE sal.accessed_at > NOW() - INTERVAL '1 hour'
    AND sal.action LIKE '%_attempt'
    AND has_role(auth.uid(), 'admin'::app_role)
  GROUP BY sal.user_id, sal.table_name, sal.action
  HAVING COUNT(*) > 10
  ORDER BY attempt_count DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.get_territory_sales_summary(territory_id_param uuid, start_date_param date DEFAULT (CURRENT_DATE - '30 days'::interval), end_date_param date DEFAULT CURRENT_DATE)
 RETURNS TABLE(total_sales numeric, total_orders bigint, total_retailers bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    COALESCE(SUM(o.total_amount), 0) as total_sales,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT r.id) as total_retailers
  FROM territories t
  LEFT JOIN retailers r ON r.id IN (
    SELECT id FROM retailers 
    WHERE EXISTS (
      SELECT 1 FROM unnest(t.pincode_ranges) AS pincode
      WHERE retailers.address LIKE '%' || pincode || '%'
    )
  )
  LEFT JOIN orders o ON o.retailer_id = r.id 
    AND o.created_at::date BETWEEN start_date_param AND end_date_param
  WHERE t.id = territory_id_param
  GROUP BY t.id;
$function$
;

CREATE OR REPLACE FUNCTION public.get_type_supports_primary(p_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM distributor_types
    WHERE parent_type_code = p_code
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_unit_usage_count(p_uom_id uuid)
 RETURNS TABLE(mappings_using bigint, products_using bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT COUNT(*) FROM public.product_uom_mapping WHERE uom_id = p_uom_id),
    (SELECT COUNT(DISTINCT product_id) FROM public.product_uom_mapping WHERE uom_id = p_uom_id);
$function$
;

CREATE OR REPLACE FUNCTION public.get_unsorted_state_analytics()
 RETURNS TABLE(state_name text, total_districts bigint, total_pincodes bigint, total_retailers bigint, converted_retailers bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    UPPER(TRIM(state)) AS state_name,
    COUNT(DISTINCT district),
    COUNT(DISTINCT pincode),
    COUNT(*),
    COUNT(*) FILTER (WHERE is_converted = true)
  FROM retailer_external_unsorted
  WHERE state IS NOT NULL AND TRIM(state) != ''
  GROUP BY UPPER(TRIM(state))
  ORDER BY 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_uom_categories()
 RETURNS TABLE(id uuid, code text, name text, description text, is_system boolean, enabled boolean, sort_order integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, code, name, description, is_system, enabled, sort_order
    FROM public.uom_category
   ORDER BY sort_order, name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_profile_card(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'username', p.username,
    'designation', p.designation,
    'phone_number', p.phone_number,
    'profile_picture_url', p.profile_picture_url,
    'email', au.email,
    'date_of_joining', e.date_of_joining,
    'band', e.band,
    'address', e.address,
    'primary_manager_name', pm.full_name,
    'secondary_manager_name', sm.full_name,
    'role', COALESCE(ur.role::text, 'user')
  ) INTO result
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  LEFT JOIN employees e ON e.user_id = p.id
  LEFT JOIN profiles pm ON pm.id = e.manager_id
  LEFT JOIN profiles sm ON sm.id = e.secondary_manager_id
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.id = p_user_id;

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_type(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_distributor boolean := false;
  v_is_field boolean := false;
BEGIN
  -- Distributor identity: row in distributor_users linked via auth_user_id, active
  SELECT EXISTS (
    SELECT 1 FROM public.distributor_users
    WHERE auth_user_id = p_user_id
      AND is_active = true
  ) INTO v_is_distributor;

  -- Field-sales identity: row in user_profiles with an assigned security profile
  -- NOTE: the column is profile_id (FK -> security_profiles.id), NOT security_profile_id
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = p_user_id
      AND profile_id IS NOT NULL
  ) INTO v_is_field;

  IF v_is_distributor AND v_is_field THEN
    RETURN 'both';
  ELSIF v_is_distributor THEN
    RETURN 'distributor';
  ELSIF v_is_field THEN
    RETURN 'field_sales';
  ELSE
    RETURN 'none';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_vendor_contact_info(vendor_id uuid)
 RETURNS TABLE(id uuid, name text, contact_name text, contact_phone text, contact_email text, skills text[], region_pincodes text[], city text, state text, competitors text[], is_approved boolean, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    v.id,
    v.name,
    v.contact_name,
    v.contact_phone,
    v.contact_email,
    v.skills,
    v.region_pincodes,
    v.city,
    v.state,
    v.competitors,
    v.is_approved,
    v.created_at,
    v.updated_at,
    v.created_by
  FROM public.vendors v
  WHERE v.id = vendor_id
    AND public.has_role(auth.uid(), 'admin'::public.app_role);
$function$
;

CREATE OR REPLACE FUNCTION public.get_vendors_public_info()
 RETURNS TABLE(id uuid, name text, skills text[], region_pincodes text[], city text, state text, is_approved boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    v.id,
    v.name,
    v.skills,
    v.region_pincodes,
    v.city,
    v.state,
    v.is_approved,
    v.created_at
  FROM public.vendors v
  WHERE v.is_approved = true;
$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _role = 'admin'::app_role THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.security_profiles sp ON sp.id = up.profile_id
      WHERE up.user_id = _user_id AND sp.is_system = true
    );
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.hash_hint_answer(answer text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use md5 with a salt for basic security (better than plaintext)
  RETURN 'hash:' || md5('security_salt_2024_' || LOWER(TRIM(answer)) || '_hint_protection');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.hash_hint_answer_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only hash if hint_answer is provided and not already hashed
  IF NEW.hint_answer IS NOT NULL AND NEW.hint_answer NOT LIKE 'hash:%' THEN
    NEW.hint_answer := public.hash_hint_answer(NEW.hint_answer);
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.initialize_leave_policy_balances(p_policy_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_policy RECORD;
  v_user RECORD;
  v_credit NUMERIC;
  v_current_year INTEGER;
  v_current_month INTEGER;
  v_month INTEGER;
  v_already_credited BOOLEAN;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;

  SELECT lp.leave_type_id, lp.yearly_entitlement, lp.accrual_type, lt.name as leave_name
  INTO v_policy
  FROM leave_policy lp
  JOIN leave_types lt ON lt.id = lp.leave_type_id
  WHERE lp.id = p_policy_id AND lp.accrual_type = 'monthly';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_credit := ROUND(v_policy.yearly_entitlement / 12.0, 2);

  FOR v_user IN SELECT id FROM profiles WHERE user_status = 'active'
  LOOP
    INSERT INTO leave_balance (user_id, leave_type_id, year, opening_balance, used_balance)
    VALUES (v_user.id, v_policy.leave_type_id, v_current_year, 0, 0)
    ON CONFLICT (user_id, leave_type_id, year) DO NOTHING;

    FOR v_month IN 1..v_current_month
    LOOP
      SELECT EXISTS (
        SELECT 1 FROM leave_accrual_log
        WHERE user_id = v_user.id
          AND leave_type_id = v_policy.leave_type_id
          AND year = v_current_year
          AND month = v_month
          AND accrual_type = 'monthly'
      ) INTO v_already_credited;

      IF NOT v_already_credited THEN
        UPDATE leave_balance
        SET opening_balance = opening_balance + v_credit, updated_at = now()
        WHERE user_id = v_user.id
          AND leave_type_id = v_policy.leave_type_id
          AND year = v_current_year;

        INSERT INTO leave_accrual_log (user_id, leave_type_id, year, month, accrual_type, days_credited, balance_after, notes)
        VALUES (
          v_user.id, v_policy.leave_type_id, v_current_year, v_month, 'monthly', v_credit,
          (SELECT remaining_balance FROM leave_balance
           WHERE user_id = v_user.id AND leave_type_id = v_policy.leave_type_id AND year = v_current_year),
          'Backfill month ' || v_month || ' for ' || v_policy.leave_name
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_account_locked(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  failed_attempts INTEGER;
BEGIN
  -- Count failed attempts in the last hour
  SELECT COUNT(*) INTO failed_attempts
  FROM public.password_reset_attempts
  WHERE email = user_email
    AND attempted_at > NOW() - INTERVAL '1 hour'
    AND was_successful = false;
  
  -- Account is locked if 5 or more failed attempts in last hour
  RETURN failed_attempts >= 5;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$function$
;

CREATE OR REPLACE FUNCTION public.is_approver_for_request(request_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM approval_steps
    WHERE approval_request_id = request_id
      AND approver_id = user_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_manager(user_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM employees e 
    WHERE e.manager_id = user_id_param
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_requester_for_request(request_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM approval_requests
    WHERE id = request_id
      AND requester_id = user_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.security_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = _user_id
      AND sp.is_system = true
  )
$function$
;

CREATE OR REPLACE FUNCTION public.list_team_members()
 RETURNS TABLE(user_id uuid, full_name text, username text, profile_picture_url text, hq text, manager_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    e.user_id, 
    p.full_name, 
    p.username, 
    p.profile_picture_url,
    e.hq,
    e.manager_id
  FROM employees e
  LEFT JOIN profiles p ON p.id = e.user_id
  WHERE 
    -- Admins see everyone
    has_role(auth.uid(), 'admin'::app_role)
    -- Managers see their direct reports
    OR e.manager_id = auth.uid()
    -- Users see themselves
    OR e.user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.log_feature_flag_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF OLD.is_enabled IS DISTINCT FROM NEW.is_enabled THEN
    INSERT INTO public.feature_flag_audit (feature_flag_id, changed_by, old_value, new_value)
    VALUES (NEW.id, auth.uid(), OLD.is_enabled, NEW.is_enabled);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_primary_order_initial_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO primary_order_status_history (order_id, status, notes)
  VALUES (NEW.id, NEW.status, 'Order created');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_primary_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO primary_order_status_history (order_id, status, notes)
    VALUES (NEW.id, NEW.status, 'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_sensitive_access(p_table_name text, p_record_id uuid, p_action text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.sensitive_data_access_log (user_id, table_name, record_id, action)
  VALUES (auth.uid(), p_table_name, p_record_id, p_action);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_attendance_on_leave_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  leave_date DATE;
  v_leave_type_name TEXT;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Get leave type name
    SELECT name INTO v_leave_type_name FROM leave_types WHERE id = NEW.leave_type_id;
    
    -- Mark attendance for each day of leave
    FOR leave_date IN SELECT generate_series(NEW.start_date, NEW.end_date, '1 day')::DATE
    LOOP
      INSERT INTO attendance (user_id, date, status, notes)
      VALUES (NEW.user_id, leave_date, 
              CASE WHEN NEW.is_half_day THEN 'half_day_leave' ELSE 'leave' END,
              'Auto-marked: ' || COALESCE(v_leave_type_name, 'Leave'))
      ON CONFLICT (user_id, date) 
      DO UPDATE SET 
        status = EXCLUDED.status, 
        notes = EXCLUDED.notes,
        updated_at = now();
    END LOOP;
    
    -- Update final approved by
    NEW.final_approved_by := auth.uid();
    NEW.attendance_marked := true;
    
    -- Log the deduction
    INSERT INTO leave_accrual_log (user_id, leave_type_id, year, accrual_type, days_credited, days_debited, balance_after, notes)
    VALUES (
      NEW.user_id, 
      NEW.leave_type_id, 
      EXTRACT(YEAR FROM NEW.start_date)::INTEGER, 
      'deduction', 
      0, 
      NEW.days_requested,
      COALESCE((SELECT remaining_balance FROM leave_balance 
                WHERE user_id = NEW.user_id AND leave_type_id = NEW.leave_type_id 
                AND year = EXTRACT(YEAR FROM NEW.start_date)), 0) - NEW.days_requested,
      'Leave approved: ' || NEW.start_date || ' to ' || NEW.end_date
    );
    
    -- Check if LOP applies (balance goes negative)
    IF (SELECT remaining_balance - NEW.days_requested FROM leave_balance 
        WHERE user_id = NEW.user_id AND leave_type_id = NEW.leave_type_id 
        AND year = EXTRACT(YEAR FROM NEW.start_date)) < 0 THEN
      NEW.is_lop := true;
      NEW.lop_days := ABS(
        (SELECT remaining_balance - NEW.days_requested FROM leave_balance 
         WHERE user_id = NEW.user_id AND leave_type_id = NEW.leave_type_id 
         AND year = EXTRACT(YEAR FROM NEW.start_date))
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nextval_text(seq_name text)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT nextval(seq_name)::text;
$function$
;

CREATE OR REPLACE FUNCTION public.owns_completed_invitation(_user_id uuid, _email text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users
    WHERE id = _user_id 
      AND email = _email
  );
$function$
;

CREATE OR REPLACE FUNCTION public.pm_is_project_member(project_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM pm_project_members WHERE project_id = project_uuid AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM pm_projects WHERE id = project_uuid AND created_by = auth.uid()
  ) OR public.is_system_admin(auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_admin_sensitive_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If user is admin and trying to access someone else's profile
  IF public.has_role(auth.uid(), 'admin'::public.app_role) AND auth.uid() != NEW.id THEN
    -- Prevent updates to sensitive fields
    IF OLD.hint_question IS DISTINCT FROM NEW.hint_question 
       OR OLD.hint_answer IS DISTINCT FROM NEW.hint_answer 
       OR OLD.recovery_email IS DISTINCT FROM NEW.recovery_email 
       OR OLD.phone_number IS DISTINCT FROM NEW.phone_number THEN
      RAISE EXCEPTION 'Admins cannot access or modify sensitive profile data';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_negative_batch_stock()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.available_qty < 0 THEN
    RAISE EXCEPTION 'available_qty cannot be negative for batch %', NEW.batch_no;
  END IF;
  IF NEW.reserved_qty < 0 THEN
    RAISE EXCEPTION 'reserved_qty cannot be negative for batch %', NEW.batch_no;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.preview_inventory_allocation(p_distributor_id uuid, p_product_id uuid, p_required_qty integer, p_strategy text DEFAULT 'FEFO'::text, p_warehouse_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch RECORD;
  v_remaining INTEGER := p_required_qty;
  v_alloc_qty INTEGER;
  v_allocations JSONB := '[]'::JSONB;
  v_total_allocated INTEGER := 0;
  v_available INTEGER;
BEGIN
  FOR v_batch IN
    SELECT id, batch_no, expiry_date, quantity, reserved_qty
    FROM inventory_batches
    WHERE distributor_id = p_distributor_id
      AND product_id = p_product_id
      AND (quantity - reserved_qty) > 0
      AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
      AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
    ORDER BY
      CASE WHEN p_strategy = 'FEFO' THEN expiry_date END ASC NULLS LAST,
      CASE WHEN p_strategy = 'FIFO' THEN created_at END ASC,
      CASE WHEN p_strategy = 'LIFO' THEN created_at END DESC
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_available := v_batch.quantity - v_batch.reserved_qty;
    v_alloc_qty := LEAST(v_available, v_remaining);

    v_allocations := v_allocations || jsonb_build_object(
      'batch_id', v_batch.id,
      'batch_no', v_batch.batch_no,
      'expiry_date', v_batch.expiry_date,
      'allocated_qty', v_alloc_qty,
      'available_qty', v_available
    );

    v_total_allocated := v_total_allocated + v_alloc_qty;
    v_remaining := v_remaining - v_alloc_qty;
  END LOOP;

  RETURN jsonb_build_object(
    'allocations', v_allocations,
    'total_allocated', v_total_allocated,
    'shortfall_qty', GREATEST(0, v_remaining)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_approval_step(p_approval_request_id uuid, p_approver_id uuid, p_action text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_step RECORD;
BEGIN
  SELECT * INTO v_request FROM approval_requests WHERE id = p_approval_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request not found');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request already processed');
  END IF;

  -- Find ANY pending step for this approver (parallel: no level check)
  SELECT * INTO v_step FROM approval_steps 
  WHERE approval_request_id = p_approval_request_id
    AND approver_id = p_approver_id
    AND status = 'pending'
  ORDER BY level ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No pending step found for this approver');
  END IF;

  -- Update the acting step
  UPDATE approval_steps SET
    status = p_action,
    action_taken_at = now(),
    rejection_reason = p_reason
  WHERE id = v_step.id;

  -- Skip all other pending steps
  UPDATE approval_steps SET
    status = 'skipped',
    action_taken_at = now()
  WHERE approval_request_id = p_approval_request_id
    AND id != v_step.id
    AND status = 'pending';

  -- Log action
  INSERT INTO approval_audit_log (approval_request_id, entity_type, entity_id, action, performed_by, level, metadata)
  VALUES (p_approval_request_id, v_request.entity_type, v_request.entity_id, p_action, p_approver_id, 
          v_step.level, jsonb_build_object('reason', p_reason));

  IF p_action = 'rejected' THEN
    UPDATE approval_requests SET status = 'rejected', updated_at = now() WHERE id = p_approval_request_id;
    RETURN jsonb_build_object('success', true, 'message', 'Request rejected', 'is_final', true, 'action', 'rejected');
  END IF;

  -- Approved: always final in parallel mode
  UPDATE approval_requests SET
    status = 'approved',
    final_approved_by = p_approver_id,
    updated_at = now()
  WHERE id = p_approval_request_id;

  RETURN jsonb_build_object('success', true, 'message', 'Request approved', 'is_final', true, 'action', 'approved');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_monthly_leave_accrual()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_policy RECORD;
  v_config RECORD;
  v_user RECORD;
  v_credit NUMERIC;
  v_current_year INTEGER;
  v_current_month INTEGER;
  v_already_credited BOOLEAN;
  v_should_credit BOOLEAN;
  v_accrual_type_label TEXT;
  v_joining_date DATE;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
  
  FOR v_policy IN 
    SELECT lp.*, lt.name as leave_name 
    FROM leave_policy lp
    JOIN leave_types lt ON lt.id = lp.leave_type_id
    WHERE lp.is_active = true AND lp.accrual_type = 'monthly'
  LOOP
    SELECT * INTO v_config FROM accrual_config WHERE leave_type_id = v_policy.leave_type_id;
    
    v_should_credit := false;
    v_accrual_type_label := 'monthly';
    
    IF FOUND THEN
      CASE v_config.frequency
        WHEN 'monthly' THEN
          v_should_credit := true;
          v_accrual_type_label := 'monthly';
          CASE v_config.round_mode
            WHEN 'floor' THEN v_credit := FLOOR(v_policy.yearly_entitlement::numeric / v_config.divisor);
            WHEN 'ceil' THEN v_credit := CEIL(v_policy.yearly_entitlement::numeric / v_config.divisor);
            ELSE v_credit := ROUND(v_policy.yearly_entitlement::numeric / v_config.divisor, 2);
          END CASE;
        WHEN 'quarterly' THEN
          v_should_credit := v_current_month IN (1, 4, 7, 10);
          v_accrual_type_label := 'quarterly';
          CASE v_config.round_mode
            WHEN 'floor' THEN v_credit := FLOOR(v_policy.yearly_entitlement::numeric / v_config.divisor);
            WHEN 'ceil' THEN v_credit := CEIL(v_policy.yearly_entitlement::numeric / v_config.divisor);
            ELSE v_credit := ROUND(v_policy.yearly_entitlement::numeric / v_config.divisor, 2);
          END CASE;
        WHEN 'annual' THEN
          v_should_credit := v_current_month = 1;
          v_accrual_type_label := 'annual';
          v_credit := v_policy.yearly_entitlement::numeric;
        ELSE
          v_should_credit := true;
          v_credit := ROUND(v_policy.yearly_entitlement::numeric / 12.0, 2);
      END CASE;
    ELSE
      v_should_credit := true;
      v_credit := ROUND(v_policy.yearly_entitlement / 12.0, 2);
    END IF;

    IF NOT v_should_credit THEN
      CONTINUE;
    END IF;
    
    FOR v_user IN 
      SELECT id, created_at FROM profiles WHERE user_status = 'active'
    LOOP
      SELECT EXISTS (
        SELECT 1 FROM leave_accrual_log
        WHERE user_id = v_user.id
          AND leave_type_id = v_policy.leave_type_id
          AND year = v_current_year
          AND month = v_current_month
          AND accrual_type = v_accrual_type_label
      ) INTO v_already_credited;

      IF v_already_credited THEN
        CONTINUE;
      END IF;

      IF v_config IS NOT NULL AND v_config.prorate_joining THEN
        v_joining_date := v_user.created_at::date;
        IF EXTRACT(YEAR FROM v_joining_date) = v_current_year 
           AND EXTRACT(MONTH FROM v_joining_date) = v_current_month THEN
          v_credit := ROUND(
            v_credit * (
              (EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day'))::numeric 
               - EXTRACT(DAY FROM v_joining_date)::numeric + 1) 
              / EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day'))::numeric
            ), 2);
        END IF;
      END IF;

      INSERT INTO leave_balance (user_id, leave_type_id, year, opening_balance, used_balance)
      VALUES (v_user.id, v_policy.leave_type_id, v_current_year, 0, 0)
      ON CONFLICT (user_id, leave_type_id, year) DO NOTHING;
      
      UPDATE leave_balance
      SET opening_balance = opening_balance + v_credit,
          updated_at = now()
      WHERE user_id = v_user.id 
        AND leave_type_id = v_policy.leave_type_id
        AND year = v_current_year;
      
      INSERT INTO leave_accrual_log (user_id, leave_type_id, year, month, accrual_type, days_credited, balance_after, notes)
      VALUES (
        v_user.id, 
        v_policy.leave_type_id, 
        v_current_year, 
        v_current_month, 
        v_accrual_type_label, 
        v_credit,
        (SELECT remaining_balance FROM leave_balance 
         WHERE user_id = v_user.id AND leave_type_id = v_policy.leave_type_id AND year = v_current_year),
        v_accrual_type_label || ' accrual for ' || v_policy.leave_name
      );
    END LOOP;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_year_end_carry_forward()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_policy RECORD;
  v_balance RECORD;
  v_carry NUMERIC;
  v_new_year INTEGER;
BEGIN
  v_new_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  FOR v_policy IN 
    SELECT lp.*, lt.name as leave_name FROM leave_policy lp
    JOIN leave_types lt ON lt.id = lp.leave_type_id
    WHERE lp.is_active = true
  LOOP
    FOR v_balance IN 
      SELECT * FROM leave_balance 
      WHERE leave_type_id = v_policy.leave_type_id 
        AND year = v_new_year - 1
        AND remaining_balance > 0
    LOOP
      IF v_policy.carry_forward_allowed THEN
        v_carry := LEAST(v_balance.remaining_balance, COALESCE(v_policy.max_carry_forward, v_balance.remaining_balance));
      ELSE
        v_carry := 0;
      END IF;
      
      -- Create or update new year balance with carry forward
      -- remaining_balance is GENERATED AS (opening_balance - used_balance), do NOT write it
      INSERT INTO leave_balance (user_id, leave_type_id, year, opening_balance, used_balance)
      VALUES (v_balance.user_id, v_policy.leave_type_id, v_new_year, 
              v_policy.yearly_entitlement + v_carry, 0)
      ON CONFLICT (user_id, leave_type_id, year) 
      DO UPDATE SET 
        opening_balance = leave_balance.opening_balance + v_carry,
        updated_at = now();
      
      -- Log carry forward
      IF v_carry > 0 THEN
        INSERT INTO leave_accrual_log (user_id, leave_type_id, year, accrual_type, days_credited, balance_after, notes)
        VALUES (
          v_balance.user_id, 
          v_policy.leave_type_id, 
          v_new_year, 
          'carry_forward', 
          v_carry,
          (SELECT remaining_balance FROM leave_balance 
           WHERE user_id = v_balance.user_id AND leave_type_id = v_policy.leave_type_id AND year = v_new_year),
          'Carried forward from ' || (v_new_year - 1) || ': ' || v_policy.leave_name
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.push_retailer_notification(p_rule_id uuid, p_actor_user_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.recalculate_leave_accrual_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user RECORD;
  v_new_credit NUMERIC;
  v_old_credit NUMERIC;
  v_current_year INTEGER;
  v_current_month INTEGER;
  v_month INTEGER;
  v_update_mode TEXT;
  v_total_new_credit NUMERIC;
  v_existing_used NUMERIC;
  v_leave_name TEXT;
BEGIN
  -- Only act on monthly accrual policies when entitlement or accrual_type changes
  IF OLD.yearly_entitlement = NEW.yearly_entitlement 
     AND OLD.accrual_type = NEW.accrual_type THEN
    RETURN NEW;
  END IF;

  -- Only handle monthly accrual recalculation
  IF NEW.accrual_type != 'monthly' THEN
    RETURN NEW;
  END IF;

  v_update_mode := COALESCE(NEW.last_update_mode, 'next_month');
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
  v_new_credit := ROUND(NEW.yearly_entitlement / 12.0, 2);
  v_old_credit := ROUND(OLD.yearly_entitlement / 12.0, 2);

  SELECT name INTO v_leave_name FROM leave_types WHERE id = NEW.leave_type_id;

  IF v_update_mode = 'next_month' THEN
    RETURN NEW;
  END IF;

  FOR v_user IN SELECT id FROM profiles WHERE user_status = 'active'
  LOOP
    INSERT INTO leave_balance (user_id, leave_type_id, year, opening_balance, used_balance)
    VALUES (v_user.id, NEW.leave_type_id, v_current_year, 0, 0)
    ON CONFLICT (user_id, leave_type_id, year) DO NOTHING;

    IF v_update_mode = 'retroactive' THEN
      v_total_new_credit := v_new_credit * v_current_month;

      SELECT COALESCE(used_balance, 0) INTO v_existing_used
      FROM leave_balance
      WHERE user_id = v_user.id
        AND leave_type_id = NEW.leave_type_id
        AND year = v_current_year;

      UPDATE leave_balance
      SET opening_balance = v_total_new_credit,
          updated_at = now()
      WHERE user_id = v_user.id
        AND leave_type_id = NEW.leave_type_id
        AND year = v_current_year;

      UPDATE leave_accrual_log
      SET days_credited = v_new_credit,
          notes = 'Retroactive recalc: ' || COALESCE(v_leave_name, 'Leave') || ' (entitlement changed to ' || NEW.yearly_entitlement || ')'
      WHERE user_id = v_user.id
        AND leave_type_id = NEW.leave_type_id
        AND year = v_current_year
        AND accrual_type = 'monthly';

      INSERT INTO leave_accrual_log (user_id, leave_type_id, year, month, accrual_type, days_credited, balance_after, notes)
      VALUES (
        v_user.id, NEW.leave_type_id, v_current_year, v_current_month, 'adjustment', 0,
        v_total_new_credit - v_existing_used,
        'Retroactive recalc applied: entitlement changed from ' || OLD.yearly_entitlement || ' to ' || NEW.yearly_entitlement
      );

    ELSIF v_update_mode = 'current_month' THEN
      IF EXISTS (
        SELECT 1 FROM leave_accrual_log
        WHERE user_id = v_user.id
          AND leave_type_id = NEW.leave_type_id
          AND year = v_current_year
          AND month = v_current_month
          AND accrual_type = 'monthly'
      ) THEN
        UPDATE leave_balance
        SET opening_balance = opening_balance + (v_new_credit - v_old_credit),
            updated_at = now()
        WHERE user_id = v_user.id
          AND leave_type_id = NEW.leave_type_id
          AND year = v_current_year;

        UPDATE leave_accrual_log
        SET days_credited = v_new_credit,
            notes = 'Adjusted current month: entitlement changed to ' || NEW.yearly_entitlement
        WHERE user_id = v_user.id
          AND leave_type_id = NEW.leave_type_id
          AND year = v_current_year
          AND month = v_current_month
          AND accrual_type = 'monthly';
      END IF;

      INSERT INTO leave_accrual_log (user_id, leave_type_id, year, month, accrual_type, days_credited, balance_after, notes)
      VALUES (
        v_user.id, NEW.leave_type_id, v_current_year, v_current_month, 'adjustment',
        v_new_credit - v_old_credit,
        (SELECT remaining_balance FROM leave_balance
         WHERE user_id = v_user.id AND leave_type_id = NEW.leave_type_id AND year = v_current_year),
        'Current month forward: entitlement changed from ' || OLD.yearly_entitlement || ' to ' || NEW.yearly_entitlement
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_daily_admin_summary(p_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_employees   integer;
  v_total_present     integer;
  v_total_on_leave    integer;
  v_total_half_day    integer;
  v_total_hours_sum   numeric;
  v_avg_hours         numeric;
  v_present_with_hours integer;
BEGIN
  -- Count active employees (profiles with active status)
  SELECT COUNT(*) INTO v_total_employees
  FROM profiles
  WHERE user_status = 'active' OR user_status IS NULL;

  -- Count present (status = 'present' OR 'regularized')
  SELECT COUNT(*) INTO v_total_present
  FROM attendance
  WHERE date = p_date
    AND status IN ('present', 'regularized');

  -- Count on leave (status = 'leave')
  SELECT COUNT(*) INTO v_total_on_leave
  FROM attendance
  WHERE date = p_date
    AND status = 'leave';

  -- Count half day leave
  SELECT COUNT(*) INTO v_total_half_day
  FROM attendance
  WHERE date = p_date
    AND status = 'half_day_leave';

  -- Sum of total_hours for present employees
  SELECT 
    COALESCE(SUM(total_hours), 0),
    COUNT(*) FILTER (WHERE total_hours IS NOT NULL AND total_hours > 0)
  INTO v_total_hours_sum, v_present_with_hours
  FROM attendance
  WHERE date = p_date
    AND status IN ('present', 'regularized')
    AND total_hours IS NOT NULL;

  -- Calculate average hours
  IF v_present_with_hours > 0 THEN
    v_avg_hours := ROUND(v_total_hours_sum / v_present_with_hours, 2);
  ELSE
    v_avg_hours := 0;
  END IF;

  -- Upsert the daily summary row
  INSERT INTO attendance_daily_admin_summary (
    date,
    total_employees,
    total_present,
    total_absent,
    total_on_leave,
    total_half_day,
    avg_hours,
    total_hours_sum,
    updated_at
  ) VALUES (
    p_date,
    v_total_employees,
    v_total_present,
    GREATEST(0, v_total_employees - v_total_present - v_total_on_leave - v_total_half_day),
    v_total_on_leave,
    v_total_half_day,
    v_avg_hours,
    v_total_hours_sum,
    now()
  )
  ON CONFLICT (date) DO UPDATE SET
    total_employees = EXCLUDED.total_employees,
    total_present   = EXCLUDED.total_present,
    total_absent    = EXCLUDED.total_absent,
    total_on_leave  = EXCLUDED.total_on_leave,
    total_half_day  = EXCLUDED.total_half_day,
    avg_hours       = EXCLUDED.avg_hours,
    total_hours_sum = EXCLUDED.total_hours_sum,
    updated_at      = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_user_monthly_summary(p_user_id uuid, p_year integer, p_month integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_present_days        integer;
  v_leave_days          integer;
  v_half_day_leave_days integer;
  v_regularized_days    integer;
  v_total_hours         numeric;
  v_avg_daily_hours     numeric;
  v_lop_days            numeric;
  v_working_days        integer;
  v_month_start         date;
  v_month_end           date;
  v_present_count       integer;
BEGIN
  v_month_start := make_date(p_year, p_month, 1);
  v_month_end   := (v_month_start + interval '1 month' - interval '1 day')::date;

  -- Present days
  SELECT COUNT(*) INTO v_present_days
  FROM attendance
  WHERE user_id = p_user_id
    AND date BETWEEN v_month_start AND v_month_end
    AND status = 'present';

  -- Leave days
  SELECT COUNT(*) INTO v_leave_days
  FROM attendance
  WHERE user_id = p_user_id
    AND date BETWEEN v_month_start AND v_month_end
    AND status = 'leave';

  -- Half day leave days
  SELECT COUNT(*) INTO v_half_day_leave_days
  FROM attendance
  WHERE user_id = p_user_id
    AND date BETWEEN v_month_start AND v_month_end
    AND status = 'half_day_leave';

  -- Regularized days
  SELECT COUNT(*) INTO v_regularized_days
  FROM attendance
  WHERE user_id = p_user_id
    AND date BETWEEN v_month_start AND v_month_end
    AND status = 'regularized';

  -- Total hours for the month
  SELECT COALESCE(SUM(total_hours), 0), COUNT(*) FILTER (WHERE total_hours IS NOT NULL AND total_hours > 0)
  INTO v_total_hours, v_present_count
  FROM attendance
  WHERE user_id = p_user_id
    AND date BETWEEN v_month_start AND v_month_end
    AND status IN ('present', 'regularized');

  -- Average daily hours
  IF v_present_count > 0 THEN
    v_avg_daily_hours := ROUND(v_total_hours / v_present_count, 2);
  ELSE
    v_avg_daily_hours := 0;
  END IF;

  -- LOP days from approved leave applications with is_lop = true
  SELECT COALESCE(SUM(lop_days), 0) INTO v_lop_days
  FROM leave_applications
  WHERE user_id = p_user_id
    AND status = 'approved'
    AND is_lop = true
    AND start_date BETWEEN v_month_start AND v_month_end;

  -- Working days from config (default 26 if not set)
  SELECT COALESCE(
    (SELECT working_days FROM working_days_config LIMIT 1), 
    26
  ) INTO v_working_days;

  -- Absent days = working days - present - leave - half_day - regularized
  -- Note: stored in the upsert below

  -- Upsert the monthly summary
  INSERT INTO attendance_user_monthly_summary (
    user_id,
    year,
    month,
    present_days,
    absent_days,
    leave_days,
    half_day_leave_days,
    regularized_days,
    total_hours,
    avg_daily_hours,
    lop_days,
    working_days,
    updated_at
  ) VALUES (
    p_user_id,
    p_year,
    p_month,
    v_present_days,
    GREATEST(0, v_working_days - v_present_days - v_leave_days - v_half_day_leave_days - v_regularized_days),
    v_leave_days,
    v_half_day_leave_days,
    v_regularized_days,
    v_total_hours,
    v_avg_daily_hours,
    v_lop_days,
    v_working_days,
    now()
  )
  ON CONFLICT (user_id, year, month) DO UPDATE SET
    present_days        = EXCLUDED.present_days,
    absent_days         = EXCLUDED.absent_days,
    leave_days          = EXCLUDED.leave_days,
    half_day_leave_days = EXCLUDED.half_day_leave_days,
    regularized_days    = EXCLUDED.regularized_days,
    total_hours         = EXCLUDED.total_hours,
    avg_daily_hours     = EXCLUDED.avg_daily_hours,
    lop_days            = EXCLUDED.lop_days,
    working_days        = EXCLUDED.working_days,
    updated_at          = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.release_all_packing_list_reservations(p_packing_list_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rec RECORD;
  v_total_released INTEGER := 0;
  v_dist_id UUID;
  v_release_qty INTEGER;
  v_product_releases JSONB := '{}'::JSONB;
BEGIN
  SELECT distributor_id INTO v_dist_id
  FROM packing_lists
  WHERE id = p_packing_list_id;

  IF v_dist_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Packing list not found');
  END IF;

  FOR v_rec IN
    SELECT plib.id AS plib_id, plib.batch_id, plib.allocated_qty, plib.picked_qty,
           pli.product_id
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
      AND plib.allocated_qty > COALESCE(plib.picked_qty, 0)
    FOR UPDATE OF plib
  LOOP
    v_release_qty := v_rec.allocated_qty - COALESCE(v_rec.picked_qty, 0);

    UPDATE inventory_batches
    SET available_qty = available_qty + v_release_qty,
        reserved_qty = GREATEST(0, reserved_qty - v_release_qty)
    WHERE id = v_rec.batch_id;

    IF v_product_releases ? v_rec.product_id::text THEN
      v_product_releases := jsonb_set(
        v_product_releases,
        ARRAY[v_rec.product_id::text],
        to_jsonb((v_product_releases->>v_rec.product_id::text)::integer + v_release_qty)
      );
    ELSE
      v_product_releases := jsonb_set(
        v_product_releases,
        ARRAY[v_rec.product_id::text],
        to_jsonb(v_release_qty)
      );
    END IF;

    v_total_released := v_total_released + v_release_qty;

    UPDATE packing_list_item_batches
    SET allocated_qty = COALESCE(picked_qty, 0)
    WHERE id = v_rec.plib_id;
  END LOOP;

  FOR v_rec IN
    SELECT key::uuid AS product_id, value::integer AS released_qty
    FROM jsonb_each_text(v_product_releases)
  LOOP
    UPDATE distributor_inventory
    SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_rec.released_qty)
    WHERE distributor_id = v_dist_id
      AND product_id = v_rec.product_id;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_released', v_total_released
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.release_batch_reservation(p_batch_id uuid, p_qty integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch RECORD;
BEGIN
  SELECT id, distributor_id, product_id, reserved_qty
  INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch not found: %', p_batch_id;
  END IF;

  UPDATE inventory_batches
  SET reserved_qty = GREATEST(0, reserved_qty - p_qty),
      available_qty = available_qty + p_qty
  WHERE id = p_batch_id;

  -- Update summary: only touch reserved_quantity (available_quantity is generated)
  UPDATE distributor_inventory
  SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_qty)
  WHERE distributor_id = v_batch.distributor_id
    AND product_id = v_batch.product_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.release_shortfall_on_packed(p_packing_list_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rec RECORD;
  v_total_released NUMERIC := 0;
  v_shortfall NUMERIC;
  v_dist_id UUID;
BEGIN
  SELECT distributor_id INTO v_dist_id FROM packing_lists WHERE id = p_packing_list_id;

  FOR v_rec IN
    SELECT plib.id, plib.batch_id, plib.allocated_qty, plib.picked_qty, pli.product_id
    FROM packing_list_item_batches plib
    JOIN packing_list_items pli ON pli.id = plib.packing_list_item_id
    WHERE pli.packing_list_id = p_packing_list_id
  LOOP
    v_shortfall := v_rec.allocated_qty - COALESCE(v_rec.picked_qty, 0);
    IF v_shortfall > 0 THEN
      -- Release unpicked reserved stock
      UPDATE inventory_batches
      SET reserved_qty = GREATEST(0, reserved_qty - v_shortfall)
      WHERE id = v_rec.batch_id;

      -- Reduce allocated to match picked
      UPDATE packing_list_item_batches
      SET allocated_qty = COALESCE(picked_qty, 0)
      WHERE id = v_rec.id;

      v_total_released := v_total_released + v_shortfall;
    END IF;
  END LOOP;

  -- Recalculate distributor_inventory
  IF v_dist_id IS NOT NULL THEN
    UPDATE distributor_inventory di
    SET reserved_quantity = COALESCE((
      SELECT SUM(ib.reserved_qty) FROM inventory_batches ib
      WHERE ib.distributor_id = di.distributor_id AND ib.product_id = di.product_id
        AND (di.warehouse_id IS NULL OR ib.warehouse_id = di.warehouse_id)
    ), 0)
    WHERE di.distributor_id = v_dist_id
      AND di.product_id IN (SELECT DISTINCT pli.product_id FROM packing_list_items pli WHERE pli.packing_list_id = p_packing_list_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'total_released', v_total_released);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_effective_leave_policy(p_user_id uuid, p_leave_type_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_global RECORD;
  v_override RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_global FROM global_leave_policy LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No global leave policy configured');
  END IF;

  v_result := jsonb_build_object(
    'is_enabled', v_global.is_enabled,
    'enable_half_day', v_global.enable_half_day,
    'enable_sandwich_rule', v_global.enable_sandwich_rule,
    'allow_backdated_leave', v_global.allow_backdated_leave,
    'max_backdate_days', v_global.max_backdate_days,
    'min_notice_period_days', v_global.min_notice_period_days,
    'max_continuous_leave_days', v_global.max_continuous_leave_days,
    'allow_negative_balance', v_global.allow_negative_balance,
    'max_negative_limit', v_global.max_negative_limit,
    'enable_carry_forward', v_global.enable_carry_forward,
    'max_carry_forward_limit', v_global.max_carry_forward_limit,
    'reset_cycle', v_global.reset_cycle,
    'custom_reset_date', v_global.custom_reset_date
  );

  SELECT * INTO v_override 
  FROM leave_type_policy_override 
  WHERE leave_type_id = p_leave_type_id AND override_enabled = true;

  IF FOUND THEN
    IF v_override.allow_negative_balance IS NOT NULL THEN
      v_result := v_result || jsonb_build_object('allow_negative_balance', v_override.allow_negative_balance);
    END IF;
    IF v_override.max_negative_limit IS NOT NULL THEN
      v_result := v_result || jsonb_build_object('max_negative_limit', v_override.max_negative_limit);
    END IF;
    IF v_override.enable_carry_forward IS NOT NULL THEN
      v_result := v_result || jsonb_build_object('enable_carry_forward', v_override.enable_carry_forward);
    END IF;
    IF v_override.max_carry_forward_limit IS NOT NULL THEN
      v_result := v_result || jsonb_build_object('max_carry_forward_limit', v_override.max_carry_forward_limit);
    END IF;
    IF v_override.carry_forward_expiry_months IS NOT NULL THEN
      v_result := v_result || jsonb_build_object('carry_forward_expiry_months', v_override.carry_forward_expiry_months);
    END IF;
    IF v_override.custom_reset_cycle IS NOT NULL THEN
      v_result := v_result || jsonb_build_object('reset_cycle', v_override.custom_reset_cycle);
    END IF;
  END IF;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_products_for_order(p_query text, p_category text DEFAULT NULL::text, p_limit integer DEFAULT 30)
 RETURNS TABLE(id uuid, sku text, name text, rate numeric, unit text, closing_stock integer, is_active boolean, category_name text, is_focused_product boolean, variants jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT COALESCE(NULLIF(trim(p_query), ''), '') AS term
  ),
  matched AS (
    SELECT DISTINCT p.id
    FROM public.products p
    LEFT JOIN public.product_variants pv ON pv.product_id = p.id
    LEFT JOIN public.product_categories pc ON pc.id = p.category_id
    , q
    WHERE COALESCE(p.is_active, true) = true
      AND (p_category IS NULL OR p_category = 'all' OR pc.name = p_category)
      AND (
        q.term = ''
        OR p.name ILIKE '%' || q.term || '%'
        OR p.sku ILIKE '%' || q.term || '%'
        OR (pv.variant_name ILIKE '%' || q.term || '%' AND COALESCE(pv.is_active, true) = true)
        OR (pv.sku ILIKE '%' || q.term || '%' AND COALESCE(pv.is_active, true) = true)
      )
  )
  SELECT
    p.id,
    p.sku,
    p.name,
    p.rate,
    p.unit,
    p.closing_stock,
    p.is_active,
    pc.name AS category_name,
    p.is_focused_product,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pv.id,
            'variant_name', pv.variant_name,
            'sku', pv.sku,
            'price', pv.price,
            'is_active', pv.is_active,
            'is_focused_product', pv.is_focused_product
          )
          ORDER BY pv.variant_name
        )
        FROM public.product_variants pv
        WHERE pv.product_id = p.id
          AND COALESCE(pv.is_active, true) = true
      ),
      '[]'::jsonb
    ) AS variants
  FROM public.products p
  LEFT JOIN public.product_categories pc ON pc.id = p.category_id
  JOIN matched m ON m.id = p.id
  , q
  ORDER BY
    CASE WHEN q.term <> '' AND p.name ILIKE q.term || '%' THEN 0
         WHEN q.term <> '' AND p.sku ILIKE q.term || '%' THEN 1
         ELSE 2
    END,
    p.name
  LIMIT GREATEST(1, LEAST(p_limit, 100));
$function$
;

CREATE OR REPLACE FUNCTION public.send_broadcast_notification(p_title text, p_message text, p_actor_user_id uuid, p_target_type text DEFAULT 'all'::text, p_target_ids text[] DEFAULT NULL::text[], p_portals text[] DEFAULT ARRAY['customer_portal'::text], p_field_sales_target_type text DEFAULT 'all'::text, p_field_sales_target_ids text[] DEFAULT NULL::text[], p_distributor_target_type text DEFAULT 'all'::text, p_distributor_target_ids text[] DEFAULT NULL::text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.send_notification(user_id_param uuid, title_param text, message_param text, type_param text DEFAULT 'info'::text, related_table_param text DEFAULT NULL::text, related_id_param uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, related_table, related_id)
    VALUES (user_id_param, title_param, message_param, type_param, related_table_param, related_id_param)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_distributors_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_invoice_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$
;

CREATE OR REPLACE FUNCTION public.set_order_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.order_date := NEW.created_at::date;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_order_invoice_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.invoice_number IS NULL
     OR BTRIM(NEW.invoice_number) = ''
     OR EXISTS (
       SELECT 1
       FROM public.orders o
       WHERE o.invoice_number = NEW.invoice_number
     ) THEN
    NEW.invoice_number := public.generate_invoice_number();
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_territory_created_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$
;

CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$
;

CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$
;

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$
;

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.sync_inventory_batch_available_qty()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.available_qty := GREATEST(0, COALESCE(NEW.quantity, 0) - COALESCE(NEW.reserved_qty, 0));
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_inventory_batch_quantity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If quantity is not provided (0 or NULL) but available_qty is, derive quantity
  IF (NEW.quantity IS NULL OR NEW.quantity = 0) AND COALESCE(NEW.available_qty, 0) > 0 THEN
    NEW.quantity := COALESCE(NEW.available_qty, 0) + COALESCE(NEW.reserved_qty, 0);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_order_status_from_delivery_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN
    CASE NEW.delivery_status
      WHEN 'in_packing_list' THEN
        NEW.status := 'processing';
      WHEN 'dispatched' THEN
        NEW.status := 'dispatched';
        -- Auto-create notification for customer portal
        -- related_id is uuid, so pass NEW.id directly (not NEW.id::text)
        INSERT INTO public.notifications (retailer_id, title, message, type, related_table, related_id, target_portal)
        VALUES (
          NEW.retailer_id,
          'Order Out for Delivery',
          'Your order #' || COALESCE(NEW.invoice_number, LEFT(NEW.id::text, 8)) || ' is out for delivery. Please keep the payment ready.',
          'order_status',
          'orders',
          NEW.id,
          'customer_portal'
        );
      WHEN 'delivered' THEN
        NEW.status := 'delivered';
      ELSE
        NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_order_with_items(p_order jsonb, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_result jsonb;
  v_existing_order_id uuid;
  v_items_count int := 0;
BEGIN
  -- Extract order ID if present
  v_order_id := (p_order->>'id')::uuid;
  
  -- Check if order already exists by ID
  IF v_order_id IS NOT NULL THEN
    SELECT id INTO v_existing_order_id FROM orders WHERE id = v_order_id;
  END IF;
  
  IF v_existing_order_id IS NOT NULL THEN
    -- Order exists, check if items exist
    SELECT count(*) INTO v_items_count FROM order_items WHERE order_id = v_existing_order_id;
    
    IF v_items_count = 0 AND jsonb_array_length(p_items) > 0 THEN
      -- Insert missing items
      INSERT INTO order_items (
        order_id, product_id, product_name, variant_name, quantity, 
        price, total, scheme_discount, scheme_name, category_id, hsn_code
      )
      SELECT 
        v_existing_order_id,
        (item->>'product_id')::uuid,
        item->>'product_name',
        item->>'variant_name',
        COALESCE((item->>'quantity')::int, 0),
        COALESCE((item->>'price')::numeric, 0),
        COALESCE((item->>'total')::numeric, 0),
        COALESCE((item->>'scheme_discount')::numeric, 0),
        item->>'scheme_name',
        NULLIF(item->>'category_id', '')::uuid,
        item->>'hsn_code'
      FROM jsonb_array_elements(p_items) AS item;
    END IF;
    
    RETURN jsonb_build_object('order_id', v_existing_order_id, 'status', 'existing', 'items_inserted', v_items_count = 0);
  END IF;
  
  -- Insert new order
  INSERT INTO orders (
    id, user_id, retailer_id, retailer_name, visit_id, beat_name,
    order_date, total_amount, total_qty, status, payment_method,
    is_credit_order, credit_pending_amount, credit_paid_amount,
    previous_pending_cleared, invoice_number, idempotency_key,
    created_at, updated_at
  ) VALUES (
    COALESCE(v_order_id, gen_random_uuid()),
    NULLIF(p_order->>'user_id', '')::uuid,
    NULLIF(p_order->>'retailer_id', '')::uuid,
    p_order->>'retailer_name',
    NULLIF(p_order->>'visit_id', '')::uuid,
    p_order->>'beat_name',
    COALESCE(p_order->>'order_date', CURRENT_DATE::text),
    COALESCE((p_order->>'total_amount')::numeric, 0),
    COALESCE((p_order->>'total_qty')::int, 0),
    COALESCE(p_order->>'status', 'pending'),
    p_order->>'payment_method',
    COALESCE((p_order->>'is_credit_order')::boolean, false),
    COALESCE((p_order->>'credit_pending_amount')::numeric, 0),
    COALESCE((p_order->>'credit_paid_amount')::numeric, 0),
    COALESCE((p_order->>'previous_pending_cleared')::numeric, 0),
    p_order->>'invoice_number',
    p_order->>'idempotency_key',
    COALESCE((p_order->>'created_at')::timestamptz, now()),
    now()
  )
  RETURNING id INTO v_order_id;
  
  -- Insert items
  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO order_items (
      order_id, product_id, product_name, variant_name, quantity, 
      price, total, scheme_discount, scheme_name, category_id, hsn_code
    )
    SELECT 
      v_order_id,
      (item->>'product_id')::uuid,
      item->>'product_name',
      item->>'variant_name',
      COALESCE((item->>'quantity')::int, 0),
      COALESCE((item->>'price')::numeric, 0),
      COALESCE((item->>'total')::numeric, 0),
      COALESCE((item->>'scheme_discount')::numeric, 0),
      item->>'scheme_name',
      NULLIF(item->>'category_id', '')::uuid,
      item->>'hsn_code'
    FROM jsonb_array_elements(p_items) AS item;
  END IF;
  
  RETURN jsonb_build_object('order_id', v_order_id, 'status', 'created', 'items_inserted', true);
  
EXCEPTION WHEN unique_violation THEN
  -- Handle race condition - order was inserted between our check and insert
  SELECT id INTO v_order_id FROM orders WHERE id = (p_order->>'id')::uuid;
  RETURN jsonb_build_object('order_id', COALESCE(v_order_id, gen_random_uuid()), 'status', 'conflict', 'items_inserted', false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_task_logged_hours()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE pm_tasks SET logged_hours = (
    SELECT COALESCE(SUM(hours), 0) FROM pm_time_logs WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
  ) WHERE id = COALESCE(NEW.task_id, OLD.task_id);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_whatsapp_phone_name_cache()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_digits text;
  v_d10 text;
  v_old_digits text;
  v_old_d10 text;
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.phone IS NOT NULL THEN
    v_old_digits := regexp_replace(OLD.phone, '\\D', '', 'g');
    IF length(v_old_digits) >= 10 THEN
      v_old_d10 := CASE WHEN length(v_old_digits) = 12 AND substring(v_old_digits, 1, 2) = '91'
                        THEN substring(v_old_digits, 3)
                        ELSE v_old_digits END;
      DELETE FROM public.whatsapp_phone_name_cache
       WHERE phone_key IN (v_old_d10, '91' || v_old_d10)
         AND retailer_id = OLD.id;
    END IF;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE')
     AND NEW.phone IS NOT NULL
     AND NEW.name IS NOT NULL THEN
    v_digits := regexp_replace(NEW.phone, '\\D', '', 'g');
    IF length(v_digits) >= 10 THEN
      v_d10 := CASE WHEN length(v_digits) = 12 AND substring(v_digits, 1, 2) = '91'
                    THEN substring(v_digits, 3)
                    ELSE v_digits END;

      INSERT INTO public.whatsapp_phone_name_cache (phone_key, retailer_id, name, updated_at)
      VALUES (v_d10, NEW.id, NEW.name, now())
      ON CONFLICT (phone_key) DO UPDATE
        SET retailer_id = EXCLUDED.retailer_id,
            name = EXCLUDED.name,
            updated_at = now();

      INSERT INTO public.whatsapp_phone_name_cache (phone_key, retailer_id, name, updated_at)
      VALUES ('91' || v_d10, NEW.id, NEW.name, now())
      ON CONFLICT (phone_key) DO UPDATE
        SET retailer_id = EXCLUDED.retailer_id,
            name = EXCLUDED.name,
            updated_at = now();
    END IF;
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_uom_category_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_uom_master_protect_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.product_uom_mapping WHERE uom_id = OLD.id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete unit %: it is used by % product mapping(s). Disable it instead.',
      OLD.code, v_count USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_uom_master_sync_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_code text; v_id uuid;
BEGIN
  IF NEW.category_id IS NULL AND NEW.category IS NOT NULL THEN
    SELECT id INTO v_id FROM public.uom_category WHERE code = NEW.category;
    NEW.category_id := v_id;
  ELSIF NEW.category_id IS NOT NULL THEN
    SELECT code INTO v_code FROM public.uom_category WHERE id = NEW.category_id;
    IF v_code IS NOT NULL THEN NEW.category := v_code; END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_uom_master_validate_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.category IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.uom_category WHERE code = NEW.category
  ) THEN
    RAISE EXCEPTION 'Unknown UoM category: %. Add it via Admin → UoM Master → Categories first.', NEW.category;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.to_base_qty(p_product_id uuid, p_qty numeric, p_uom_code text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_factor numeric;
BEGIN
  IF p_uom_code IS NULL OR p_qty IS NULL THEN
    RETURN p_qty;
  END IF;

  SELECT pum.conversion_to_base INTO v_factor
  FROM public.product_uom_mapping pum
  JOIN public.uom_master um ON um.id = pum.uom_id
  WHERE pum.product_id = p_product_id
    AND upper(um.code) = upper(p_uom_code)
    AND COALESCE(pum.is_active, true) = true
  LIMIT 1;

  IF v_factor IS NULL OR v_factor <= 0 THEN
    -- Safe fallback: treat as already base
    RETURN p_qty;
  END IF;

  RETURN p_qty * v_factor;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.track_territory_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Close previous assignment when user changes
  IF TG_OP = 'UPDATE' AND OLD.assigned_user_id IS DISTINCT FROM NEW.assigned_user_id THEN
    -- Close old assignment
    IF OLD.assigned_user_id IS NOT NULL THEN
      UPDATE territory_assignment_history
      SET assigned_to = now()
      WHERE territory_id = OLD.id 
        AND assigned_user_id = OLD.assigned_user_id 
        AND assigned_to IS NULL;
    END IF;
    
    -- Create new assignment
    IF NEW.assigned_user_id IS NOT NULL THEN
      INSERT INTO territory_assignment_history (territory_id, assigned_user_id, assigned_from)
      VALUES (NEW.id, NEW.assigned_user_id, now());
    END IF;
  END IF;
  
  -- Create initial assignment on insert
  IF TG_OP = 'INSERT' AND NEW.assigned_user_id IS NOT NULL THEN
    INSERT INTO territory_assignment_history (territory_id, assigned_user_id, assigned_from)
    VALUES (NEW.id, NEW.assigned_user_id, now());
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_create_expense_approval_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_workflow_id uuid;
  v_workflow RECORD;
  v_step RECORD;
  v_request_id uuid;
  v_approver_id uuid;
  v_chain RECORD;
  v_levels integer := 0;
  v_category_id uuid;
BEGIN
  -- Only fire on new submissions (status = 'submitted')
  IF NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;
  
  -- For updates, only fire if status changed to submitted
  IF TG_OP = 'UPDATE' AND OLD.status = 'submitted' THEN
    RETURN NEW;
  END IF;

  -- Step 1: Try to match an expense_approval_rule
  v_workflow_id := NULL;

  -- Try amount-based rules first
  SELECT r.workflow_id INTO v_workflow_id
  FROM expense_approval_rules r
  WHERE r.is_active = true
    AND r.condition_type = 'amount_range'
    AND (r.condition_value->>'min')::numeric <= NEW.amount
    AND (r.condition_value->>'max')::numeric >= NEW.amount
  ORDER BY r.priority ASC
  LIMIT 1;

  -- Try category-based rules if no amount match
  IF v_workflow_id IS NULL THEN
    -- Look up category id from name
    SELECT ec.id INTO v_category_id
    FROM expense_categories ec
    WHERE ec.name = NEW.category AND ec.is_active = true
    LIMIT 1;

    IF v_category_id IS NOT NULL THEN
      SELECT r.workflow_id INTO v_workflow_id
      FROM expense_approval_rules r
      WHERE r.is_active = true
        AND r.condition_type = 'category'
        AND (r.condition_value->>'category_id')::uuid = v_category_id
      ORDER BY r.priority ASC
      LIMIT 1;
    END IF;
  END IF;

  -- Try 'always' rules as final fallback
  IF v_workflow_id IS NULL THEN
    SELECT r.workflow_id INTO v_workflow_id
    FROM expense_approval_rules r
    WHERE r.is_active = true
      AND r.condition_type = 'always'
    ORDER BY r.priority ASC
    LIMIT 1;
  END IF;

  -- Fallback: use default workflow
  IF v_workflow_id IS NULL THEN
    SELECT id INTO v_workflow_id
    FROM approval_workflows
    WHERE entity_type = 'expense' AND is_default = true AND is_active = true
    LIMIT 1;
  END IF;

  -- Ultimate fallback: use old approval_config behavior
  IF v_workflow_id IS NULL THEN
    DECLARE
      v_approval_mode text;
    BEGIN
      SELECT approval_mode INTO v_approval_mode
      FROM approval_config
      WHERE entity_type = 'expense';

      IF v_approval_mode = 'auto' THEN
        NEW.status := 'manager_approved';
        NEW.approved_at := now();
        RETURN NEW;
      END IF;

      PERFORM create_approval_request('expense', NEW.id, NEW.user_id);
      RETURN NEW;
    END;
  END IF;

  -- Load workflow
  SELECT * INTO v_workflow FROM approval_workflows WHERE id = v_workflow_id;

  -- If no steps exist, auto-approve
  IF NOT EXISTS (SELECT 1 FROM workflow_steps WHERE workflow_id = v_workflow_id) THEN
    NEW.status := 'manager_approved';
    NEW.approved_at := now();
    RETURN NEW;
  END IF;

  -- Create approval_request
  INSERT INTO approval_requests (entity_type, entity_id, requester_id, current_level, total_levels, status)
  SELECT 'expense', NEW.id, NEW.user_id, 1, COUNT(*), 'pending'
  FROM workflow_steps WHERE workflow_id = v_workflow_id
  RETURNING id INTO v_request_id;

  -- Create approval_steps from workflow_steps
  FOR v_step IN
    SELECT * FROM workflow_steps
    WHERE workflow_id = v_workflow_id
    ORDER BY step_number ASC
  LOOP
    v_approver_id := NULL;

    IF v_step.approver_type = 'specific_user' AND v_step.specific_user_id IS NOT NULL THEN
      v_approver_id := v_step.specific_user_id;
    ELSIF v_step.approver_type = 'manager' OR v_step.approver_type = 'hierarchy_level' THEN
      -- Get manager at the right level from reporting chain
      SELECT manager_id INTO v_approver_id
      FROM get_reporting_chain(NEW.user_id)
      WHERE level = COALESCE(v_step.hierarchy_level, v_step.step_number)
      LIMIT 1;
    END IF;

    -- Skip step if no approver found
    IF v_approver_id IS NOT NULL THEN
      INSERT INTO approval_steps (approval_request_id, level, approver_id, status)
      VALUES (v_request_id, v_step.step_number, v_approver_id, 'pending');
    END IF;
  END LOOP;

  -- Log submission
  INSERT INTO approval_audit_log (approval_request_id, entity_type, entity_id, action, performed_by, level, metadata)
  VALUES (v_request_id, 'expense', NEW.id, 'submitted', NEW.user_id, 0,
          jsonb_build_object('workflow_id', v_workflow_id, 'workflow_name', v_workflow.workflow_name));

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_create_leave_approval_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM create_approval_request('leave', NEW.id, NEW.user_id);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_create_regularization_approval_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM create_approval_request('regularization', NEW.id, NEW.user_id);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_initialize_leave_policy_balances()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.accrual_type = 'monthly' THEN
    PERFORM initialize_leave_policy_balances(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_notification_activity_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM emit_notification_event('ACTIVITY_COMPLETED', 'activity_events', NEW.id::text, NEW.user_id,
      jsonb_build_object('record_name', COALESCE(NEW.activity_name, NEW.activity_type), 'date', NEW.activity_date::text));
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_notification_approval_requests()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM emit_notification_event('RECORD_APPROVED', 'approval_requests', NEW.id::text, COALESCE(NEW.final_approved_by, NEW.requester_id),
        jsonb_build_object('record_name', NEW.entity_type || ' approval', 'date', now()::text));
    ELSIF NEW.status = 'rejected' THEN
      PERFORM emit_notification_event('RECORD_REJECTED', 'approval_requests', NEW.id::text, NEW.requester_id,
        jsonb_build_object('record_name', NEW.entity_type || ' approval', 'date', now()::text));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_notification_leave_applications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM emit_notification_event('RECORD_CREATED', 'leave_applications', NEW.id::text, NEW.user_id,
      jsonb_build_object('record_name', 'Leave Application', 'date', NEW.start_date::text));
  ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM emit_notification_event('RECORD_APPROVED', 'leave_applications', NEW.id::text, NEW.user_id,
        jsonb_build_object('record_name', 'Leave Application', 'date', NEW.start_date::text));
    ELSIF NEW.status = 'rejected' THEN
      PERFORM emit_notification_event('RECORD_REJECTED', 'leave_applications', NEW.id::text, NEW.user_id,
        jsonb_build_object('record_name', 'Leave Application', 'date', NEW.start_date::text));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_notification_orders()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Safety: only emit notifications if user_id exists in auth.users
  IF NEW.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RAISE LOG 'trigger_notification_orders: skipping notification, user_id % not in auth.users', NEW.user_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM emit_notification_event('RECORD_CREATED', 'orders', NEW.id::text, NEW.user_id,
      jsonb_build_object('record_name', COALESCE(NEW.invoice_number, NEW.id::text), 'date', NEW.order_date::text));
  ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM emit_notification_event('RECORD_APPROVED', 'orders', NEW.id::text, NEW.user_id,
        jsonb_build_object('record_name', COALESCE(NEW.invoice_number, NEW.id::text), 'date', NEW.order_date::text));
    ELSE
      PERFORM emit_notification_event('RECORD_UPDATED', 'orders', NEW.id::text, NEW.user_id,
        jsonb_build_object('record_name', COALESCE(NEW.invoice_number, NEW.id::text), 'date', NEW.order_date::text));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_notification_pm_tasks()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM emit_notification_event('TASK_ASSIGNED', 'pm_tasks', NEW.id::text, COALESCE(NEW.assigned_to, NEW.created_by),
      jsonb_build_object('record_name', NEW.title, 'date', NEW.created_at::text));
  ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status AND NEW.status = 'done' THEN
    PERFORM emit_notification_event('ACTIVITY_COMPLETED', 'pm_tasks', NEW.id::text, COALESCE(NEW.assigned_to, NEW.created_by),
      jsonb_build_object('record_name', NEW.title, 'date', now()::text));
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_notification_regularization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM emit_notification_event('RECORD_CREATED', 'regularization_requests', NEW.id::text, NEW.user_id,
      jsonb_build_object('record_name', 'Regularization Request', 'date', NEW.attendance_date::text));
  ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM emit_notification_event('RECORD_APPROVED', 'regularization_requests', NEW.id::text, NEW.user_id,
        jsonb_build_object('record_name', 'Regularization Request', 'date', NEW.attendance_date::text));
    ELSIF NEW.status = 'rejected' THEN
      PERFORM emit_notification_event('RECORD_REJECTED', 'regularization_requests', NEW.id::text, NEW.user_id,
        jsonb_build_object('record_name', 'Regularization Request', 'date', NEW.attendance_date::text));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_notification_visits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_retailer_name text;
BEGIN
  -- Look up retailer name from retailers table
  SELECT name INTO v_retailer_name FROM public.retailers WHERE id = NEW.retailer_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM emit_notification_event('RECORD_CREATED', 'visits', NEW.id::text, NEW.user_id,
      jsonb_build_object('record_name', COALESCE(v_retailer_name, 'Visit'), 'date', NEW.planned_date::text));
  ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    IF NEW.status = 'productive' THEN
      PERFORM emit_notification_event('ACTIVITY_COMPLETED', 'visits', NEW.id::text, NEW.user_id,
        jsonb_build_object('record_name', COALESCE(v_retailer_name, 'Visit'), 'date', NEW.planned_date::text));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_refresh_attendance_summaries()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date   date;
  v_user   uuid;
BEGIN
  -- Get the affected date and user_id from NEW or OLD
  IF TG_OP = 'DELETE' THEN
    v_date := OLD.date;
    v_user := OLD.user_id;
  ELSE
    v_date := NEW.date;
    v_user := NEW.user_id;
  END IF;

  -- Only proceed for meaningful status changes (not just location updates)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS NOT DISTINCT FROM NEW.status 
       AND OLD.total_hours IS NOT DISTINCT FROM NEW.total_hours
       AND OLD.check_out_time IS NOT DISTINCT FROM NEW.check_out_time THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Refresh daily summary for affected date
  PERFORM refresh_daily_admin_summary(v_date);

  -- Refresh user monthly summary for affected user+month
  PERFORM refresh_user_monthly_summary(
    v_user,
    EXTRACT(YEAR FROM v_date)::integer,
    EXTRACT(MONTH FROM v_date)::integer
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_refresh_leave_summaries()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only refresh when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Refresh daily summary for each leave day
    PERFORM refresh_daily_admin_summary(d::date)
    FROM generate_series(NEW.start_date, NEW.end_date, '1 day'::interval) d;

    -- Refresh user monthly summary (handles multi-month leaves)
    PERFORM refresh_user_monthly_summary(
      NEW.user_id,
      EXTRACT(YEAR FROM NEW.start_date)::integer,
      EXTRACT(MONTH FROM NEW.start_date)::integer
    );

    IF EXTRACT(MONTH FROM NEW.end_date) != EXTRACT(MONTH FROM NEW.start_date) THEN
      PERFORM refresh_user_monthly_summary(
        NEW.user_id,
        EXTRACT(YEAR FROM NEW.end_date)::integer,
        EXTRACT(MONTH FROM NEW.end_date)::integer
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_sync_entity_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NEW.entity_type = 'leave' THEN
      UPDATE leave_applications SET 
        status = 'approved', 
        approved_by = NEW.final_approved_by, 
        approved_date = now(),
        final_approved_by = NEW.final_approved_by
      WHERE id = NEW.entity_id;
    ELSIF NEW.entity_type = 'regularization' THEN
      UPDATE regularization_requests SET 
        status = 'approved', 
        approved_by = NEW.final_approved_by, 
        approved_at = now()
      WHERE id = NEW.entity_id;
    ELSIF NEW.entity_type = 'expense' THEN
      UPDATE additional_expenses SET 
        status = 'manager_approved', 
        approved_by = NEW.final_approved_by, 
        approved_at = now()
      WHERE id = NEW.entity_id;
    END IF;
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    IF NEW.entity_type = 'leave' THEN
      UPDATE leave_applications SET status = 'rejected' WHERE id = NEW.entity_id;
    ELSIF NEW.entity_type = 'regularization' THEN
      UPDATE regularization_requests SET status = 'rejected' WHERE id = NEW.entity_id;
    ELSIF NEW.entity_type = 'expense' THEN
      UPDATE additional_expenses SET 
        status = 'rejected',
        rejection_reason = (
          SELECT rejection_reason FROM approval_steps 
          WHERE approval_request_id = NEW.id AND status = 'rejected' 
          LIMIT 1
        )
      WHERE id = NEW.entity_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.unlock_password_reset(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can unlock accounts
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can unlock accounts';
  END IF;
  
  -- Delete recent failed attempts to unlock
  DELETE FROM public.password_reset_attempts
  WHERE email = user_email
    AND attempted_at > NOW() - INTERVAL '1 hour'
    AND was_successful = false;
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.uom_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_beats_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_chat_conversation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_child_territories_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update parent's child count when a territory is added/updated with a parent
  IF NEW.parent_id IS NOT NULL THEN
    UPDATE territories
    SET child_territories_count = (
      SELECT COUNT(*) 
      FROM territories 
      WHERE parent_id = NEW.parent_id
    )
    WHERE id = NEW.parent_id;
  END IF;
  
  -- Update old parent's count if parent changed
  IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id AND OLD.parent_id IS NOT NULL THEN
    UPDATE territories
    SET child_territories_count = (
      SELECT COUNT(*) 
      FROM territories 
      WHERE parent_id = OLD.parent_id
    )
    WHERE id = OLD.parent_id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_child_territories_count_on_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF OLD.parent_id IS NOT NULL THEN
    UPDATE territories
    SET child_territories_count = (
      SELECT COUNT(*) 
      FROM territories 
      WHERE parent_id = OLD.parent_id
    )
    WHERE id = OLD.parent_id;
  END IF;
  
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_credit_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_credit_scores_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_gamification_daily_tracking_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_invoice_document_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_leave_balance_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  leave_days NUMERIC;
BEGIN
  leave_days := COALESCE(NEW.days_requested, NEW.end_date - NEW.start_date + 1);

  -- NEW application (INSERT): deduct immediately
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.leave_balance (user_id, leave_type_id, year, opening_balance, used_balance)
    VALUES (NEW.user_id, NEW.leave_type_id, EXTRACT(YEAR FROM NEW.start_date)::INTEGER, 0, leave_days)
    ON CONFLICT (user_id, leave_type_id, year)
    DO UPDATE SET
      used_balance = leave_balance.used_balance + leave_days,
      updated_at = now();
    RETURN NEW;
  END IF;

  -- UPDATE: if status changed to rejected/cancelled, restore balance
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IN ('rejected', 'cancelled') AND OLD.status NOT IN ('rejected', 'cancelled') THEN
      UPDATE public.leave_balance
      SET used_balance = GREATEST(0, used_balance - leave_days), updated_at = now()
      WHERE user_id = NEW.user_id
        AND leave_type_id = NEW.leave_type_id
        AND year = EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_new_retailer_actual()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.user_period_targets upt
  SET 
    actual_value = public.calculate_new_retailers(NEW.user_id, upt.period_start, upt.period_end),
    achievement_percent = CASE 
      WHEN target_value > 0 THEN ROUND((actual_value / target_value) * 100, 2) 
      ELSE 0 
    END,
    last_calculated_at = now()
  WHERE upt.user_id = NEW.user_id
    AND upt.kpi_id = (SELECT id FROM public.target_kpi_definitions WHERE kpi_key = 'new_retailer_addition')
    AND NEW.created_at::DATE BETWEEN upt.period_start AND upt.period_end;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_petty_cash_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'submitted' THEN
    UPDATE petty_cash_funds SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.fund_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'submitted' AND NEW.status = 'rejected' THEN
      UPDATE petty_cash_funds SET balance = balance + OLD.amount, updated_at = now() WHERE id = NEW.fund_id;
    ELSIF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
      UPDATE petty_cash_funds SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.fund_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_picking_atomic(p_batch_row_id uuid, p_picked_qty numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pli_id UUID;
  v_total_picked NUMERIC;
  v_total_allocated NUMERIC;
  v_short_qty NUMERIC;
BEGIN
  -- Update the batch row
  UPDATE packing_list_item_batches
  SET picked_qty = p_picked_qty
  WHERE id = p_batch_row_id
  RETURNING packing_list_item_id INTO v_pli_id;

  IF v_pli_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch row not found');
  END IF;

  -- Sum all batches for the parent item
  SELECT COALESCE(SUM(picked_qty), 0), COALESCE(SUM(allocated_qty), 0)
  INTO v_total_picked, v_total_allocated
  FROM packing_list_item_batches
  WHERE packing_list_item_id = v_pli_id;

  v_short_qty := GREATEST(0, v_total_allocated - v_total_picked);

  -- Update parent item
  UPDATE packing_list_items
  SET picked_qty = v_total_picked, short_qty = v_short_qty
  WHERE id = v_pli_id;

  RETURN jsonb_build_object('success', true, 'total_picked', v_total_picked, 'short_qty', v_short_qty);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_price_books_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_retailer_analytics()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_retailer_id uuid;
  v_three_months_ago date;
  v_total_orders numeric;
  v_total_visits integer;
  v_productive_visits integer;
BEGIN
  -- Determine retailer_id based on the trigger context
  IF TG_TABLE_NAME = 'orders' THEN
    v_retailer_id := NEW.retailer_id;
  ELSIF TG_TABLE_NAME = 'visits' THEN
    v_retailer_id := NEW.retailer_id;
  ELSE
    RETURN NEW;
  END IF;

  v_three_months_ago := CURRENT_DATE - INTERVAL '3 months';

  -- Calculate total confirmed orders in last 3 months
  SELECT COALESCE(COUNT(*), 0)
  INTO v_total_orders
  FROM orders
  WHERE retailer_id = v_retailer_id
    AND status = 'confirmed'
    AND order_date >= v_three_months_ago;

  -- Calculate total visits in last 3 months
  SELECT COALESCE(COUNT(*), 0)
  INTO v_total_visits
  FROM visits
  WHERE retailer_id = v_retailer_id
    AND planned_date >= v_three_months_ago;

  -- Calculate productive visits (visits with orders) in last 3 months
  SELECT COALESCE(COUNT(DISTINCT v.id), 0)
  INTO v_productive_visits
  FROM visits v
  WHERE v.retailer_id = v_retailer_id
    AND v.planned_date >= v_three_months_ago
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.visit_id = v.id
        AND o.status = 'confirmed'
    );

  -- Update retailer with calculated analytics
  UPDATE retailers
  SET
    avg_monthly_orders_3m = CASE WHEN v_total_orders > 0 THEN v_total_orders / 3.0 ELSE 0 END,
    avg_order_per_visit_3m = CASE WHEN v_total_visits > 0 THEN v_total_orders::numeric / v_total_visits ELSE 0 END,
    total_visits_3m = v_total_visits,
    productive_visits_3m = v_productive_visits,
    updated_at = NOW()
  WHERE id = v_retailer_id;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_retailer_last_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update last order date and value when order is confirmed
  IF NEW.status = 'confirmed' THEN
    UPDATE retailers
    SET 
      last_order_date = NEW.order_date,
      last_order_value = NEW.total_amount,
      order_value = NEW.total_amount,
      updated_at = NOW()
    WHERE id = NEW.retailer_id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_retailer_last_visit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE retailers
  SET 
    last_visit_date = NEW.planned_date,
    updated_at = NOW()
  WHERE id = NEW.retailer_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_retailer_loyalty_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_revenue_actual()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('confirmed', 'delivered') THEN
    UPDATE public.user_period_targets upt
    SET 
      actual_value = public.calculate_revenue_contribution(NEW.user_id, upt.period_start, upt.period_end),
      achievement_percent = CASE 
        WHEN target_value > 0 THEN ROUND((actual_value / target_value) * 100, 2) 
        ELSE 0 
      END,
      last_calculated_at = now()
    WHERE upt.user_id = NEW.user_id
      AND upt.kpi_id = (SELECT id FROM public.target_kpi_definitions WHERE kpi_key = 'revenue_contribution')
      AND NEW.order_date BETWEEN upt.period_start AND upt.period_end;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_security_info(new_hint_question text, new_hint_answer text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow users to update their own security info
  UPDATE public.profiles 
  SET 
    hint_question = new_hint_question,
    hint_answer = new_hint_answer,
    updated_at = now()
  WHERE id = auth.uid();
  
  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_security_info_secure(new_hint_question text, new_hint_answer text, new_recovery_email text DEFAULT NULL::text, new_phone_number text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow users to update their own security info
  UPDATE public.profiles 
  SET 
    hint_question = new_hint_question,
    hint_answer = public.hash_hint_answer(new_hint_answer),
    recovery_email = COALESCE(new_recovery_email, recovery_email),
    phone_number = COALESCE(new_phone_number, phone_number),
    updated_at = now()
  WHERE id = auth.uid();
  
  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_sensitive_profile_fields(new_phone_number text DEFAULT NULL::text, new_recovery_email text DEFAULT NULL::text, new_hint_question text DEFAULT NULL::text, new_hint_answer text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  hashed_answer text;
BEGIN
  -- Hash the hint answer if provided
  IF new_hint_answer IS NOT NULL THEN
    hashed_answer := public.hash_hint_answer(new_hint_answer);
  END IF;
  
  -- Update only the fields that were provided and belong to the authenticated user
  UPDATE public.profiles 
  SET 
    phone_number = COALESCE(new_phone_number, phone_number),
    recovery_email = COALESCE(new_recovery_email, recovery_email),
    hint_question = COALESCE(new_hint_question, hint_question),
    hint_answer = COALESCE(hashed_answer, hint_answer),
    updated_at = now()
  WHERE id = auth.uid();
  
  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_social_posts_automation_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_territory_audit_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.last_updated_by = auth.uid();
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_visit_actuals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update productive visits
  UPDATE public.user_period_targets upt
  SET 
    actual_value = public.calculate_productive_visits(NEW.user_id, upt.period_start, upt.period_end),
    achievement_percent = CASE 
      WHEN target_value > 0 THEN ROUND((actual_value / target_value) * 100, 2) 
      ELSE 0 
    END,
    last_calculated_at = now()
  WHERE upt.user_id = NEW.user_id
    AND upt.kpi_id = (SELECT id FROM public.target_kpi_definitions WHERE kpi_key = 'productive_visits')
    AND NEW.planned_date BETWEEN upt.period_start AND upt.period_end;
  
  -- Update beat adherence
  UPDATE public.user_period_targets upt
  SET 
    actual_value = public.calculate_beat_adherence(NEW.user_id, upt.period_start, upt.period_end),
    achievement_percent = actual_value,
    last_calculated_at = now()
  WHERE upt.user_id = NEW.user_id
    AND upt.kpi_id = (SELECT id FROM public.target_kpi_definitions WHERE kpi_key = 'beat_adherence')
    AND NEW.planned_date BETWEEN upt.period_start AND upt.period_end;
  
  -- Update visit completion rate
  UPDATE public.user_period_targets upt
  SET 
    actual_value = public.calculate_visit_completion_rate(NEW.user_id, upt.period_start, upt.period_end),
    achievement_percent = actual_value,
    last_calculated_at = now()
  WHERE upt.user_id = NEW.user_id
    AND upt.kpi_id = (SELECT id FROM public.target_kpi_definitions WHERE kpi_key = 'visit_completion_rate')
    AND NEW.planned_date BETWEEN upt.period_start AND upt.period_end;
    
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_visit_ai_insights_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_activity_event_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('active', 'completed') THEN
    RAISE EXCEPTION 'Invalid activity_events.status: %. Allowed: active, completed', NEW.status;
  END IF;
  -- Auto-stamp completed_at when transitioning to completed
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  -- Clear timestamp when reverting to active
  IF NEW.status = 'active' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_batch_packed_qty()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.packed_qty IS NULL THEN
    NEW.packed_qty := 0;
  END IF;
  IF NEW.packed_qty < 0 THEN
    RAISE EXCEPTION 'packed_qty cannot be negative';
  END IF;
  IF NEW.packed_qty > COALESCE(NEW.picked_qty, 0) THEN
    RAISE EXCEPTION 'packed_qty (%) cannot exceed picked_qty (%)', NEW.packed_qty, NEW.picked_qty;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_invitation_token(_token text)
 RETURNS TABLE(id uuid, email text, full_name text, phone_number text, manager_id uuid, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    ui.id,
    ui.email,
    ui.full_name,
    ui.phone_number,
    ui.manager_id,
    ui.expires_at
  FROM public.user_invitations ui
  WHERE ui.invitation_token = _token
    AND ui.status = 'pending'
    AND ui.expires_at > now()
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_leave_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC;
  v_policy RECORD;
  v_overlapping INTEGER;
  v_days_in_month INTEGER;
  v_calculated RECORD;
BEGIN
  -- Get policy for this leave type
  SELECT * INTO v_policy FROM leave_policy 
  WHERE leave_type_id = NEW.leave_type_id AND is_active = true;
  
  -- Check overlapping leaves
  SELECT COUNT(*) INTO v_overlapping FROM leave_applications
  WHERE user_id = NEW.user_id
    AND id != COALESCE(NEW.id, gen_random_uuid())
    AND status NOT IN ('rejected', 'cancelled')
    AND (NEW.start_date, NEW.end_date) OVERLAPS (start_date, end_date);
  
  IF v_overlapping > 0 THEN
    RAISE EXCEPTION 'Overlapping leave request exists for these dates';
  END IF;
  
  -- Check backdated limit
  IF v_policy.backdated_days_allowed IS NOT NULL AND v_policy.backdated_days_allowed >= 0 THEN
    IF NEW.start_date < CURRENT_DATE - v_policy.backdated_days_allowed THEN
      RAISE EXCEPTION 'Backdated leave request exceeds allowed limit of % days', v_policy.backdated_days_allowed;
    END IF;
  END IF;
  
  -- Check advance notice
  IF v_policy.min_days_advance_notice IS NOT NULL AND v_policy.min_days_advance_notice > 0 THEN
    IF NEW.start_date < CURRENT_DATE + v_policy.min_days_advance_notice THEN
      RAISE EXCEPTION 'Leave request requires % days advance notice', v_policy.min_days_advance_notice;
    END IF;
  END IF;
  
  -- Calculate days
  SELECT * INTO v_calculated FROM calculate_leave_days(NEW.start_date, NEW.end_date, NEW.leave_type_id, COALESCE(NEW.is_half_day, false));
  NEW.days_requested := v_calculated.total_days;
  NEW.sandwich_days_added := v_calculated.sandwich_days;
  
  -- Check max leaves per month
  IF v_policy.max_leaves_per_month IS NOT NULL THEN
    SELECT COALESCE(SUM(days_requested), 0) INTO v_days_in_month
    FROM leave_applications
    WHERE user_id = NEW.user_id
      AND leave_type_id = NEW.leave_type_id
      AND status NOT IN ('rejected', 'cancelled')
      AND EXTRACT(MONTH FROM start_date) = EXTRACT(MONTH FROM NEW.start_date)
      AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM NEW.start_date)
      AND id != COALESCE(NEW.id, gen_random_uuid());
    
    IF (v_days_in_month + NEW.days_requested) > v_policy.max_leaves_per_month THEN
      RAISE EXCEPTION 'Exceeds maximum % leaves allowed per month', v_policy.max_leaves_per_month;
    END IF;
  END IF;
  
  -- Check balance (unless LOP allowed)
  SELECT remaining_balance INTO v_balance FROM leave_balance
  WHERE user_id = NEW.user_id 
    AND leave_type_id = NEW.leave_type_id 
    AND year = EXTRACT(YEAR FROM NEW.start_date);
  
  IF COALESCE(v_balance, 0) < NEW.days_requested AND NOT COALESCE(v_policy.negative_balance_allowed, false) THEN
    RAISE EXCEPTION 'Insufficient leave balance. Available: %, Requested: %', COALESCE(v_balance, 0), NEW.days_requested;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_leave_request(p_user_id uuid, p_leave_type_id uuid, p_start_date date, p_end_date date, p_is_half_day boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_policy JSONB;
  v_leave_policy RECORD;
  v_balance NUMERIC;
  v_days_requested NUMERIC;
  v_overlapping INTEGER;
  v_days_in_month NUMERIC;
  v_balance_after NUMERIC;
  v_calculated RECORD;
BEGIN
  v_policy := resolve_effective_leave_policy(p_user_id, p_leave_type_id);
  
  IF v_policy ? 'error' THEN
    RETURN jsonb_build_object('is_valid', false, 'error_code', 'NO_POLICY', 'error_message', 'No leave policy configured');
  END IF;

  IF NOT (v_policy->>'is_enabled')::boolean THEN
    RETURN jsonb_build_object('is_valid', false, 'error_code', 'DISABLED', 'error_message', 'Leave applications are currently disabled');
  END IF;

  IF p_end_date < p_start_date THEN
    RETURN jsonb_build_object('is_valid', false, 'error_code', 'INVALID_DATES', 'error_message', 'End date cannot be before start date');
  END IF;

  SELECT * INTO v_calculated FROM calculate_leave_days(p_start_date, p_end_date, p_leave_type_id, p_is_half_day);
  v_days_requested := v_calculated.total_days;

  SELECT * INTO v_leave_policy FROM leave_policy 
  WHERE leave_type_id = p_leave_type_id AND is_active = true;

  IF NOT (v_policy->>'allow_backdated_leave')::boolean AND p_start_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('is_valid', false, 'error_code', 'NO_BACKDATE', 'error_message', 'Backdated leave is not allowed');
  END IF;

  IF (v_policy->>'allow_backdated_leave')::boolean AND (v_policy->>'max_backdate_days')::integer > 0 THEN
    IF p_start_date < CURRENT_DATE - (v_policy->>'max_backdate_days')::integer THEN
      RETURN jsonb_build_object('is_valid', false, 'error_code', 'BACKDATE_LIMIT', 
        'error_message', format('Backdated leave cannot exceed %s days', (v_policy->>'max_backdate_days')::integer));
    END IF;
  END IF;

  IF (v_policy->>'min_notice_period_days')::integer > 0 AND p_start_date > CURRENT_DATE THEN
    IF p_start_date < CURRENT_DATE + (v_policy->>'min_notice_period_days')::integer THEN
      RETURN jsonb_build_object('is_valid', false, 'error_code', 'NOTICE_PERIOD',
        'error_message', format('Leave requires %s days advance notice', (v_policy->>'min_notice_period_days')::integer));
    END IF;
  END IF;

  IF v_policy->>'max_continuous_leave_days' IS NOT NULL THEN
    IF v_days_requested > (v_policy->>'max_continuous_leave_days')::integer THEN
      RETURN jsonb_build_object('is_valid', false, 'error_code', 'MAX_CONTINUOUS',
        'error_message', format('Maximum continuous leave is %s days. Requested: %s', 
          (v_policy->>'max_continuous_leave_days')::integer, v_days_requested));
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_overlapping FROM leave_applications
  WHERE user_id = p_user_id
    AND status NOT IN ('rejected', 'cancelled')
    AND (p_start_date, p_end_date) OVERLAPS (start_date, end_date);

  IF v_overlapping > 0 THEN
    RETURN jsonb_build_object('is_valid', false, 'error_code', 'OVERLAP', 'error_message', 'Overlapping leave request exists for these dates');
  END IF;

  IF v_leave_policy.max_leaves_per_month IS NOT NULL THEN
    SELECT COALESCE(SUM(days_requested), 0) INTO v_days_in_month
    FROM leave_applications
    WHERE user_id = p_user_id
      AND leave_type_id = p_leave_type_id
      AND status NOT IN ('rejected', 'cancelled')
      AND EXTRACT(MONTH FROM start_date) = EXTRACT(MONTH FROM p_start_date)
      AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM p_start_date);

    IF (v_days_in_month + v_days_requested) > v_leave_policy.max_leaves_per_month THEN
      RETURN jsonb_build_object('is_valid', false, 'error_code', 'MONTHLY_LIMIT',
        'error_message', format('Exceeds maximum %s leaves allowed per month', v_leave_policy.max_leaves_per_month));
    END IF;
  END IF;

  SELECT remaining_balance INTO v_balance FROM leave_balance
  WHERE user_id = p_user_id AND leave_type_id = p_leave_type_id AND year = EXTRACT(YEAR FROM p_start_date);

  v_balance := COALESCE(v_balance, 0);
  v_balance_after := v_balance - v_days_requested;

  IF NOT (v_policy->>'allow_negative_balance')::boolean AND v_balance_after < 0 THEN
    RETURN jsonb_build_object('is_valid', false, 'error_code', 'INSUFFICIENT_BALANCE',
      'error_message', format('Insufficient leave balance. Available: %s, Requested: %s', v_balance, v_days_requested),
      'days_requested', v_days_requested, 'balance_after', v_balance_after, 'current_balance', v_balance);
  END IF;

  IF (v_policy->>'allow_negative_balance')::boolean AND (v_policy->>'max_negative_limit')::integer > 0 THEN
    IF v_balance_after < -((v_policy->>'max_negative_limit')::integer) THEN
      RETURN jsonb_build_object('is_valid', false, 'error_code', 'NEGATIVE_LIMIT',
        'error_message', format('Exceeds maximum negative balance limit of %s days', (v_policy->>'max_negative_limit')::integer),
        'days_requested', v_days_requested, 'balance_after', v_balance_after, 'current_balance', v_balance);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_valid', true,
    'days_requested', v_days_requested,
    'balance_after', v_balance_after,
    'current_balance', v_balance,
    'sandwich_days', v_calculated.sandwich_days
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_packing_list_order_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_type_code text;
  v_supports_primary boolean;
BEGIN
  IF NEW.order_type = 'secondary' THEN
    RETURN NEW;
  END IF;

  IF NEW.distributor_id IS NULL THEN
    RAISE EXCEPTION 'distributor_id is required for primary packing lists';
  END IF;

  SELECT dt.code INTO v_type_code
  FROM distributors d
  JOIN distributor_types dt ON dt.id = d.type_id
  WHERE d.id = NEW.distributor_id;

  IF v_type_code IS NULL THEN
    RAISE EXCEPTION 'Distributor not found or has no assigned type (distributor_id: %)', NEW.distributor_id;
  END IF;

  SELECT get_type_supports_primary(v_type_code) INTO v_supports_primary;

  IF NOT COALESCE(v_supports_primary, false) THEN
    RAISE EXCEPTION 'Distributor type "%" does not support primary packing', v_type_code;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_primary_order_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_product_uom_mapping_state()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_id uuid;
  v_base_count integer;
  v_sales_count integer;
  v_price_count integer;
  v_bad_factor integer;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  SELECT
    COUNT(*) FILTER (WHERE is_base),
    COUNT(*) FILTER (WHERE is_default_sales),
    COUNT(*) FILTER (WHERE is_price_basis),
    COUNT(*) FILTER (WHERE conversion_to_base <= 0)
  INTO v_base_count, v_sales_count, v_price_count, v_bad_factor
  FROM public.product_uom_mapping
  WHERE product_id = v_product_id
    AND COALESCE(is_active, true) = true;

  IF v_bad_factor > 0 THEN
    RAISE EXCEPTION 'All unit conversion factors must be positive';
  END IF;

  IF v_base_count > 1 THEN
    RAISE EXCEPTION 'Only one base unit is allowed per product';
  END IF;

  IF v_sales_count > 1 THEN
    RAISE EXCEPTION 'Only one default sales unit is allowed per product';
  END IF;

  IF v_price_count > 1 THEN
    RAISE EXCEPTION 'Only one price-basis unit is allowed per product';
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_hint_answer(user_email text, submitted_answer text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  stored_answer text;
BEGIN
  SELECT p.hint_answer INTO stored_answer
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE u.email = user_email;
  
  RETURN LOWER(TRIM(stored_answer)) = LOWER(TRIM(submitted_answer));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_hint_answer_secure(user_email text, submitted_answer text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  stored_hash text;
  computed_hash text;
BEGIN
  -- Get the stored hint answer (hashed or unhashed)
  SELECT p.hint_answer INTO stored_hash
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE u.email = user_email;
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Compute hash of submitted answer
  computed_hash := public.hash_hint_answer(submitted_answer);
  
  -- Check if stored value is already hashed or plaintext
  IF stored_hash LIKE 'hash:%' THEN
    -- Compare hashed values
    RETURN stored_hash = computed_hash;
  ELSE
    -- Legacy: compare with plaintext (and update to hash on next opportunity)
    RETURN LOWER(TRIM(stored_hash)) = LOWER(TRIM(submitted_answer));
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_hint_answer_with_rate_limit(user_email text, submitted_answer text, user_ip text DEFAULT NULL::text, user_agent_str text DEFAULT NULL::text)
 RETURNS TABLE(is_valid boolean, is_locked boolean, attempts_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  stored_hash TEXT;
  computed_hash TEXT;
  recent_attempts INTEGER;
  answer_matches BOOLEAN := false;
BEGIN
  -- Check if account is locked
  IF public.is_account_locked(user_email) THEN
    RETURN QUERY SELECT false, true, 0;
    RETURN;
  END IF;
  
  -- Count recent failed attempts in last hour
  SELECT COUNT(*) INTO recent_attempts
  FROM public.password_reset_attempts
  WHERE email = user_email
    AND attempted_at > NOW() - INTERVAL '1 hour'
    AND was_successful = false;
  
  -- If already 4 failed attempts, this is the last one before lockout
  IF recent_attempts >= 4 THEN
    -- Log the attempt as failed (will trigger lockout)
    INSERT INTO public.password_reset_attempts (email, was_successful, ip_address, user_agent)
    VALUES (user_email, false, user_ip, user_agent_str);
    
    RETURN QUERY SELECT false, true, 0;
    RETURN;
  END IF;
  
  -- Get the stored hint answer hash
  SELECT p.hint_answer INTO stored_hash
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE u.email = user_email;
  
  IF stored_hash IS NULL THEN
    -- Log failed attempt for non-existent user
    INSERT INTO public.password_reset_attempts (email, was_successful, ip_address, user_agent)
    VALUES (user_email, false, user_ip, user_agent_str);
    
    RETURN QUERY SELECT false, false, (4 - recent_attempts);
    RETURN;
  END IF;
  
  -- Compute hash of submitted answer
  computed_hash := public.hash_hint_answer(submitted_answer);
  
  -- Check if stored value is already hashed or plaintext
  IF stored_hash LIKE 'hash:%' THEN
    answer_matches := stored_hash = computed_hash;
  ELSE
    -- Legacy: compare with plaintext
    answer_matches := LOWER(TRIM(stored_hash)) = LOWER(TRIM(submitted_answer));
  END IF;
  
  -- Log the attempt
  INSERT INTO public.password_reset_attempts (email, was_successful, ip_address, user_agent)
  VALUES (user_email, answer_matches, user_ip, user_agent_str);
  
  -- Return result with attempts remaining
  IF answer_matches THEN
    RETURN QUERY SELECT true, false, 5;
  ELSE
    RETURN QUERY SELECT false, false, (4 - recent_attempts);
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$
;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_notification_activity_events AFTER INSERT ON public.activity_events FOR EACH ROW EXECUTE FUNCTION trigger_notification_activity_events();
CREATE TRIGGER trg_validate_activity_event_status BEFORE INSERT OR UPDATE OF status ON public.activity_events FOR EACH ROW EXECUTE FUNCTION validate_activity_event_status();
CREATE TRIGGER tr_expense_approval_request BEFORE INSERT OR UPDATE ON public.additional_expenses FOR EACH ROW EXECUTE FUNCTION trigger_create_expense_approval_request();
CREATE TRIGGER update_additional_expenses_updated_at BEFORE UPDATE ON public.additional_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON public.ai_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notification_approval_requests AFTER UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION trigger_notification_approval_requests();
CREATE TRIGGER trg_sync_entity_status AFTER UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION trigger_sync_entity_status();
CREATE TRIGGER update_approvers_updated_at BEFORE UPDATE ON public.approvers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_refresh_attendance_summaries AFTER INSERT OR DELETE OR UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION trigger_refresh_attendance_summaries();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_beat_allowances_updated_at BEFORE UPDATE ON public.beat_allowances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_beat_plans_updated_at BEFORE UPDATE ON public.beat_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_beats_updated_at BEFORE UPDATE ON public.beats FOR EACH ROW EXECUTE FUNCTION update_beats_updated_at();
CREATE TRIGGER update_branding_request_items_updated_at BEFORE UPDATE ON public.branding_request_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branding_requests_updated_at BEFORE UPDATE ON public.branding_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION update_chat_conversation_updated_at();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_product_categories_updated_at BEFORE UPDATE ON public.company_product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competency_coaching_notes_updated_at BEFORE UPDATE ON public.competency_coaching_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competency_templates_updated_at BEFORE UPDATE ON public.competency_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competition_insights_updated_at BEFORE UPDATE ON public.competition_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_counter_sales_updated_at BEFORE UPDATE ON public.counter_sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_credit_ledger_sync AFTER INSERT ON public.credit_ledger FOR EACH ROW EXECUTE FUNCTION credit_ledger_sync_pending_amount();
CREATE TRIGGER update_credit_config_timestamp BEFORE UPDATE ON public.credit_management_config FOR EACH ROW EXECUTE FUNCTION update_credit_config_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_enforce_delivery_run_status BEFORE UPDATE OF status ON public.delivery_runs FOR EACH ROW EXECUTE FUNCTION enforce_delivery_run_status_transition();
CREATE TRIGGER update_delivery_runs_updated_at BEFORE UPDATE ON public.delivery_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_distributor_business_plan_month_products_updated_at BEFORE UPDATE ON public.distributor_business_plan_month_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_claim_number BEFORE INSERT ON public.distributor_claims FOR EACH ROW EXECUTE FUNCTION generate_distributor_claim_number();
CREATE TRIGGER set_company_return_number BEFORE INSERT ON public.distributor_company_returns FOR EACH ROW EXECUTE FUNCTION generate_company_return_number();
CREATE TRIGGER update_distributor_company_returns_updated_at BEFORE UPDATE ON public.distributor_company_returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_distributor_evaluation_tasks_updated_at BEFORE UPDATE ON public.distributor_evaluation_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_idea_number BEFORE INSERT ON public.distributor_ideas FOR EACH ROW EXECUTE FUNCTION generate_idea_number();
CREATE TRIGGER update_distributor_inventory_updated_at BEFORE UPDATE ON public.distributor_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_calc_transaction_balance BEFORE INSERT ON public.distributor_inventory_transactions FOR EACH ROW EXECUTE FUNCTION calc_transaction_balance();
CREATE TRIGGER trg_auto_ledger_payment AFTER INSERT ON public.distributor_payments FOR EACH ROW EXECUTE FUNCTION auto_ledger_on_payment();
CREATE TRIGGER trg_payment_receipt_number BEFORE INSERT ON public.distributor_payments FOR EACH ROW EXECUTE FUNCTION generate_payment_receipt_number();
CREATE TRIGGER update_distributor_retailer_mappings_updated_at BEFORE UPDATE ON public.distributor_retailer_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_distributor_return_number BEFORE INSERT ON public.distributor_returns FOR EACH ROW EXECUTE FUNCTION generate_distributor_return_number();
CREATE TRIGGER update_distributor_returns_updated_at BEFORE UPDATE ON public.distributor_returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_auto_ledger_secondary_invoice AFTER INSERT ON public.distributor_secondary_invoices FOR EACH ROW EXECUTE FUNCTION auto_ledger_on_secondary_invoice();
CREATE TRIGGER set_support_ticket_number BEFORE INSERT ON public.distributor_support_requests FOR EACH ROW EXECUTE FUNCTION generate_support_ticket_number();
CREATE TRIGGER update_distributor_users_updated_at BEFORE UPDATE ON public.distributor_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_distributors_updated_at BEFORE UPDATE ON public.distributors FOR EACH ROW EXECUTE FUNCTION set_distributors_updated_at();
CREATE TRIGGER update_distributors_updated_at BEFORE UPDATE ON public.distributors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_eu_updated BEFORE UPDATE ON public.enabled_units FOR EACH ROW EXECUTE FUNCTION uom_set_updated_at();
CREATE TRIGGER update_expense_master_config_updated_at BEFORE UPDATE ON public.expense_master_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER feature_flag_change_trigger AFTER UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION log_feature_flag_change();
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fy_period_targets_updated_at BEFORE UPDATE ON public.fy_period_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fy_target_config_updated_at BEFORE UPDATE ON public.fy_target_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gamification_actions_updated_at BEFORE UPDATE ON public.gamification_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gamification_daily_tracking_timestamp BEFORE UPDATE ON public.gamification_daily_tracking FOR EACH ROW EXECUTE FUNCTION update_gamification_daily_tracking_updated_at();
CREATE TRIGGER update_gamification_games_updated_at BEFORE UPDATE ON public.gamification_games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gamification_redemptions_updated_at BEFORE UPDATE ON public.gamification_redemptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gamification_retailer_sequences_timestamp BEFORE UPDATE ON public.gamification_retailer_sequences FOR EACH ROW EXECUTE FUNCTION update_gamification_daily_tracking_updated_at();
CREATE TRIGGER update_global_leave_policy_updated_at BEFORE UPDATE ON public.global_leave_policy FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hierarchy_allocations_updated_at BEFORE UPDATE ON public.hierarchy_target_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hierarchy_targets_updated_at BEFORE UPDATE ON public.hierarchy_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON public.holidays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_clamp_inventory_batch_available BEFORE INSERT OR UPDATE OF quantity, reserved_qty, available_qty ON public.inventory_batches FOR EACH ROW EXECUTE FUNCTION clamp_inventory_batch_available();
CREATE TRIGGER trg_inventory_batches_ensure_quantity BEFORE INSERT OR UPDATE OF quantity, available_qty, reserved_qty ON public.inventory_batches FOR EACH ROW EXECUTE FUNCTION ensure_inventory_batch_quantity();
CREATE TRIGGER trg_prevent_negative_batch_stock BEFORE UPDATE ON public.inventory_batches FOR EACH ROW EXECUTE FUNCTION prevent_negative_batch_stock();
CREATE TRIGGER trg_sync_inventory_batch_available_qty BEFORE INSERT OR UPDATE OF quantity, reserved_qty, available_qty ON public.inventory_batches FOR EACH ROW EXECUTE FUNCTION sync_inventory_batch_available_qty();
CREATE TRIGGER trg_sync_inventory_batch_quantity BEFORE INSERT ON public.inventory_batches FOR EACH ROW EXECUTE FUNCTION sync_inventory_batch_quantity();
CREATE TRIGGER update_invoice_display_settings_updated_at BEFORE UPDATE ON public.invoice_display_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_document_settings_updated_at BEFORE UPDATE ON public.invoice_document_settings FOR EACH ROW EXECUTE FUNCTION update_invoice_document_settings_updated_at();
CREATE TRIGGER trigger_set_invoice_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION set_invoice_number();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER mark_attendance_after_approval BEFORE UPDATE ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION mark_attendance_on_leave_approval();
CREATE TRIGGER trg_leave_approval_request AFTER INSERT ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION trigger_create_leave_approval_request();
CREATE TRIGGER trg_notification_leave_applications AFTER INSERT OR UPDATE ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION trigger_notification_leave_applications();
CREATE TRIGGER trg_refresh_leave_summaries AFTER UPDATE ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION trigger_refresh_leave_summaries();
CREATE TRIGGER update_leave_applications_updated_at BEFORE UPDATE ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_balance_on_status_change_trigger AFTER INSERT OR UPDATE ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION update_leave_balance_on_status_change();
CREATE TRIGGER validate_leave_before_insert BEFORE INSERT ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION validate_leave_application();
CREATE TRIGGER validate_leave_before_update BEFORE UPDATE ON public.leave_applications FOR EACH ROW WHEN (((old.status = 'pending'::text) AND (new.status = 'pending'::text))) EXECUTE FUNCTION validate_leave_application();
CREATE TRIGGER update_leave_approval_workflow_updated_at BEFORE UPDATE ON public.leave_approval_workflow FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_balance_updated_at BEFORE UPDATE ON public.leave_balance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_initialize_leave_policy_balances AFTER INSERT ON public.leave_policy FOR EACH ROW EXECUTE FUNCTION trigger_initialize_leave_policy_balances();
CREATE TRIGGER trg_leave_policy_accrual_update AFTER UPDATE ON public.leave_policy FOR EACH ROW WHEN (((old.yearly_entitlement IS DISTINCT FROM new.yearly_entitlement) OR (old.accrual_type IS DISTINCT FROM new.accrual_type))) EXECUTE FUNCTION recalculate_leave_accrual_on_update();
CREATE TRIGGER update_leave_policy_updated_at BEFORE UPDATE ON public.leave_policy FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_type_policy_override_updated_at BEFORE UPDATE ON public.leave_type_policy_override FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_order_invoice_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION set_order_invoice_number();
CREATE TRIGGER trg_notification_orders AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION trigger_notification_orders();
CREATE TRIGGER trg_sync_order_status_from_delivery BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION sync_order_status_from_delivery_status();
CREATE TRIGGER trg_update_revenue_on_order AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_revenue_actual();
CREATE TRIGGER trigger_auto_update_visit_on_order AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION auto_update_visit_status_on_order();
CREATE TRIGGER trigger_auto_update_visit_status_on_order AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION auto_update_visit_status_on_order();
CREATE TRIGGER trigger_set_order_date BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION set_order_date();
CREATE TRIGGER trigger_update_retailer_analytics_orders AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION update_retailer_analytics();
CREATE TRIGGER trigger_update_retailer_last_order AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION update_retailer_last_order();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packing_list_assignments_updated_at BEFORE UPDATE ON public.packing_list_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_validate_batch_packed_qty BEFORE INSERT OR UPDATE ON public.packing_list_item_batches FOR EACH ROW EXECUTE FUNCTION validate_batch_packed_qty();
CREATE TRIGGER update_packing_list_items_updated_at BEFORE UPDATE ON public.packing_list_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_enforce_packing_list_status BEFORE UPDATE OF status ON public.packing_lists FOR EACH ROW EXECUTE FUNCTION enforce_packing_list_status_transition();
CREATE TRIGGER trg_validate_packing_order_type BEFORE INSERT OR UPDATE ON public.packing_lists FOR EACH ROW EXECUTE FUNCTION validate_packing_list_order_type();
CREATE TRIGGER trigger_generate_packing_list_number BEFORE INSERT ON public.packing_lists FOR EACH ROW EXECUTE FUNCTION generate_packing_list_number();
CREATE TRIGGER update_permission_set_groups_updated_at BEFORE UPDATE ON public.permission_set_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_petty_cash_balance AFTER INSERT OR UPDATE ON public.petty_cash_transactions FOR EACH ROW EXECUTE FUNCTION update_petty_cash_balance();
CREATE TRIGGER update_pm_milestones_updated_at BEFORE UPDATE ON public.pm_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_project_resources_updated_at BEFORE UPDATE ON public.pm_project_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_projects_updated_at BEFORE UPDATE ON public.pm_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_risks_updated_at BEFORE UPDATE ON public.pm_risks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_sprints_updated_at BEFORE UPDATE ON public.pm_sprints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_task_comments_updated_at BEFORE UPDATE ON public.pm_task_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notification_pm_tasks AFTER INSERT OR UPDATE ON public.pm_tasks FOR EACH ROW EXECUTE FUNCTION trigger_notification_pm_tasks();
CREATE TRIGGER update_pm_tasks_updated_at BEFORE UPDATE ON public.pm_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER sync_task_logged_hours_insert AFTER INSERT OR DELETE OR UPDATE ON public.pm_time_logs FOR EACH ROW EXECUTE FUNCTION sync_task_logged_hours();
CREATE TRIGGER trg_pos_customers_updated_at BEFORE UPDATE ON public.pos_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_book_entries_timestamp BEFORE UPDATE ON public.price_book_entries FOR EACH ROW EXECUTE FUNCTION update_price_books_updated_at();
CREATE TRIGGER update_price_books_timestamp BEFORE UPDATE ON public.price_books FOR EACH ROW EXECUTE FUNCTION update_price_books_updated_at();
CREATE TRIGGER set_primary_order_number BEFORE INSERT ON public.primary_orders FOR EACH ROW EXECUTE FUNCTION generate_primary_order_number();
CREATE TRIGGER trg_primary_order_initial_status AFTER INSERT ON public.primary_orders FOR EACH ROW EXECUTE FUNCTION log_primary_order_initial_status();
CREATE TRIGGER trg_primary_order_status_change AFTER UPDATE ON public.primary_orders FOR EACH ROW EXECUTE FUNCTION log_primary_order_status_change();
CREATE TRIGGER trg_validate_primary_order_status BEFORE UPDATE ON public.primary_orders FOR EACH ROW EXECUTE FUNCTION validate_primary_order_status_transition();
CREATE TRIGGER update_primary_orders_updated_at BEFORE UPDATE ON public.primary_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_product_price_list_updated_at BEFORE UPDATE ON public.product_price_list FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_schemes_updated_at BEFORE UPDATE ON public.product_schemes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_pum_base_factor BEFORE INSERT OR UPDATE ON public.product_uom_mapping FOR EACH ROW EXECUTE FUNCTION enforce_base_factor_one();
CREATE TRIGGER trg_pum_category_match BEFORE INSERT OR UPDATE ON public.product_uom_mapping FOR EACH ROW EXECUTE FUNCTION enforce_category_match();
CREATE CONSTRAINT TRIGGER trg_pum_single_base AFTER INSERT OR DELETE OR UPDATE ON public.product_uom_mapping DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_single_base_per_product();
CREATE TRIGGER trg_pum_updated BEFORE UPDATE ON public.product_uom_mapping FOR EACH ROW EXECUTE FUNCTION uom_set_updated_at();
CREATE CONSTRAINT TRIGGER trg_validate_product_uom_mapping_state AFTER INSERT OR DELETE OR UPDATE ON public.product_uom_mapping DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_product_uom_mapping_state();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profile_attachments_updated_at BEFORE UPDATE ON public.profile_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_auto_seed_system_admin AFTER INSERT ON public.profile_object_permissions FOR EACH ROW EXECUTE FUNCTION auto_seed_system_admin_permissions();
CREATE TRIGGER hash_hint_answer_on_change BEFORE INSERT OR UPDATE OF hint_answer ON public.profiles FOR EACH ROW EXECUTE FUNCTION hash_hint_answer_trigger();
CREATE TRIGGER protect_sensitive_profile_data BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION prevent_admin_sensitive_access();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_apply_regularization_to_attendance AFTER UPDATE ON public.regularization_requests FOR EACH ROW EXECUTE FUNCTION apply_regularization_to_attendance();
CREATE TRIGGER trg_auto_approve_regularization BEFORE INSERT ON public.regularization_requests FOR EACH ROW EXECUTE FUNCTION auto_approve_regularization();
CREATE TRIGGER trg_notification_regularization AFTER INSERT OR UPDATE ON public.regularization_requests FOR EACH ROW EXECUTE FUNCTION trigger_notification_regularization();
CREATE TRIGGER trg_regularization_approval_request AFTER INSERT ON public.regularization_requests FOR EACH ROW EXECUTE FUNCTION trigger_create_regularization_approval_request();
CREATE TRIGGER update_regularization_requests_updated_at BEFORE UPDATE ON public.regularization_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_scores_timestamp BEFORE UPDATE ON public.retailer_credit_scores FOR EACH ROW EXECUTE FUNCTION update_credit_scores_updated_at();
CREATE TRIGGER update_retailer_feedback_updated_at BEFORE UPDATE ON public.retailer_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retailer_gift_redemptions_updated_at BEFORE UPDATE ON public.retailer_gift_redemptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retailer_gift_subscriptions_updated_at BEFORE UPDATE ON public.retailer_gift_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retailer_loyalty_actions_updated_at BEFORE UPDATE ON public.retailer_loyalty_actions FOR EACH ROW EXECUTE FUNCTION update_retailer_loyalty_updated_at();
CREATE TRIGGER update_retailer_loyalty_gifts_updated_at BEFORE UPDATE ON public.retailer_loyalty_gifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retailer_loyalty_parameters_updated_at BEFORE UPDATE ON public.retailer_loyalty_parameters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retailer_loyalty_plans_updated_at BEFORE UPDATE ON public.retailer_loyalty_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retailer_loyalty_programs_updated_at BEFORE UPDATE ON public.retailer_loyalty_programs FOR EACH ROW EXECUTE FUNCTION update_retailer_loyalty_updated_at();
CREATE TRIGGER update_retailer_loyalty_redemptions_updated_at BEFORE UPDATE ON public.retailer_loyalty_redemptions FOR EACH ROW EXECUTE FUNCTION update_retailer_loyalty_updated_at();
CREATE TRIGGER update_retailer_loyalty_reward_redemptions_updated_at BEFORE UPDATE ON public.retailer_loyalty_reward_redemptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retailer_loyalty_rewards_updated_at BEFORE UPDATE ON public.retailer_loyalty_rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retailer_loyalty_tracking_updated_at BEFORE UPDATE ON public.retailer_loyalty_tracking FOR EACH ROW EXECUTE FUNCTION update_retailer_loyalty_updated_at();
CREATE TRIGGER update_retailer_visit_logs_updated_at BEFORE UPDATE ON public.retailer_visit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sync_whatsapp_phone_name_cache AFTER INSERT OR DELETE OR UPDATE OF phone, name ON public.retailers FOR EACH ROW EXECUTE FUNCTION sync_whatsapp_phone_name_cache();
CREATE TRIGGER trg_update_retailer_count AFTER INSERT ON public.retailers FOR EACH ROW EXECUTE FUNCTION update_new_retailer_actual();
CREATE TRIGGER update_retailers_updated_at BEFORE UPDATE ON public.retailers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_social_posts_automation BEFORE UPDATE OF is_automated, template_id, post_metadata, scheduled_time ON public.social_posts FOR EACH ROW EXECUTE FUNCTION update_social_posts_automation_timestamp();
CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON public.stock FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_cycle_data_updated_at BEFORE UPDATE ON public.stock_cycle_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_requests_updated_at BEFORE UPDATE ON public.support_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_target_setup_master_updated_at BEFORE UPDATE ON public.target_setup_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_components_updated_at BEFORE UPDATE ON public.tax_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_masters_updated_at BEFORE UPDATE ON public.tax_masters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_product_map_updated_at BEFORE UPDATE ON public.tax_product_map FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER territory_audit_trigger BEFORE UPDATE ON public.territories FOR EACH ROW EXECUTE FUNCTION update_territory_audit_fields();
CREATE TRIGGER territory_created_by_trigger BEFORE INSERT ON public.territories FOR EACH ROW EXECUTE FUNCTION set_territory_created_by();
CREATE TRIGGER track_territory_assignment_trigger AFTER INSERT OR UPDATE ON public.territories FOR EACH ROW EXECUTE FUNCTION track_territory_assignment();
CREATE TRIGGER update_child_count_on_delete_trigger AFTER DELETE ON public.territories FOR EACH ROW EXECUTE FUNCTION update_child_territories_count_on_delete();
CREATE TRIGGER update_child_count_trigger AFTER INSERT OR UPDATE ON public.territories FOR EACH ROW EXECUTE FUNCTION update_child_territories_count();
CREATE TRIGGER update_territories_updated_at BEFORE UPDATE ON public.territories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_uom_category_touch BEFORE UPDATE ON public.uom_category FOR EACH ROW EXECUTE FUNCTION tg_uom_category_touch();
CREATE TRIGGER trg_uom_master_protect_delete BEFORE DELETE ON public.uom_master FOR EACH ROW EXECUTE FUNCTION tg_uom_master_protect_delete();
CREATE TRIGGER trg_uom_master_sync_category BEFORE INSERT OR UPDATE ON public.uom_master FOR EACH ROW EXECUTE FUNCTION tg_uom_master_sync_category();
CREATE TRIGGER trg_uom_master_validate_category BEFORE INSERT OR UPDATE ON public.uom_master FOR EACH ROW EXECUTE FUNCTION tg_uom_master_validate_category();
CREATE TRIGGER update_user_approvals_updated_at BEFORE UPDATE ON public.user_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_business_plan_months_updated_at BEFORE UPDATE ON public.user_business_plan_months FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_business_plan_territories_updated_at BEFORE UPDATE ON public.user_business_plan_territories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_business_plans_updated_at BEFORE UPDATE ON public.user_business_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_leave_policy_updated_at BEFORE UPDATE ON public.user_leave_policy FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_monthly_scorecards_updated_at BEFORE UPDATE ON public.user_monthly_scorecards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_object_permissions_updated_at BEFORE UPDATE ON public.user_object_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_period_allocations_updated_at BEFORE UPDATE ON public.user_period_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_van_beat_assignments_updated_at BEFORE UPDATE ON public.van_beat_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_van_sales_settings_updated_at BEFORE UPDATE ON public.van_sales_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_van_stock_updated_at BEFORE UPDATE ON public.van_stock FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_van_stock_items_updated_at BEFORE UPDATE ON public.van_stock_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vans_updated_at BEFORE UPDATE ON public.vans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visit_ai_insights_updated_at_trigger BEFORE UPDATE ON public.visit_ai_insights FOR EACH ROW EXECUTE FUNCTION update_visit_ai_insights_updated_at();
CREATE TRIGGER trg_notification_visits AFTER INSERT OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION trigger_notification_visits();
CREATE TRIGGER trg_update_visit_actuals AFTER INSERT OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION update_visit_actuals();
CREATE TRIGGER trigger_update_retailer_analytics_visits AFTER INSERT OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION update_retailer_analytics();
CREATE TRIGGER trigger_update_retailer_last_visit AFTER INSERT OR UPDATE OF planned_date ON public.visits FOR EACH ROW EXECUTE FUNCTION update_retailer_last_visit();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_week_off_config_updated_at BEFORE UPDATE ON public.week_off_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_working_days_config_updated_at BEFORE UPDATE ON public.working_days_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (ENABLE)
-- ============================================================

ALTER TABLE public.accrual_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.additional_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_autonomous_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feature_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_scheme_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aspirations_and_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_daily_admin_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_user_monthly_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_end_day_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beat_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beat_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beat_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_daily_nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_learning_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_scenario_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_user_competency_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_user_overall_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competency_coaching_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competency_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_management_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_portal_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_gps_distance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_run_packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_battery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_beat_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_business_plan_month_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_business_plan_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_business_plan_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_business_plan_retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_business_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_company_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_company_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_credit_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_evaluation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_item_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_price_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_retailer_credit_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_retailer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_retailer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_retailer_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_secondary_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_secondary_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.district_intelligence_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enabled_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_master_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_retailer_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_retailer_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fy_period_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fy_target_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_daily_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_retailer_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geocoding_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_leave_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_tracking_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hierarchy_target_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hierarchy_target_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hierarchy_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_order_commitment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_order_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_price_book_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_price_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inst_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_valuation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_display_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_document_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joint_sales_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joint_sales_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_accrual_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_approval_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_holidays_bridge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_type_policy_override ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_cancellation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_list_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_list_item_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_list_item_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_list_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_module_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permanent_deletion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_set_group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_set_group_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_set_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pincode_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pincode_top_retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_enabled_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_project_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_task_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_template_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_template_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_book_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.primary_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.primary_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.primary_order_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.primary_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.primary_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.primary_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.primary_return_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.primary_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_uom_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_object_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_content_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycle_bin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycle_bin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regularization_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regularization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_external_db ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_external_unsorted ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_gift_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_gift_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_loyalty_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_loyalty_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_loyalty_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_loyalty_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_loyalty_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_loyalty_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_loyalty_reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_loyalty_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_visit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_applicability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_policy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensitive_data_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_cycle_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stockist_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stockist_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stockist_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_actual_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_parameter_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_setup_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_product_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_expense_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unhandled_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uom_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uom_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_autonomy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_plan_distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_plan_month_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_plan_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_plan_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_plan_retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_plan_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_plan_territory_beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_competency_monthly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_expense_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_leave_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_monthly_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_object_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_period_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_period_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_push_content_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_beat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_closing_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_closing_stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_inward_grn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_inward_grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_live_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_order_fulfillment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_return_grn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_return_grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_sales_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.van_stock_opening_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.week_off_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_phone_name_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_days_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

CREATE POLICY "Authenticated users can manage accrual_config" ON public.accrual_config AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read accrual_config" ON public.accrual_config AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can view all activity events" ON public.activity_events AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own activity events" ON public.activity_events AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own activity events" ON public.activity_events AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own activity events" ON public.activity_events AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own activity events" ON public.activity_events AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can delete all expenses" ON public.additional_expenses AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all expenses" ON public.additional_expenses AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all expenses" ON public.additional_expenses AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can approve reject subordinate expenses" ON public.additional_expenses AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id IN ( SELECT get_all_subordinates.subordinate_user_id
   FROM get_all_subordinates(auth.uid()) get_all_subordinates(subordinate_user_id, level, full_name)
  WHERE (get_all_subordinates.level > 0)))) WITH CHECK ((user_id IN ( SELECT get_all_subordinates.subordinate_user_id
   FROM get_all_subordinates(auth.uid()) get_all_subordinates(subordinate_user_id, level, full_name)
  WHERE (get_all_subordinates.level > 0))));
CREATE POLICY "Managers can view subordinate expenses" ON public.additional_expenses AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id IN ( SELECT get_all_subordinates.subordinate_user_id
   FROM get_all_subordinates(auth.uid()) get_all_subordinates(subordinate_user_id, level, full_name)
  WHERE (get_all_subordinates.level > 0))));
CREATE POLICY "Users can create their own additional expenses" ON public.additional_expenses AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete own draft or submitted expenses" ON public.additional_expenses AS PERMISSIVE FOR DELETE TO authenticated USING (((user_id = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'submitted'::text]))));
CREATE POLICY "Users can delete their own additional expenses" ON public.additional_expenses AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own expenses" ON public.additional_expenses AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can submit own expenses" ON public.additional_expenses AS PERMISSIVE FOR UPDATE TO authenticated USING (((user_id = auth.uid()) AND (status = 'draft'::text)));
CREATE POLICY "Users can update own draft or submitted expenses" ON public.additional_expenses AS PERMISSIVE FOR UPDATE TO authenticated USING (((user_id = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'submitted'::text])))) WITH CHECK (((user_id = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'submitted'::text]))));
CREATE POLICY "Users can update their own additional expenses" ON public.additional_expenses AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own expenses" ON public.additional_expenses AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view their own additional expenses" ON public.additional_expenses AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Service role can insert autonomous actions" ON public.ai_autonomous_actions AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can update their own autonomous actions" ON public.ai_autonomous_actions AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own autonomous actions" ON public.ai_autonomous_actions AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can create their own feedback" ON public.ai_feature_feedback AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own feedback" ON public.ai_feature_feedback AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Service can delete insights" ON public.ai_insights AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Service can insert insights" ON public.ai_insights AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can update own insights" ON public.ai_insights AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own insights" ON public.ai_insights AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can delete AI suggestions" ON public.ai_scheme_suggestions AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Admins can insert AI suggestions" ON public.ai_scheme_suggestions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Admins can update AI suggestions" ON public.ai_scheme_suggestions AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Admins can view all AI suggestions" ON public.ai_scheme_suggestions AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Users can create their own analytics likes" ON public.analytics_likes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own analytics likes" ON public.analytics_likes AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own analytics likes" ON public.analytics_likes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can create their own analytics views" ON public.analytics_views AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own analytics views" ON public.analytics_views AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Approvers can view audit for their steps" ON public.approval_audit_log AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM approval_steps ast
  WHERE ((ast.approval_request_id = approval_audit_log.approval_request_id) AND (ast.approver_id = auth.uid())))));
CREATE POLICY "Service can insert audit logs" ON public.approval_audit_log AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view own audit logs" ON public.approval_audit_log AS PERMISSIVE FOR SELECT TO public USING (((performed_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM approval_requests ar
  WHERE ((ar.id = approval_audit_log.approval_request_id) AND (ar.requester_id = auth.uid()))))));
CREATE POLICY "Admins can manage config" ON public.approval_config AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read config" ON public.approval_config AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Approvers can view requests at their step" ON public.approval_requests AS PERMISSIVE FOR SELECT TO public USING (is_approver_for_request(id, auth.uid()));
CREATE POLICY "Service can update approval requests" ON public.approval_requests AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can insert approval requests" ON public.approval_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view their own approval requests" ON public.approval_requests AS PERMISSIVE FOR SELECT TO public USING ((requester_id = auth.uid()));
CREATE POLICY "Approvers can view their own steps" ON public.approval_steps AS PERMISSIVE FOR SELECT TO public USING ((approver_id = auth.uid()));
CREATE POLICY "Requesters can view their steps" ON public.approval_steps AS PERMISSIVE FOR SELECT TO public USING (is_requester_for_request(approval_request_id, auth.uid()));
CREATE POLICY "Service can manage steps" ON public.approval_steps AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage approval_workflows" ON public.approval_workflows AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone authenticated can read approval_workflows" ON public.approval_workflows AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage approvers" ON public.approvers AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view approvers" ON public.approvers AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can manage their own aspirations" ON public.aspirations_and_preferences AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view all aspirations" ON public.aspirations_and_preferences AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can view all attendance" ON public.attendance AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view attendance for reporting" ON public.attendance AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can create their own attendance" ON public.attendance AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = (user_id)::text));
CREATE POLICY "Users can update their own attendance" ON public.attendance AS PERMISSIVE FOR UPDATE TO authenticated USING (((auth.uid())::text = (user_id)::text));
CREATE POLICY "Users can view their own attendance" ON public.attendance AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid())::text = (user_id)::text));
CREATE POLICY "Admin can read daily summary" ON public.attendance_daily_admin_summary AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can read own monthly summary" ON public.attendance_user_monthly_summary AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can insert auto_end_day_policy" ON public.auto_end_day_policy AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read auto_end_day_policy" ON public.auto_end_day_policy AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update auto_end_day_policy" ON public.auto_end_day_policy AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can manage badges" ON public.badges AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Everyone can view badges" ON public.badges AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Users can create their own beat allowances" ON public.beat_allowances AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own beat allowances" ON public.beat_allowances AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own beat allowances" ON public.beat_allowances AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own beat allowances" ON public.beat_allowances AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can insert audit logs" ON public.beat_audit_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = performed_by));
CREATE POLICY "Users can view own audit logs" ON public.beat_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING (((performed_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins can view all beat plans" ON public.beat_plans AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view beat plans for reporting" ON public.beat_plans AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can create their own beat plans" ON public.beat_plans AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own beat plans" ON public.beat_plans AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own beat plans" ON public.beat_plans AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own beat plans" ON public.beat_plans AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage all beats" ON public.beats AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all beats" ON public.beats AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view all beats for analytics" ON public.beats AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create beats with themselves as creator" ON public.beats AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "Users can delete beats" ON public.beats AS PERMISSIVE FOR DELETE TO public USING (((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can update their own beats" ON public.beats AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = created_by));
CREATE POLICY "Users can view their own beats" ON public.beats AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = created_by));
CREATE POLICY "Users can create branding request items for their requests" ON public.branding_request_items AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM branding_requests br
  WHERE ((br.id = branding_request_items.branding_request_id) AND (br.user_id = auth.uid())))));
CREATE POLICY "Users can delete their own branding request items" ON public.branding_request_items AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM branding_requests br
  WHERE ((br.id = branding_request_items.branding_request_id) AND (br.user_id = auth.uid())))));
CREATE POLICY "Users can update their own branding request items" ON public.branding_request_items AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM branding_requests br
  WHERE ((br.id = branding_request_items.branding_request_id) AND ((br.user_id = auth.uid()) OR (br.manager_id = auth.uid()) OR (br.procurement_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))));
CREATE POLICY "Users can view their own branding request items" ON public.branding_request_items AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM branding_requests br
  WHERE ((br.id = branding_request_items.branding_request_id) AND ((br.user_id = auth.uid()) OR (br.manager_id = auth.uid()) OR (br.procurement_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))));
CREATE POLICY "Users and assigned staff can update branding requests" ON public.branding_requests AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = user_id) OR (auth.uid() = manager_id) OR (auth.uid() = procurement_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users and assigned staff can view branding requests" ON public.branding_requests AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR (auth.uid() = manager_id) OR (auth.uid() = procurement_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can create their own branding requests" ON public.branding_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can insert broadcast logs" ON public.broadcast_notification_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view their own broadcast logs" ON public.broadcast_notification_log AS PERMISSIVE FOR SELECT TO authenticated USING ((sent_by = auth.uid()));
CREATE POLICY "Users can create their own conversations" ON public.chat_conversations AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own conversations" ON public.chat_conversations AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own conversations" ON public.chat_conversations AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own conversations" ON public.chat_conversations AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can create their own feedback" ON public.chat_feedback AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own feedback" ON public.chat_feedback AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can create messages in their conversations" ON public.chat_messages AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM chat_conversations
  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.user_id = auth.uid())))));
CREATE POLICY "Users can view messages in their conversations" ON public.chat_messages AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM chat_conversations
  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.user_id = auth.uid())))));
CREATE POLICY "Anyone can view badges" ON public.coach_badges AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own chat messages" ON public.coach_chat_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own chat messages" ON public.coach_chat_messages AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Anyone can view competencies" ON public.coach_competencies AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own nudges" ON public.coach_daily_nudges AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own nudges" ON public.coach_daily_nudges AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own feedback" ON public.coach_feedback AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own feedback" ON public.coach_feedback AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Anyone can view learning content" ON public.coach_learning_content AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own quiz attempts" ON public.coach_quiz_attempts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own quiz attempts" ON public.coach_quiz_attempts AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Anyone can view quiz questions" ON public.coach_quiz_questions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own scenario attempts" ON public.coach_scenario_attempts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own scenario attempts" ON public.coach_scenario_attempts AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Anyone can view scenarios" ON public.coach_scenarios AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own badges" ON public.coach_user_badges AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own badges" ON public.coach_user_badges AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own competency scores" ON public.coach_user_competency_scores AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own competency scores" ON public.coach_user_competency_scores AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own competency scores" ON public.coach_user_competency_scores AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own overall scores" ON public.coach_user_overall_scores AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own overall scores" ON public.coach_user_overall_scores AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own overall scores" ON public.coach_user_overall_scores AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own progress" ON public.coach_user_progress AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own progress" ON public.coach_user_progress AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own progress" ON public.coach_user_progress AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own streaks" ON public.coach_user_streaks AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own streaks" ON public.coach_user_streaks AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own streaks" ON public.coach_user_streaks AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage companies" ON public.companies AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view companies" ON public.companies AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can insert company product categories" ON public.company_product_categories AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read company product categories" ON public.company_product_categories AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update company product categories" ON public.company_product_categories AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage competencies" ON public.competencies AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view competencies" ON public.competencies AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can view all coaching notes" ON public.competency_coaching_notes AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can manage coaching notes they created" ON public.competency_coaching_notes AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = manager_id));
CREATE POLICY "Users can view coaching notes about them" ON public.competency_coaching_notes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage competency templates" ON public.competency_templates AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active competency templates" ON public.competency_templates AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));
CREATE POLICY "Admins can delete competition_contacts" ON public.competition_contacts AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Admins can manage competition contacts" ON public.competition_contacts AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update competition_contacts" ON public.competition_contacts AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Users can create competition_contacts" ON public.competition_contacts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view competition contacts" ON public.competition_contacts AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view competition_contacts" ON public.competition_contacts AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can view all competition data" ON public.competition_data AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own competition data" ON public.competition_data AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own competition data" ON public.competition_data AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own competition data" ON public.competition_data AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can create their own competition insights" ON public.competition_insights AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid())::text = (user_id)::text));
CREATE POLICY "Users can update their own competition insights" ON public.competition_insights AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid())::text = (user_id)::text));
CREATE POLICY "Users can view their own competition insights" ON public.competition_insights AS PERMISSIVE FOR SELECT TO public USING (((auth.uid())::text = (user_id)::text));
CREATE POLICY "Admins can delete competition_master" ON public.competition_master AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Admins can manage competition master" ON public.competition_master AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update competition_master" ON public.competition_master AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Users can create competition_master" ON public.competition_master AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view competition master" ON public.competition_master AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view competition_master" ON public.competition_master AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can delete competition_skus" ON public.competition_skus AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Admins can manage competition SKUs" ON public.competition_skus AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update competition_skus" ON public.competition_skus AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Users can create competition_skus" ON public.competition_skus AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view competition SKUs" ON public.competition_skus AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view competition_skus" ON public.competition_skus AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY counter_sale_items_delete_via_parent ON public.counter_sale_items AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM counter_sales cs
  WHERE ((cs.id = counter_sale_items.counter_sale_id) AND (cs.user_id = auth.uid())))));
CREATE POLICY counter_sale_items_insert_via_parent ON public.counter_sale_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM counter_sales cs
  WHERE ((cs.id = counter_sale_items.counter_sale_id) AND (cs.user_id = auth.uid())))));
CREATE POLICY counter_sale_items_select_via_parent ON public.counter_sale_items AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM counter_sales cs
  WHERE ((cs.id = counter_sale_items.counter_sale_id) AND (cs.user_id = auth.uid())))));
CREATE POLICY counter_sales_delete_own ON public.counter_sales AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY counter_sales_insert_own ON public.counter_sales AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY counter_sales_select_own ON public.counter_sales AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY counter_sales_update_own ON public.counter_sales AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert credit ledger entries" ON public.credit_ledger AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view credit ledger entries" ON public.credit_ledger AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage credit config" ON public.credit_management_config AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view credit config" ON public.credit_management_config AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can insert credit note items" ON public.credit_note_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update credit note items" ON public.credit_note_items AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view credit note items" ON public.credit_note_items AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert credit notes" ON public.credit_notes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "Authenticated users can update credit notes" ON public.credit_notes AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view credit notes" ON public.credit_notes AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage custom templates" ON public.custom_invoice_templates AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Users can view active templates" ON public.custom_invoice_templates AS PERMISSIVE FOR SELECT TO public USING (((is_active = true) AND (auth.uid() IS NOT NULL)));
CREATE POLICY "Allow anon delete customer_portal_cart" ON public.customer_portal_cart AS PERMISSIVE FOR DELETE TO anon USING (true);
CREATE POLICY "Allow anon insert customer_portal_cart" ON public.customer_portal_cart AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon read customer_portal_cart" ON public.customer_portal_cart AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update customer_portal_cart" ON public.customer_portal_cart AS PERMISSIVE FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage customers" ON public.customers AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view customers" ON public.customers AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Managers can view subordinate GPS distance" ON public.daily_gps_distance AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM employees
  WHERE ((employees.user_id = daily_gps_distance.user_id) AND (employees.manager_id = auth.uid())))));
CREATE POLICY "Users can update own GPS distance" ON public.daily_gps_distance AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can upsert own GPS distance" ON public.daily_gps_distance AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own GPS distance" ON public.daily_gps_distance AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can insert delivery exceptions" ON public.delivery_exceptions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update delivery exceptions" ON public.delivery_exceptions AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view delivery exceptions" ON public.delivery_exceptions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage delivery_run_packing_lists" ON public.delivery_run_packing_lists AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage delivery_runs" ON public.delivery_runs AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can insert their own battery logs" ON public.device_battery_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own battery logs" ON public.device_battery_logs AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can delete distributor attachments" ON public.distributor_attachments AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert distributor attachments" ON public.distributor_attachments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update distributor attachments" ON public.distributor_attachments AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view distributor attachments" ON public.distributor_attachments AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage distributor beat mappings" ON public.distributor_beat_mappings AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create distributor beat mappings" ON public.distributor_beat_mappings AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view distributor beat mappings" ON public.distributor_beat_mappings AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage month products" ON public.distributor_business_plan_month_products AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete month products" ON public.distributor_business_plan_month_products AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can insert month products" ON public.distributor_business_plan_month_products AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can update month products" ON public.distributor_business_plan_month_products AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view month products" ON public.distributor_business_plan_month_products AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can create distributor plan months" ON public.distributor_business_plan_months AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can delete distributor plan months" ON public.distributor_business_plan_months AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can update distributor plan months" ON public.distributor_business_plan_months AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view distributor plan months" ON public.distributor_business_plan_months AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can manage plan products" ON public.distributor_business_plan_products AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can view plan products" ON public.distributor_business_plan_products AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can manage plan retailers" ON public.distributor_business_plan_retailers AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can view plan retailers" ON public.distributor_business_plan_retailers AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can delete business plans" ON public.distributor_business_plans AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can create business plans" ON public.distributor_business_plans AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can update business plans" ON public.distributor_business_plans AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can view business plans" ON public.distributor_business_plans AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage all claims" ON public.distributor_claims AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Distributors can create their own claims" ON public.distributor_claims AS PERMISSIVE FOR INSERT TO public WITH CHECK ((distributor_id IN ( SELECT distributor_users.distributor_id
   FROM distributor_users
  WHERE (distributor_users.auth_user_id = auth.uid()))));
CREATE POLICY "Users can delete company return items" ON public.distributor_company_return_items AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can insert company return items" ON public.distributor_company_return_items AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can update company return items" ON public.distributor_company_return_items AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view company return items" ON public.distributor_company_return_items AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can insert company returns" ON public.distributor_company_returns AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can update company returns" ON public.distributor_company_returns AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view company returns" ON public.distributor_company_returns AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can delete distributor contacts" ON public.distributor_contacts AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert distributor contacts" ON public.distributor_contacts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update distributor contacts" ON public.distributor_contacts AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view distributor contacts" ON public.distributor_contacts AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage distributor credit limits" ON public.distributor_credit_limits AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete evaluation tasks" ON public.distributor_evaluation_tasks AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert evaluation tasks" ON public.distributor_evaluation_tasks AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update evaluation tasks" ON public.distributor_evaluation_tasks AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view evaluation tasks" ON public.distributor_evaluation_tasks AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage all ideas" ON public.distributor_ideas AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Distributors can create their own ideas" ON public.distributor_ideas AS PERMISSIVE FOR INSERT TO public WITH CHECK ((distributor_id IN ( SELECT distributor_users.distributor_id
   FROM distributor_users
  WHERE (distributor_users.auth_user_id = auth.uid()))));
CREATE POLICY "Distributors can update their own ideas" ON public.distributor_ideas AS PERMISSIVE FOR UPDATE TO public USING ((distributor_id IN ( SELECT distributor_users.distributor_id
   FROM distributor_users
  WHERE (distributor_users.auth_user_id = auth.uid()))));
CREATE POLICY "Distributors can view their own ideas" ON public.distributor_ideas AS PERMISSIVE FOR SELECT TO public USING (((distributor_id IN ( SELECT distributor_users.distributor_id
   FROM distributor_users
  WHERE (distributor_users.auth_user_id = auth.uid()))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins and distributors can insert inventory" ON public.distributor_inventory AS PERMISSIVE FOR INSERT TO public WITH CHECK (((EXISTS ( SELECT 1
   FROM distributor_users du
  WHERE ((du.auth_user_id = auth.uid()) AND (du.distributor_id = distributor_inventory.distributor_id) AND (du.is_active = true)))) OR has_role(auth.uid(), 'admin'::app_role) OR is_system_admin(auth.uid())));
CREATE POLICY "Distributors can view their inventory" ON public.distributor_inventory AS PERMISSIVE FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM distributor_users du
  WHERE ((du.auth_user_id = auth.uid()) AND (du.distributor_id = distributor_inventory.distributor_id) AND (du.is_active = true)))) OR has_role(auth.uid(), 'admin'::app_role) OR is_system_admin(auth.uid())));
CREATE POLICY "Parent distributors can view child inventory" ON public.distributor_inventory AS PERMISSIVE FOR SELECT TO public USING (can_view_distributor(distributor_id));
CREATE POLICY "Distributors can view their transactions" ON public.distributor_inventory_transactions AS PERMISSIVE FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM distributor_users du
  WHERE ((du.auth_user_id = auth.uid()) AND (du.distributor_id = distributor_inventory_transactions.distributor_id) AND (du.is_active = true)))) OR has_role(auth.uid(), 'admin'::app_role) OR is_system_admin(auth.uid())));
CREATE POLICY "Parent distributors can view child inventory transactions" ON public.distributor_inventory_transactions AS PERMISSIVE FOR SELECT TO public USING (can_view_distributor(distributor_id));
CREATE POLICY "Users can insert inventory transactions" ON public.distributor_inventory_transactions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can manage distributor item mappings" ON public.distributor_item_mappings AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM distributor_retailer_mappings drm
  WHERE ((drm.id = distributor_item_mappings.mapping_id) AND (drm.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM distributor_retailer_mappings drm
  WHERE ((drm.id = distributor_item_mappings.mapping_id) AND (drm.user_id = auth.uid())))));
CREATE POLICY "Authenticated users can delete distributor locations" ON public.distributor_locations AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert distributor locations" ON public.distributor_locations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update distributor locations" ON public.distributor_locations AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view distributor locations" ON public.distributor_locations AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage payments" ON public.distributor_payments AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage distributor price books" ON public.distributor_price_books AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow anon read distributor_price_books" ON public.distributor_price_books AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can view distributor price books" ON public.distributor_price_books AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage credit limits" ON public.distributor_retailer_credit_limits AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage retailer feedback" ON public.distributor_retailer_feedback AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ledger" ON public.distributor_retailer_ledger AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage their own distributor retailer mappings" ON public.distributor_retailer_mappings AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete return items" ON public.distributor_return_items AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can insert return items" ON public.distributor_return_items AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can update return items" ON public.distributor_return_items AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view return items" ON public.distributor_return_items AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can insert distributor returns" ON public.distributor_returns AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can update distributor returns" ON public.distributor_returns AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view distributor returns" ON public.distributor_returns AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can manage secondary invoice items" ON public.distributor_secondary_invoice_items AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage secondary invoices" ON public.distributor_secondary_invoices AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage all support requests" ON public.distributor_support_requests AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Distributors can create their own support requests" ON public.distributor_support_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK ((distributor_id IN ( SELECT distributor_users.distributor_id
   FROM distributor_users
  WHERE (distributor_users.auth_user_id = auth.uid()))));
CREATE POLICY "Distributors can update their own support requests" ON public.distributor_support_requests AS PERMISSIVE FOR UPDATE TO public USING ((distributor_id IN ( SELECT distributor_users.distributor_id
   FROM distributor_users
  WHERE (distributor_users.auth_user_id = auth.uid()))));
CREATE POLICY "Distributors can view their own support requests" ON public.distributor_support_requests AS PERMISSIVE FOR SELECT TO public USING (((distributor_id IN ( SELECT distributor_users.distributor_id
   FROM distributor_users
  WHERE (distributor_users.auth_user_id = auth.uid()))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Allow delete for all users" ON public.distributor_types AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Allow insert for all users" ON public.distributor_types AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow read for all users" ON public.distributor_types AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow update for all users" ON public.distributor_types AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete distributor users" ON public.distributor_users AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage all distributor users" ON public.distributor_users AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage distributor users" ON public.distributor_users AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can insert distributor users" ON public.distributor_users AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can update distributor users" ON public.distributor_users AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can view distributor users" ON public.distributor_users AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Distributor users can view their own profile" ON public.distributor_users AS PERMISSIVE FOR SELECT TO public USING ((((auth.uid())::text = (id)::text) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Field staff can delete distributors" ON public.distributors AS PERMISSIVE FOR DELETE TO authenticated USING ((get_distributor_id_for_auth_user() IS NULL));
CREATE POLICY "Field staff can update distributors" ON public.distributors AS PERMISSIVE FOR UPDATE TO authenticated USING ((get_distributor_id_for_auth_user() IS NULL)) WITH CHECK ((get_distributor_id_for_auth_user() IS NULL));
CREATE POLICY "Field staff can view all distributors" ON public.distributors AS PERMISSIVE FOR SELECT TO authenticated USING ((get_distributor_id_for_auth_user() IS NULL));
CREATE POLICY "Portal users update own distributor only" ON public.distributors AS PERMISSIVE FOR UPDATE TO authenticated USING ((id = get_distributor_id_for_auth_user())) WITH CHECK ((id = get_distributor_id_for_auth_user()));
CREATE POLICY "Portal users view own and child distributors" ON public.distributors AS PERMISSIVE FOR SELECT TO authenticated USING (can_view_distributor(id));
CREATE POLICY "Authenticated users can read district intelligence cache" ON public.district_intelligence_cache AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own education history" ON public.education_history AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view all education history" ON public.education_history AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Users can manage their own emergency contacts" ON public.emergency_contacts AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own emergency contacts" ON public.emergency_contacts AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage badges" ON public.employee_badges AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view badges" ON public.employee_badges AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage competencies" ON public.employee_competencies AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own competencies" ON public.employee_competencies AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can manage their own connections" ON public.employee_connections AS PERMISSIVE FOR ALL TO authenticated USING ((auth.uid() = follower_id));
CREATE POLICY "Users can view connections" ON public.employee_connections AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage employee documents" ON public.employee_documents AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own employee documents" ON public.employee_documents AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can create recommendations" ON public.employee_recommendations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = recommender_id));
CREATE POLICY "Users can update their own recommendations" ON public.employee_recommendations AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = recommender_id));
CREATE POLICY "Users can view recommendations" ON public.employee_recommendations AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitted admins can delete employees" ON public.employees AS PERMISSIVE FOR DELETE TO public USING ((is_system_admin(auth.uid()) OR can_access_object(auth.uid(), 'admin_user_delete'::text, 'delete'::text)));
CREATE POLICY "Users can view their own employee record with logging" ON public.employees AS PERMISSIVE FOR SELECT TO public USING (can_view_employee(user_id));
CREATE POLICY "Users or permitted admins can insert employees" ON public.employees AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) OR is_system_admin(auth.uid()) OR can_access_object(auth.uid(), 'admin_user_create'::text, 'create'::text)));
CREATE POLICY "Users or permitted admins can update employees" ON public.employees AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = user_id) OR is_system_admin(auth.uid()) OR can_access_object(auth.uid(), 'admin_user_list'::text, 'edit'::text))) WITH CHECK (((auth.uid() = user_id) OR is_system_admin(auth.uid()) OR can_access_object(auth.uid(), 'admin_user_list'::text, 'edit'::text)));
CREATE POLICY "enabled_units admin write" ON public.enabled_units AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "enabled_units read authenticated" ON public.enabled_units AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage expense_approval_rules" ON public.expense_approval_rules AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone authenticated can read expense_approval_rules" ON public.expense_approval_rules AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage expense_categories" ON public.expense_categories AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone authenticated can read expense_categories" ON public.expense_categories AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage expense_group_members" ON public.expense_group_members AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read expense_group_members" ON public.expense_group_members AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage expense_groups" ON public.expense_groups AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read expense_groups" ON public.expense_groups AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage expense master config" ON public.expense_master_config AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view expense master config" ON public.expense_master_config AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can delete own list items" ON public.external_retailer_list_items AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM external_retailer_lists
  WHERE ((external_retailer_lists.id = external_retailer_list_items.list_id) AND (external_retailer_lists.created_by = auth.uid())))));
CREATE POLICY "Users can insert own list items" ON public.external_retailer_list_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM external_retailer_lists
  WHERE ((external_retailer_lists.id = external_retailer_list_items.list_id) AND (external_retailer_lists.created_by = auth.uid())))));
CREATE POLICY "Users can view own list items" ON public.external_retailer_list_items AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM external_retailer_lists
  WHERE ((external_retailer_lists.id = external_retailer_list_items.list_id) AND (external_retailer_lists.created_by = auth.uid())))));
CREATE POLICY "Users can create own lists" ON public.external_retailer_lists AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "Users can delete own lists" ON public.external_retailer_lists AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = created_by));
CREATE POLICY "Users can update own lists" ON public.external_retailer_lists AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = created_by));
CREATE POLICY "Users can view own lists" ON public.external_retailer_lists AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = created_by));
CREATE POLICY "Admins can view feature flag audit" ON public.feature_flag_audit AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert feature flag audit" ON public.feature_flag_audit AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage feature flags" ON public.feature_flags AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view feature flags" ON public.feature_flags AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can delete feedback_policies" ON public.feedback_policies AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert feedback_policies" ON public.feedback_policies AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read feedback_policies" ON public.feedback_policies AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update feedback_policies" ON public.feedback_policies AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete feedback_policy_rules" ON public.feedback_policy_rules AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert feedback_policy_rules" ON public.feedback_policy_rules AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read feedback_policy_rules" ON public.feedback_policy_rules AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update feedback_policy_rules" ON public.feedback_policy_rules AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete feedback_questions" ON public.feedback_questions AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert feedback_questions" ON public.feedback_questions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read feedback_questions" ON public.feedback_questions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update feedback_questions" ON public.feedback_questions AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage period targets" ON public.fy_period_targets AS PERMISSIVE FOR ALL TO public USING (is_system_admin(auth.uid()));
CREATE POLICY "Authenticated users can view period targets" ON public.fy_period_targets AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can create target config" ON public.fy_target_config AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Admins can delete target config" ON public.fy_target_config AS PERMISSIVE FOR DELETE TO public USING (is_system_admin(auth.uid()));
CREATE POLICY "Admins can update target config" ON public.fy_target_config AS PERMISSIVE FOR UPDATE TO public USING (is_system_admin(auth.uid()));
CREATE POLICY "Admins can view target config" ON public.fy_target_config AS PERMISSIVE FOR SELECT TO public USING (is_system_admin(auth.uid()));
CREATE POLICY "Admins can manage gamification actions" ON public.gamification_actions AS PERMISSIVE FOR ALL TO authenticated USING (is_system_admin(auth.uid())) WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Users can view enabled actions for active games" ON public.gamification_actions AS PERMISSIVE FOR SELECT TO public USING (((is_enabled = true) AND (EXISTS ( SELECT 1
   FROM gamification_games
  WHERE ((gamification_games.id = gamification_actions.game_id) AND (gamification_games.is_active = true)))) AND (auth.uid() IS NOT NULL)));
CREATE POLICY "System can manage daily tracking" ON public.gamification_daily_tracking AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view their own daily tracking" ON public.gamification_daily_tracking AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage gamification games" ON public.gamification_games AS PERMISSIVE FOR ALL TO authenticated USING (is_system_admin(auth.uid())) WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Users can view active games" ON public.gamification_games AS PERMISSIVE FOR SELECT TO public USING (((is_active = true) AND (auth.uid() IS NOT NULL)));
CREATE POLICY "Admins can view all points" ON public.gamification_points AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert points" ON public.gamification_points AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view their own points" ON public.gamification_points AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage all redemptions" ON public.gamification_redemptions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own redemption requests" ON public.gamification_redemptions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own redemptions" ON public.gamification_redemptions AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "System can manage retailer sequences" ON public.gamification_retailer_sequences AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view their own retailer sequences" ON public.gamification_retailer_sequences AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can insert geocoding jobs" ON public.geocoding_jobs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read geocoding jobs" ON public.geocoding_jobs AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert global leave policy" ON public.global_leave_policy AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can read global leave policy" ON public.global_leave_policy AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update global leave policy" ON public.global_leave_policy AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can manage goods_receipt_notes" ON public.goods_receipt_notes AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view all GPS tracking" ON public.gps_tracking AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Managers can view subordinates GPS tracking" ON public.gps_tracking AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT get_all_subordinates.subordinate_user_id
   FROM get_all_subordinates(auth.uid()) get_all_subordinates(subordinate_user_id, level, full_name))));
CREATE POLICY "Users can insert their own GPS tracking" ON public.gps_tracking AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own GPS tracking" ON public.gps_tracking AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all GPS stop reasons" ON public.gps_tracking_stops AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all stop reasons" ON public.gps_tracking_stops AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Users can insert their own GPS stop reasons" ON public.gps_tracking_stops AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own stop reasons" ON public.gps_tracking_stops AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own GPS stop reasons" ON public.gps_tracking_stops AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own stop reasons" ON public.gps_tracking_stops AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can manage grn_items" ON public.grn_items AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage all allocations" ON public.hierarchy_target_allocations AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can insert allocations for their hierarchy" ON public.hierarchy_target_allocations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1
   FROM hierarchy_targets ht
  WHERE ((ht.id = hierarchy_target_allocations.hierarchy_target_id) AND (ht.root_user_id = auth.uid()))))));
CREATE POLICY "Managers can update allocations for their hierarchy" ON public.hierarchy_target_allocations AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1
   FROM hierarchy_targets ht
  WHERE ((ht.id = hierarchy_target_allocations.hierarchy_target_id) AND (ht.root_user_id = auth.uid())))))) WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1
   FROM hierarchy_targets ht
  WHERE ((ht.id = hierarchy_target_allocations.hierarchy_target_id) AND (ht.root_user_id = auth.uid()))))));
CREATE POLICY "Users can view their own allocations" ON public.hierarchy_target_allocations AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (manager_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1
   FROM hierarchy_targets ht
  WHERE ((ht.id = hierarchy_target_allocations.hierarchy_target_id) AND (ht.root_user_id = auth.uid()))))));
CREATE POLICY "Admins can view all history" ON public.hierarchy_target_history AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can insert history" ON public.hierarchy_target_history AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view history for their hierarchy" ON public.hierarchy_target_history AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (auth.uid() = ANY (affected_users)) OR (EXISTS ( SELECT 1
   FROM hierarchy_targets ht
  WHERE ((ht.id = hierarchy_target_history.hierarchy_target_id) AND (ht.root_user_id = auth.uid()))))));
CREATE POLICY "Admins can manage all hierarchy targets" ON public.hierarchy_targets AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can create/update hierarchy targets for their team" ON public.hierarchy_targets AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((root_user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR is_manager(auth.uid())));
CREATE POLICY "Managers can update their hierarchy targets" ON public.hierarchy_targets AS PERMISSIVE FOR UPDATE TO authenticated USING (((root_user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK (((root_user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Managers can view hierarchy targets where they are root" ON public.hierarchy_targets AS PERMISSIVE FOR SELECT TO authenticated USING (((root_user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins can manage all holidays" ON public.holidays AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view holidays" ON public.holidays AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can delete accounts" ON public.inst_accounts AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create accounts" ON public.inst_accounts AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can update accounts" ON public.inst_accounts AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = account_owner) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can view accounts" ON public.inst_accounts AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can delete collections" ON public.inst_collections AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create collections" ON public.inst_collections AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can update collections" ON public.inst_collections AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = collected_by) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can view collections" ON public.inst_collections AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can manage contacts" ON public.inst_contacts AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view contacts" ON public.inst_contacts AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can manage invoice lines" ON public.inst_invoice_lines AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view invoice lines" ON public.inst_invoice_lines AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can delete invoices" ON public.inst_invoices AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create invoices" ON public.inst_invoices AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "Users can update invoices" ON public.inst_invoices AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can view invoices" ON public.inst_invoices AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can delete leads" ON public.inst_leads AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create leads" ON public.inst_leads AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "Users can update their leads" ON public.inst_leads AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = created_by) OR (auth.uid() = assigned_to) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can view leads" ON public.inst_leads AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can delete opportunities" ON public.inst_opportunities AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create opportunities" ON public.inst_opportunities AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can update opportunities" ON public.inst_opportunities AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = owner_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can view opportunities" ON public.inst_opportunities AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can manage commitment lines" ON public.inst_order_commitment_lines AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view commitment lines" ON public.inst_order_commitment_lines AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can delete order commitments" ON public.inst_order_commitments AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create order commitments" ON public.inst_order_commitments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "Users can update order commitments" ON public.inst_order_commitments AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can view order commitments" ON public.inst_order_commitments AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage price book entries" ON public.inst_price_book_entries AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view price book entries" ON public.inst_price_book_entries AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage price books" ON public.inst_price_books AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view price books" ON public.inst_price_books AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage products" ON public.inst_products AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view products" ON public.inst_products AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can manage quote line items" ON public.inst_quote_line_items AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view quote line items" ON public.inst_quote_line_items AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can delete quotes" ON public.inst_quotes AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create quotes" ON public.inst_quotes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "Users can update quotes" ON public.inst_quotes AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can view quotes" ON public.inst_quotes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can insert inventory batches" ON public.inventory_batches AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update inventory batches" ON public.inventory_batches AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view inventory batches" ON public.inventory_batches AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage inventory_valuation_config" ON public.inventory_valuation_config AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can view invoice display settings" ON public.invoice_display_settings AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can insert invoice display settings" ON public.invoice_display_settings AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authenticated users can update invoice display settings" ON public.invoice_display_settings AS PERMISSIVE FOR UPDATE TO public USING (true);
CREATE POLICY "Admins can manage invoice document settings" ON public.invoice_document_settings AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Anyone can read invoice document settings" ON public.invoice_document_settings AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage all invoice items" ON public.invoice_items AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert invoice items for their own invoices" ON public.invoice_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM invoices
  WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.created_by = auth.uid())))));
CREATE POLICY "Users can update invoice items for their own invoices" ON public.invoice_items AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM invoices
  WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.created_by = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM invoices
  WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.created_by = auth.uid())))));
CREATE POLICY "Users can view all invoice items" ON public.invoice_items AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage all invoices" ON public.invoices AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert their own invoices" ON public.invoices AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((created_by = auth.uid()));
CREATE POLICY "Users can update their own invoices" ON public.invoices AS PERMISSIVE FOR UPDATE TO authenticated USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));
CREATE POLICY "Users can view all invoices" ON public.invoices AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage all feedback" ON public.joint_sales_feedback AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "FSE can insert own feedback" ON public.joint_sales_feedback AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = fse_user_id));
CREATE POLICY "FSEs can view feedback for their beats" ON public.joint_sales_feedback AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = fse_user_id));
CREATE POLICY "Managers can create feedback for their joint visits" ON public.joint_sales_feedback AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = manager_id));
CREATE POLICY "Managers can update their own feedback" ON public.joint_sales_feedback AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = manager_id));
CREATE POLICY "Managers can view their own feedback" ON public.joint_sales_feedback AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = manager_id));
CREATE POLICY joint_sales_feedback_select_admin ON public.joint_sales_feedback AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY joint_sales_feedback_select_own ON public.joint_sales_feedback AS PERMISSIVE FOR SELECT TO authenticated USING (((manager_id = auth.uid()) OR (fse_user_id = auth.uid())));
CREATE POLICY joint_sales_feedback_update_own ON public.joint_sales_feedback AS PERMISSIVE FOR UPDATE TO authenticated USING (((manager_id = auth.uid()) OR (fse_user_id = auth.uid())));
CREATE POLICY "Admins can manage all sessions" ON public.joint_sales_sessions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "FSEs can view sessions for their beats" ON public.joint_sales_sessions AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = fse_user_id));
CREATE POLICY "Managers can view their own sessions" ON public.joint_sales_sessions AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = manager_id));
CREATE POLICY "System can manage sessions" ON public.joint_sales_sessions AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage accrual logs" ON public.leave_accrual_log AS PERMISSIVE FOR ALL TO authenticated USING (is_system_admin(auth.uid())) WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Users can view own accrual logs" ON public.leave_accrual_log AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Admins can update leave applications" ON public.leave_applications AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all leave applications" ON public.leave_applications AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approvers can view leave applications in their approval chain" ON public.leave_applications AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (approval_steps ast
     JOIN approval_requests ar ON ((ar.id = ast.approval_request_id)))
  WHERE ((ar.entity_id = leave_applications.id) AND (ar.entity_type = 'leave'::text) AND (ast.approver_id = auth.uid())))));
CREATE POLICY "Managers can update their direct reports' leave applications" ON public.leave_applications AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = leave_applications.user_id) AND (e.manager_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = leave_applications.user_id) AND (e.manager_id = auth.uid())))));
CREATE POLICY "Managers can view their direct reports' leave applications" ON public.leave_applications AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = leave_applications.user_id) AND (e.manager_id = auth.uid())))));
CREATE POLICY "Users can create their own leave applications" ON public.leave_applications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = (user_id)::text));
CREATE POLICY "Users can update their own pending leave applications" ON public.leave_applications AS PERMISSIVE FOR UPDATE TO authenticated USING ((((auth.uid())::text = (user_id)::text) AND (status = 'pending'::text)));
CREATE POLICY "Users can view their own leave applications" ON public.leave_applications AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid())::text = (user_id)::text));
CREATE POLICY "Admins can manage approval workflows" ON public.leave_approval_workflow AS PERMISSIVE FOR ALL TO authenticated USING (is_system_admin(auth.uid())) WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Users can view approval workflows" ON public.leave_approval_workflow AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can delete leave balances" ON public.leave_balance AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert leave balances" ON public.leave_balance AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update leave balances" ON public.leave_balance AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all leave balances" ON public.leave_balance AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own leave balance" ON public.leave_balance AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid())::text = (user_id)::text));
CREATE POLICY "Admins can manage holiday bridge" ON public.leave_holidays_bridge AS PERMISSIVE FOR ALL TO authenticated USING (is_system_admin(auth.uid())) WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Users can view holiday bridge for own applications" ON public.leave_holidays_bridge AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM leave_applications la
  WHERE ((la.id = leave_holidays_bridge.leave_application_id) AND (la.user_id = auth.uid())))));
CREATE POLICY "Anyone can read leave policies" ON public.leave_policy AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can manage leave policies" ON public.leave_policy AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete leave type overrides" ON public.leave_type_policy_override AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert leave type overrides" ON public.leave_type_policy_override AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can read leave type overrides" ON public.leave_type_policy_override AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update leave type overrides" ON public.leave_type_policy_override AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete leave types" ON public.leave_types AS PERMISSIVE FOR DELETE TO authenticated USING (is_system_admin(auth.uid()));
CREATE POLICY "Admins can insert leave types" ON public.leave_types AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Admins can update leave types" ON public.leave_types AS PERMISSIVE FOR UPDATE TO authenticated USING (is_system_admin(auth.uid())) WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Leave types are viewable by authenticated users" ON public.leave_types AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage license config" ON public.license_config AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view license config" ON public.license_config AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins and managers can view all usage logs" ON public.module_usage_logs AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR (user_id IN ( SELECT s.subordinate_user_id
   FROM get_all_subordinates(auth.uid()) s(subordinate_user_id, level, full_name)))));
CREATE POLICY "Users can insert their own usage logs" ON public.module_usage_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own usage logs" ON public.module_usage_logs AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Admins can read event log" ON public.notification_event_log AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert event log" ON public.notification_event_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage event types" ON public.notification_event_types AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read event types" ON public.notification_event_types AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can delete their own notification preferences" ON public.notification_preferences AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own notification preferences" ON public.notification_preferences AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can manage notification rules" ON public.notification_rules AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view notification rules" ON public.notification_rules AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can create any notification" ON public.notifications AS PERMISSIVE FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can create notifications" ON public.notifications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can read retailer notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO anon USING ((retailer_id IS NOT NULL));
CREATE POLICY "Anon can update retailer notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO anon USING ((retailer_id IS NOT NULL)) WITH CHECK ((retailer_id IS NOT NULL));
CREATE POLICY "Authenticated can read retailer notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING ((retailer_id IS NOT NULL));
CREATE POLICY "Authenticated can update retailer notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING ((retailer_id IS NOT NULL)) WITH CHECK ((retailer_id IS NOT NULL));
CREATE POLICY "Service role can create any notification" ON public.notifications AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.jwt() ->> 'role'::text) = 'service_role'::text));
CREATE POLICY "Users can create notifications for themselves" ON public.notifications AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can create own notifications" ON public.notifications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users update own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users view own notifications or admins view all" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins can manage onboarding tasks" ON public.onboarding_tasks AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Everyone can view onboarding tasks" ON public.onboarding_tasks AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can insert opening stock entries" ON public.opening_stock_entries AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can view opening stock entries" ON public.opening_stock_entries AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert cancellation logs" ON public.order_cancellation_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view their cancellation logs" ON public.order_cancellation_log AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage all order items" ON public.order_items AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all order items" ON public.order_items AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow anon insert order_items for portal" ON public.order_items AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon read order_items for portal" ON public.order_items AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated insert order_items for portal" ON public.order_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.order_source = 'portal_order'::text)))));
CREATE POLICY "Authenticated users can view order items for reporting" ON public.order_items AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can create order items for their orders" ON public.order_items AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));
CREATE POLICY "Users can view order items for their orders" ON public.order_items AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));
CREATE POLICY "Admins can update all orders" ON public.orders AS PERMISSIVE FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all orders" ON public.orders AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow anon insert orders for portal" ON public.orders AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon read orders for portal" ON public.orders AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated insert orders for portal" ON public.orders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((order_source = 'portal_order'::text) AND (retailer_id IS NOT NULL) AND (user_id IS NOT NULL) AND (subtotal IS NOT NULL) AND (total_amount IS NOT NULL) AND ((status IS NULL) OR (status = ANY (ARRAY['pending'::text, 'confirmed'::text])))));
CREATE POLICY "Authenticated users can view orders for reporting" ON public.orders AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Distributor users can update orders for their distributor" ON public.orders AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM distributor_users du
  WHERE ((du.auth_user_id = auth.uid()) AND (du.distributor_id = orders.distributor_id) AND (du.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM distributor_users du
  WHERE ((du.auth_user_id = auth.uid()) AND (du.distributor_id = orders.distributor_id) AND (du.is_active = true)))));
CREATE POLICY "Users can create their own orders" ON public.orders AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own orders" ON public.orders AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view orders for accessible retailers" ON public.orders AS PERMISSIVE FOR SELECT TO public USING ((retailer_id IN ( SELECT retailers.id
   FROM retailers
  WHERE (retailers.user_id = auth.uid()))));
CREATE POLICY "Users can view their own orders" ON public.orders AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can manage packing_list_assignments" ON public.packing_list_assignments AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access on packing_list_item_batches" ON public.packing_list_item_batches AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access on packing_list_item_sources" ON public.packing_list_item_sources AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage packing_list_items" ON public.packing_list_items AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert packing_list_orders" ON public.packing_list_orders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can view packing_list_orders" ON public.packing_list_orders AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY pl_dist_update ON public.packing_lists AS PERMISSIVE FOR UPDATE TO authenticated USING (((( SELECT get_distributor_id_for_auth_user() AS get_distributor_id_for_auth_user) IS NOT NULL) AND ((distributor_id = ( SELECT get_distributor_id_for_auth_user() AS get_distributor_id_for_auth_user)) OR (distributor_id IN ( SELECT distributors.id
   FROM distributors
  WHERE (distributors.parent_id = ( SELECT get_distributor_id_for_auth_user() AS get_distributor_id_for_auth_user))))))) WITH CHECK (((( SELECT get_distributor_id_for_auth_user() AS get_distributor_id_for_auth_user) IS NOT NULL) AND ((distributor_id = ( SELECT get_distributor_id_for_auth_user() AS get_distributor_id_for_auth_user)) OR (distributor_id IN ( SELECT distributors.id
   FROM distributors
  WHERE (distributors.parent_id = ( SELECT get_distributor_id_for_auth_user() AS get_distributor_id_for_auth_user)))))));
CREATE POLICY pl_distributor_delete ON public.packing_lists AS PERMISSIVE FOR DELETE TO authenticated USING ((distributor_id = ( SELECT get_distributor_id_for_auth_user() AS get_distributor_id_for_auth_user)));
CREATE POLICY pl_distributor_select ON public.packing_lists AS PERMISSIVE FOR SELECT TO authenticated USING ((distributor_id = ( SELECT get_distributor_id_for_auth_user() AS get_distributor_id_for_auth_user)));
CREATE POLICY pl_staff_delete ON public.packing_lists AS PERMISSIVE FOR DELETE TO authenticated USING ((( SELECT get_distributor_id_for_auth_user() AS get_distributor_id_for_auth_user) IS NULL));
CREATE POLICY pl_staff_select ON public.packing_lists AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT get_distributor_id_for_auth_user() AS get_distributor_id_for_auth_user) IS NULL));
CREATE POLICY "Admins can view password reset attempts" ON public.password_reset_attempts AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage all performance comments" ON public.performance_comments AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can update subordinate manager comments" ON public.performance_comments AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = performance_comments.user_id) AND (e.manager_id = auth.uid())))));
CREATE POLICY "Managers can view subordinate performance comments" ON public.performance_comments AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = performance_comments.user_id) AND (e.manager_id = auth.uid())))));
CREATE POLICY "Users can insert their own self comments" ON public.performance_comments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own self comments" ON public.performance_comments AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own performance comments" ON public.performance_comments AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage module config" ON public.performance_module_config AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view module config" ON public.performance_module_config AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can view deletion log" ON public.permanent_deletion_log AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert deletion log" ON public.permanent_deletion_log AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage group permissions" ON public.permission_set_group_permissions AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read group permissions" ON public.permission_set_group_permissions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage group users" ON public.permission_set_group_users AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read group users" ON public.permission_set_group_users AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage permission set groups" ON public.permission_set_groups AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read permission set groups" ON public.permission_set_groups AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage funds" ON public.petty_cash_funds AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can view subordinate funds" ON public.petty_cash_funds AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id IN ( SELECT get_all_subordinates.subordinate_user_id
   FROM get_all_subordinates(auth.uid()) get_all_subordinates(subordinate_user_id, level, full_name))));
CREATE POLICY "Users can view own funds" ON public.petty_cash_funds AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins can manage limits" ON public.petty_cash_limits AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view limits for own funds" ON public.petty_cash_limits AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM petty_cash_funds f
  WHERE ((f.id = petty_cash_limits.fund_id) AND ((f.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))));
CREATE POLICY "Admins can manage all transactions" ON public.petty_cash_transactions AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can view subordinate transactions" ON public.petty_cash_transactions AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id IN ( SELECT get_all_subordinates.subordinate_user_id
   FROM get_all_subordinates(auth.uid()) get_all_subordinates(subordinate_user_id, level, full_name))));
CREATE POLICY "Users can insert own transactions" ON public.petty_cash_transactions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own draft transactions" ON public.petty_cash_transactions AS PERMISSIVE FOR UPDATE TO authenticated USING (((user_id = auth.uid()) AND (status = 'draft'::text)));
CREATE POLICY "Users can view own transactions" ON public.petty_cash_transactions AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins can manage pincode_master" ON public.pincode_master AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read pincode_master" ON public.pincode_master AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read top retailers" ON public.pincode_top_retailers AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage plan metrics" ON public.plan_enabled_metrics AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read plan metrics" ON public.plan_enabled_metrics AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can create AI insights" ON public.pm_ai_insights AS PERMISSIVE FOR INSERT TO public WITH CHECK (pm_is_project_member(project_id));
CREATE POLICY "Members can delete AI insights" ON public.pm_ai_insights AS PERMISSIVE FOR DELETE TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Members can view AI insights" ON public.pm_ai_insights AS PERMISSIVE FOR SELECT TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Idea author or admin can delete" ON public.pm_ideas AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = submitted_by) OR is_system_admin(auth.uid())));
CREATE POLICY "Idea author or admin can update" ON public.pm_ideas AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = submitted_by) OR is_system_admin(auth.uid())));
CREATE POLICY "Project members can insert ideas" ON public.pm_ideas AS PERMISSIVE FOR INSERT TO public WITH CHECK ((pm_is_project_member(project_id) AND (auth.uid() = submitted_by)));
CREATE POLICY "Project members can view ideas" ON public.pm_ideas AS PERMISSIVE FOR SELECT TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Doc uploader or admin can delete" ON public.pm_knowledge_documents AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = uploaded_by) OR is_system_admin(auth.uid())));
CREATE POLICY "Doc uploader or admin can update" ON public.pm_knowledge_documents AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = uploaded_by) OR is_system_admin(auth.uid())));
CREATE POLICY "Project members can insert docs" ON public.pm_knowledge_documents AS PERMISSIVE FOR INSERT TO public WITH CHECK ((pm_is_project_member(project_id) AND (auth.uid() = uploaded_by)));
CREATE POLICY "Project members can view docs" ON public.pm_knowledge_documents AS PERMISSIVE FOR SELECT TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Members can manage milestones" ON public.pm_milestones AS PERMISSIVE FOR ALL TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Members can view milestones" ON public.pm_milestones AS PERMISSIVE FOR SELECT TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Members can view project members" ON public.pm_project_members AS PERMISSIVE FOR SELECT TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Project owner can manage members" ON public.pm_project_members AS PERMISSIVE FOR ALL TO public USING (((EXISTS ( SELECT 1
   FROM pm_projects
  WHERE ((pm_projects.id = pm_project_members.project_id) AND (pm_projects.created_by = auth.uid())))) OR is_system_admin(auth.uid())));
CREATE POLICY "Project members can delete resources" ON public.pm_project_resources AS PERMISSIVE FOR DELETE TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Project members can insert resources" ON public.pm_project_resources AS PERMISSIVE FOR INSERT TO public WITH CHECK (pm_is_project_member(project_id));
CREATE POLICY "Project members can update resources" ON public.pm_project_resources AS PERMISSIVE FOR UPDATE TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Project members can view resources" ON public.pm_project_resources AS PERMISSIVE FOR SELECT TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Authenticated users can create projects" ON public.pm_projects AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "Members can view projects" ON public.pm_projects AS PERMISSIVE FOR SELECT TO public USING (pm_is_project_member(id));
CREATE POLICY "Project owner/admin can delete" ON public.pm_projects AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = created_by) OR is_system_admin(auth.uid())));
CREATE POLICY "Project owner/admin can update" ON public.pm_projects AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = created_by) OR is_system_admin(auth.uid())));
CREATE POLICY "Members can manage risks" ON public.pm_risks AS PERMISSIVE FOR ALL TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Members can view risks" ON public.pm_risks AS PERMISSIVE FOR SELECT TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Users can create sections" ON public.pm_sections AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can delete sections" ON public.pm_sections AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Users can update sections" ON public.pm_sections AS PERMISSIVE FOR UPDATE TO public USING (true);
CREATE POLICY "Users can view sections of their projects" ON public.pm_sections AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Members can manage sprints" ON public.pm_sprints AS PERMISSIVE FOR ALL TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Members can view sprints" ON public.pm_sprints AS PERMISSIVE FOR SELECT TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Project members can insert support" ON public.pm_support_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK ((pm_is_project_member(project_id) AND (auth.uid() = requested_by)));
CREATE POLICY "Project members can view support" ON public.pm_support_requests AS PERMISSIVE FOR SELECT TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Requester or admin can delete support" ON public.pm_support_requests AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = requested_by) OR is_system_admin(auth.uid())));
CREATE POLICY "Requester or admin can update support" ON public.pm_support_requests AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = requested_by) OR is_system_admin(auth.uid())));
CREATE POLICY "Project members can delete attachments" ON public.pm_task_attachments AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM pm_tasks t
  WHERE ((t.id = pm_task_attachments.task_id) AND pm_is_project_member(t.project_id)))));
CREATE POLICY "Project members can insert attachments" ON public.pm_task_attachments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM pm_tasks t
  WHERE ((t.id = pm_task_attachments.task_id) AND pm_is_project_member(t.project_id)))));
CREATE POLICY "Project members can view attachments" ON public.pm_task_attachments AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM pm_tasks t
  WHERE ((t.id = pm_task_attachments.task_id) AND pm_is_project_member(t.project_id)))));
CREATE POLICY "Project members can add task collaborators" ON public.pm_task_collaborators AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM pm_tasks t
  WHERE ((t.id = pm_task_collaborators.task_id) AND pm_is_project_member(t.project_id)))));
CREATE POLICY "Project members can remove task collaborators" ON public.pm_task_collaborators AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM pm_tasks t
  WHERE ((t.id = pm_task_collaborators.task_id) AND pm_is_project_member(t.project_id)))));
CREATE POLICY "Project members can view task collaborators" ON public.pm_task_collaborators AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM pm_tasks t
  WHERE ((t.id = pm_task_collaborators.task_id) AND pm_is_project_member(t.project_id)))));
CREATE POLICY "Members can post comments" ON public.pm_task_comments AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM pm_tasks
  WHERE ((pm_tasks.id = pm_task_comments.task_id) AND pm_is_project_member(pm_tasks.project_id))))));
CREATE POLICY "Members can view comments" ON public.pm_task_comments AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM pm_tasks
  WHERE ((pm_tasks.id = pm_task_comments.task_id) AND pm_is_project_member(pm_tasks.project_id)))));
CREATE POLICY "Users can delete own comments" ON public.pm_task_comments AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can edit own comments" ON public.pm_task_comments AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Members can manage dependencies" ON public.pm_task_dependencies AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM pm_tasks
  WHERE ((pm_tasks.id = pm_task_dependencies.task_id) AND pm_is_project_member(pm_tasks.project_id)))));
CREATE POLICY "Members can view dependencies" ON public.pm_task_dependencies AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM pm_tasks
  WHERE ((pm_tasks.id = pm_task_dependencies.task_id) AND pm_is_project_member(pm_tasks.project_id)))));
CREATE POLICY "Authenticated can create templates" ON public.pm_task_templates AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "Authenticated can view templates" ON public.pm_task_templates AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Creator/admin can manage templates" ON public.pm_task_templates AS PERMISSIVE FOR ALL TO public USING (((auth.uid() = created_by) OR is_system_admin(auth.uid())));
CREATE POLICY "Members can create tasks" ON public.pm_tasks AS PERMISSIVE FOR INSERT TO public WITH CHECK ((pm_is_project_member(project_id) AND (auth.uid() = created_by)));
CREATE POLICY "Members can update tasks" ON public.pm_tasks AS PERMISSIVE FOR UPDATE TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Members can view tasks" ON public.pm_tasks AS PERMISSIVE FOR SELECT TO public USING (pm_is_project_member(project_id));
CREATE POLICY "Task creator/admin can delete" ON public.pm_tasks AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = created_by) OR is_system_admin(auth.uid())));
CREATE POLICY "Manage template attachments" ON public.pm_template_attachments AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "View template attachments" ON public.pm_template_attachments AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Manage template dependencies" ON public.pm_template_dependencies AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "View template dependencies" ON public.pm_template_dependencies AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Manage template sections" ON public.pm_template_sections AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "View template sections" ON public.pm_template_sections AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Manage template tasks" ON public.pm_template_tasks AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "View template tasks" ON public.pm_template_tasks AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can create templates" ON public.pm_templates AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "Authenticated users can view templates" ON public.pm_templates AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Creator can delete templates" ON public.pm_templates AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = created_by));
CREATE POLICY "Creator can update templates" ON public.pm_templates AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = created_by));
CREATE POLICY "Users can delete own logs" ON public.pm_time_logs AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can log time" ON public.pm_time_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND pm_is_project_member(project_id)));
CREATE POLICY "Users can update own logs" ON public.pm_time_logs AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users see own logs, project members see all" ON public.pm_time_logs AS PERMISSIVE FOR SELECT TO public USING (((user_id = auth.uid()) OR pm_is_project_member(project_id)));
CREATE POLICY pos_customers_delete_own ON public.pos_customers AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY pos_customers_insert_own ON public.pos_customers AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY pos_customers_select_own ON public.pos_customers AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY pos_customers_update_own ON public.pos_customers AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Admin can manage price book entries" ON public.price_book_entries AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow anon read price_book_entries" ON public.price_book_entries AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can view price book entries" ON public.price_book_entries AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage price books" ON public.price_books AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow anon read price_books" ON public.price_books AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can view price books" ON public.price_books AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage primary_invoices" ON public.primary_invoices AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete order items" ON public.primary_order_items AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert order items" ON public.primary_order_items AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM primary_orders po
  WHERE (po.id = primary_order_items.order_id))));
CREATE POLICY "Users can update order items" ON public.primary_order_items AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM primary_orders po
  WHERE (po.id = primary_order_items.order_id))));
CREATE POLICY "Users can view order items" ON public.primary_order_items AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM primary_orders po
  WHERE (po.id = primary_order_items.order_id))));
CREATE POLICY "Authenticated users can manage primary_order_schemes" ON public.primary_order_schemes AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view order status history" ON public.primary_order_status_history AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete orders" ON public.primary_orders AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY po_admin_all ON public.primary_orders AS PERMISSIVE FOR ALL TO authenticated USING (( SELECT is_system_admin(auth.uid()) AS is_system_admin)) WITH CHECK (( SELECT is_system_admin(auth.uid()) AS is_system_admin));
CREATE POLICY po_dist_insert ON public.primary_orders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((get_distributor_id_for_auth_user() IS NOT NULL) AND (distributor_id = get_distributor_id_for_auth_user()) AND (source_distributor_id = get_distributor_id_for_auth_user())));
CREATE POLICY po_dist_select ON public.primary_orders AS PERMISSIVE FOR SELECT TO authenticated USING (((get_distributor_id_for_auth_user() IS NOT NULL) AND ((source_distributor_id = get_distributor_id_for_auth_user()) OR (target_distributor_id = get_distributor_id_for_auth_user()) OR ((EXISTS ( SELECT 1
   FROM distributors
  WHERE ((distributors.id = primary_orders.source_distributor_id) AND (distributors.parent_id = get_distributor_id_for_auth_user())))) AND ((target_distributor_id IS NULL) OR (target_distributor_id = get_distributor_id_for_auth_user()))))));
CREATE POLICY po_dist_update ON public.primary_orders AS PERMISSIVE FOR UPDATE TO authenticated USING (((get_distributor_id_for_auth_user() IS NOT NULL) AND (source_distributor_id = get_distributor_id_for_auth_user()))) WITH CHECK (((get_distributor_id_for_auth_user() IS NOT NULL) AND (distributor_id = get_distributor_id_for_auth_user()) AND (source_distributor_id = get_distributor_id_for_auth_user())));
CREATE POLICY po_staff_select ON public.primary_orders AS PERMISSIVE FOR SELECT TO authenticated USING (((( SELECT get_distributor_id_for_auth_user() AS get_distributor_id_for_auth_user) IS NULL) AND (NOT ( SELECT is_system_admin(auth.uid()) AS is_system_admin))));
CREATE POLICY primary_orders_staff_select ON public.primary_orders AS PERMISSIVE FOR SELECT TO authenticated USING ((get_distributor_id_for_auth_user() IS NULL));
CREATE POLICY primary_orders_staff_update ON public.primary_orders AS PERMISSIVE FOR UPDATE TO authenticated USING ((get_distributor_id_for_auth_user() IS NULL)) WITH CHECK ((get_distributor_id_for_auth_user() IS NULL));
CREATE POLICY "Authenticated users can manage primary_return_items" ON public.primary_return_items AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage primary_return_notes" ON public.primary_return_notes AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage primary_shipments" ON public.primary_shipments AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage product categories" ON public.product_categories AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow anon read product_categories for portal" ON public.product_categories AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Product categories are viewable by authenticated users" ON public.product_categories AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY price_list_admin_delete ON public.product_price_list AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY price_list_admin_insert ON public.product_price_list AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY price_list_admin_update ON public.product_price_list AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY price_list_read_authenticated ON public.product_price_list AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage product schemes" ON public.product_schemes AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow anon read product_schemes for portal" ON public.product_schemes AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Product schemes are viewable by authenticated users" ON public.product_schemes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "product_uom_mapping admin write" ON public.product_uom_mapping AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "product_uom_mapping read authenticated" ON public.product_uom_mapping AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage product variants" ON public.product_variants AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow anon read product_variants for portal" ON public.product_variants AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Product variants are viewable by authenticated users" ON public.product_variants AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage products" ON public.products AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow anon read products for portal" ON public.products AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Products are viewable by authenticated users" ON public.products AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can create their own attachments" ON public.profile_attachments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own attachments" ON public.profile_attachments AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own attachments" ON public.profile_attachments AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own attachments" ON public.profile_attachments AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Only admins can manage permissions" ON public.profile_object_permissions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view permissions for their profile" ON public.profile_object_permissions AS PERMISSIVE FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.profile_id = profile_object_permissions.profile_id)))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins can update user status" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view profile names" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "System admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (is_system_admin(auth.uid()));
CREATE POLICY "Users can insert their own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update only their own profile non-sensitive fields" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update own non-sensitive profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update their own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can view only their own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
CREATE POLICY "Users can view their own profile with logging" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (can_view_profile(id));
CREATE POLICY "Admins can view all execution logs" ON public.push_content_execution_log AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert execution logs" ON public.push_content_execution_log AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can view their own execution logs" ON public.push_content_execution_log AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "System can create push content posts" ON public.push_content_posts AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view their own push content posts" ON public.push_content_posts AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage push content templates" ON public.push_content_templates AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view active templates" ON public.push_content_templates AS PERMISSIVE FOR SELECT TO public USING (((is_active = true) AND (auth.uid() IS NOT NULL)));
CREATE POLICY "Users can insert their own feedback" ON public.recommendation_feedback AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own feedback" ON public.recommendation_feedback AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own feedback" ON public.recommendation_feedback AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own recommendations" ON public.recommendations AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own recommendations" ON public.recommendations AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own recommendations" ON public.recommendations AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "System can insert into recycle bin" ON public.recycle_bin AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can delete their items from bin" ON public.recycle_bin AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = deleted_by) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can view their deleted items" ON public.recycle_bin AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = deleted_by) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins can manage recycle bin config" ON public.recycle_bin_config AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view recycle bin config" ON public.recycle_bin_config AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can insert regularization policy" ON public.regularization_policy AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update regularization policy" ON public.regularization_policy AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read regularization policy" ON public.regularization_policy AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage all regularization requests" ON public.regularization_requests AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approvers can view regularizations in their approval chain" ON public.regularization_requests AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (approval_steps ast
     JOIN approval_requests ar ON ((ar.id = ast.approval_request_id)))
  WHERE ((ar.entity_id = regularization_requests.id) AND (ar.entity_type = 'regularization'::text) AND (ast.approver_id = auth.uid())))));
CREATE POLICY "Users can create their own regularization requests" ON public.regularization_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own pending requests" ON public.regularization_requests AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = user_id) AND (status = 'pending'::text)));
CREATE POLICY "Users can view their own regularization requests" ON public.regularization_requests AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage all credit scores" ON public.retailer_credit_scores AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view credit scores for their retailers" ON public.retailer_credit_scores AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM retailers
  WHERE ((retailers.id = retailer_credit_scores.retailer_id) AND (retailers.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "Authenticated users can read retailer_external_db" ON public.retailer_external_db AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update retailer_external_db" ON public.retailer_external_db AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read retailer_external_unsorted" ON public.retailer_external_unsorted AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create their own feedback records" ON public.retailer_feedback AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid())::text = (user_id)::text));
CREATE POLICY "Users can update their own feedback records" ON public.retailer_feedback AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid())::text = (user_id)::text));
CREATE POLICY "Users can view their own feedback records" ON public.retailer_feedback AS PERMISSIVE FOR SELECT TO public USING (((auth.uid())::text = (user_id)::text));
CREATE POLICY "Admins can manage all redemptions" ON public.retailer_gift_redemptions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can request redemptions" ON public.retailer_gift_redemptions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can view redemptions" ON public.retailer_gift_redemptions AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage all subscriptions" ON public.retailer_gift_subscriptions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can insert subscriptions" ON public.retailer_gift_subscriptions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can update subscriptions" ON public.retailer_gift_subscriptions AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can view subscriptions" ON public.retailer_gift_subscriptions AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage loyalty actions" ON public.retailer_loyalty_actions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "FSEs can view enabled actions" ON public.retailer_loyalty_actions AS PERMISSIVE FOR SELECT TO public USING (((is_enabled = true) AND (auth.uid() IS NOT NULL)));
CREATE POLICY "FSE users can insert their own feedback" ON public.retailer_loyalty_feedback AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = fse_user_id));
CREATE POLICY "FSE users can view their own feedback" ON public.retailer_loyalty_feedback AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = fse_user_id));
CREATE POLICY "Admins can manage loyalty gifts" ON public.retailer_loyalty_gifts AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view active gifts" ON public.retailer_loyalty_gifts AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage loyalty parameters" ON public.retailer_loyalty_parameters AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view parameters" ON public.retailer_loyalty_parameters AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage loyalty plans" ON public.retailer_loyalty_plans AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view active plans" ON public.retailer_loyalty_plans AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage all loyalty points" ON public.retailer_loyalty_points AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "FSEs can view points for their retailers" ON public.retailer_loyalty_points AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM retailers r
  WHERE ((r.id = retailer_loyalty_points.retailer_id) AND (r.user_id = auth.uid())))));
CREATE POLICY "System can insert loyalty points" ON public.retailer_loyalty_points AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage loyalty programs" ON public.retailer_loyalty_programs AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "FSEs can view active programs" ON public.retailer_loyalty_programs AS PERMISSIVE FOR SELECT TO public USING (((is_active = true) AND (auth.uid() IS NOT NULL)));
CREATE POLICY "Admins can manage all redemptions" ON public.retailer_loyalty_redemptions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "FSEs can create redemptions for their retailers" ON public.retailer_loyalty_redemptions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM retailers r
  WHERE ((r.id = retailer_loyalty_redemptions.retailer_id) AND (r.user_id = auth.uid())))));
CREATE POLICY "FSEs can view and create redemptions for their retailers" ON public.retailer_loyalty_redemptions AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM retailers r
  WHERE ((r.id = retailer_loyalty_redemptions.retailer_id) AND (r.user_id = auth.uid())))));
CREATE POLICY "Admins can manage reward redemptions" ON public.retailer_loyalty_reward_redemptions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view reward redemptions" ON public.retailer_loyalty_reward_redemptions AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage rewards" ON public.retailer_loyalty_rewards AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view rewards" ON public.retailer_loyalty_rewards AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage all tracking" ON public.retailer_loyalty_tracking AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "FSEs can view tracking for their retailers" ON public.retailer_loyalty_tracking AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM retailers r
  WHERE ((r.id = retailer_loyalty_tracking.retailer_id) AND (r.user_id = auth.uid())))));
CREATE POLICY "System can update tracking" ON public.retailer_loyalty_tracking AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "System can update tracking records" ON public.retailer_loyalty_tracking AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can view all visit logs" ON public.retailer_visit_logs AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view visit logs for reporting" ON public.retailer_visit_logs AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can create their own visit logs" ON public.retailer_visit_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own visit logs" ON public.retailer_visit_logs AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own visit logs" ON public.retailer_visit_logs AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can update retailer verification status" ON public.retailers AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all retailers" ON public.retailers AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow anon phone lookup for customer portal" ON public.retailers AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can view all retailers for analytics" ON public.retailers AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create their own retailers" ON public.retailers AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own retailers" ON public.retailers AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own retailers" ON public.retailers AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view retailers they have visits for" ON public.retailers AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM visits v
  WHERE ((v.retailer_id = retailers.id) AND (v.user_id = auth.uid())))));
CREATE POLICY "Users can view their own retailers" ON public.retailers AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage role definitions" ON public.role_definitions AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view role definitions" ON public.role_definitions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage role targets" ON public.role_targets AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view role targets" ON public.role_targets AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can create their own saved reports" ON public.saved_reports AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own saved reports" ON public.saved_reports AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own saved reports" ON public.saved_reports AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage scheme applicability" ON public.scheme_applicability AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Anyone can view scheme applicability" ON public.scheme_applicability AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage scheme policies" ON public.scheme_policy_config AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Anyone can view scheme policies" ON public.scheme_policy_config AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can view profiles" ON public.security_profiles AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Only admins can manage profiles" ON public.security_profiles AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can view access logs" ON public.sensitive_data_access_log AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert access logs" ON public.sensitive_data_access_log AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.sms_config AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can create their own comments" ON public.social_comments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own comments" ON public.social_comments AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own comments" ON public.social_comments AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view all comments" ON public.social_comments AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can create their own likes" ON public.social_likes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own likes" ON public.social_likes AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view all likes" ON public.social_likes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Anyone can view post attachments" ON public.social_post_attachments AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Users can create post attachments" ON public.social_post_attachments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM social_posts
  WHERE ((social_posts.id = social_post_attachments.post_id) AND (social_posts.user_id = auth.uid())))));
CREATE POLICY "Users can delete their post attachments" ON public.social_post_attachments AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM social_posts
  WHERE ((social_posts.id = social_post_attachments.post_id) AND (social_posts.user_id = auth.uid())))));
CREATE POLICY "Users can create their own posts" ON public.social_posts AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own posts" ON public.social_posts AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own posts" ON public.social_posts AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view all posts" ON public.social_posts AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Anyone can view reactions" ON public.social_reactions AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Users can add reactions" ON public.social_reactions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can remove their reactions" ON public.social_reactions AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all stock" ON public.stock AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own stock records" ON public.stock AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own stock records" ON public.stock AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own stock records" ON public.stock AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own stock records" ON public.stock AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can create their own stock cycle data" ON public.stock_cycle_data AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own stock cycle data" ON public.stock_cycle_data AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own stock cycle data" ON public.stock_cycle_data AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can delete stockist attachments" ON public.stockist_attachments AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert stockist attachments" ON public.stockist_attachments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update stockist attachments" ON public.stockist_attachments AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view stockist attachments" ON public.stockist_attachments AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete stockist contacts" ON public.stockist_contacts AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert stockist contacts" ON public.stockist_contacts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update stockist contacts" ON public.stockist_contacts AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view stockist contacts" ON public.stockist_contacts AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete stockist locations" ON public.stockist_locations AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert stockist locations" ON public.stockist_locations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update stockist locations" ON public.stockist_locations AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view stockist locations" ON public.stockist_locations AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage all support requests" ON public.support_requests AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own support requests" ON public.support_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own support requests" ON public.support_requests AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own support requests" ON public.support_requests AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "System can manage logs" ON public.target_actual_logs AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can manage breakdowns" ON public.target_breakdowns AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can read own breakdowns" ON public.target_breakdowns AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Admins can manage KPI definitions" ON public.target_kpi_definitions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view active KPIs" ON public.target_kpi_definitions AS PERMISSIVE FOR SELECT TO public USING (((is_active = true) AND (auth.uid() IS NOT NULL)));
CREATE POLICY "Authenticated users can manage metric definitions" ON public.target_metric_definitions AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read metric definitions" ON public.target_metric_definitions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage parameter definitions" ON public.target_parameter_definitions AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read parameter definitions" ON public.target_parameter_definitions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can delete target_plans" ON public.target_plans AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert target_plans" ON public.target_plans AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update target_plans" ON public.target_plans AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read target_plans" ON public.target_plans AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can delete target_policies" ON public.target_policies AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert target_policies" ON public.target_policies AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update target_policies" ON public.target_policies AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read target_policies" ON public.target_policies AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage target setup master" ON public.target_setup_master AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view target setup master" ON public.target_setup_master AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can delete target_types" ON public.target_types AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert target_types" ON public.target_types AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update target_types" ON public.target_types AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read target_types" ON public.target_types AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tax components" ON public.tax_components AS PERMISSIVE FOR ALL TO authenticated USING (is_system_admin(auth.uid())) WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Authenticated users can read tax components" ON public.tax_components AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tax masters" ON public.tax_masters AS PERMISSIVE FOR ALL TO authenticated USING (is_system_admin(auth.uid())) WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Authenticated users can read tax masters" ON public.tax_masters AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tax product map" ON public.tax_product_map AS PERMISSIVE FOR ALL TO authenticated USING (is_system_admin(auth.uid())) WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Authenticated users can read tax product map" ON public.tax_product_map AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin full access on team_expense_config" ON public.team_expense_config AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read team config" ON public.team_expense_config AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can delete territories" ON public.territories AS PERMISSIVE FOR DELETE TO authenticated USING (is_system_admin(auth.uid()));
CREATE POLICY "Admins can insert territories" ON public.territories AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Admins can update territories" ON public.territories AS PERMISSIVE FOR UPDATE TO authenticated USING (is_system_admin(auth.uid())) WITH CHECK (is_system_admin(auth.uid()));
CREATE POLICY "Users can view territories" ON public.territories AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can manage assignment history" ON public.territory_assignment_history AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view assignment history" ON public.territory_assignment_history AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view unhandled queries" ON public.unhandled_queries AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can insert unhandled queries" ON public.unhandled_queries AS PERMISSIVE FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY uom_category_admin_write ON public.uom_category AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY uom_category_read_all ON public.uom_category AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "uom_master admin write" ON public.uom_master AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "uom_master read authenticated" ON public.uom_master AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Approvers can update their approvals" ON public.user_approvals AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = approver_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "System can create approvals" ON public.user_approvals AS PERMISSIVE FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own approvals" ON public.user_approvals AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR (auth.uid() = approver_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can manage their own autonomy settings" ON public.user_autonomy_settings AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));
CREATE POLICY "System can award badges" ON public.user_badges AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view their own badges" ON public.user_badges AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own distributor targets" ON public.user_business_plan_distributors AS PERMISSIVE FOR DELETE TO public USING ((business_plan_id IN ( SELECT user_business_plans.id
   FROM user_business_plans
  WHERE (user_business_plans.user_id = auth.uid()))));
CREATE POLICY "Users can insert their own distributor targets" ON public.user_business_plan_distributors AS PERMISSIVE FOR INSERT TO public WITH CHECK ((business_plan_id IN ( SELECT user_business_plans.id
   FROM user_business_plans
  WHERE (user_business_plans.user_id = auth.uid()))));
CREATE POLICY "Users can update their own distributor targets" ON public.user_business_plan_distributors AS PERMISSIVE FOR UPDATE TO public USING ((business_plan_id IN ( SELECT user_business_plans.id
   FROM user_business_plans
  WHERE (user_business_plans.user_id = auth.uid()))));
CREATE POLICY "Users can view their own distributor targets" ON public.user_business_plan_distributors AS PERMISSIVE FOR SELECT TO public USING ((business_plan_id IN ( SELECT user_business_plans.id
   FROM user_business_plans
  WHERE (user_business_plans.user_id = auth.uid()))));
CREATE POLICY "Authenticated users can view business plan month products for r" ON public.user_business_plan_month_products AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can delete their own user_business_plan_month_products" ON public.user_business_plan_month_products AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans ubp
  WHERE ((ubp.id = user_business_plan_month_products.business_plan_id) AND (ubp.user_id = auth.uid())))));
CREATE POLICY "Users can insert their own user_business_plan_month_products" ON public.user_business_plan_month_products AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM user_business_plans ubp
  WHERE ((ubp.id = user_business_plan_month_products.business_plan_id) AND (ubp.user_id = auth.uid())))));
CREATE POLICY "Users can update their own user_business_plan_month_products" ON public.user_business_plan_month_products AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans ubp
  WHERE ((ubp.id = user_business_plan_month_products.business_plan_id) AND (ubp.user_id = auth.uid())))));
CREATE POLICY "Users can view their own user_business_plan_month_products" ON public.user_business_plan_month_products AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans ubp
  WHERE ((ubp.id = user_business_plan_month_products.business_plan_id) AND (ubp.user_id = auth.uid())))));
CREATE POLICY "Authenticated users can view business plan months for reporting" ON public.user_business_plan_months AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can create their own plan months" ON public.user_business_plan_months AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM user_business_plans bp
  WHERE ((bp.id = user_business_plan_months.business_plan_id) AND (bp.user_id = auth.uid())))));
CREATE POLICY "Users can delete their own plan months" ON public.user_business_plan_months AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans bp
  WHERE ((bp.id = user_business_plan_months.business_plan_id) AND (bp.user_id = auth.uid())))));
CREATE POLICY "Users can update their own plan months" ON public.user_business_plan_months AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans bp
  WHERE ((bp.id = user_business_plan_months.business_plan_id) AND (bp.user_id = auth.uid())))));
CREATE POLICY "Users can view their own plan months" ON public.user_business_plan_months AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans bp
  WHERE ((bp.id = user_business_plan_months.business_plan_id) AND (bp.user_id = auth.uid())))));
CREATE POLICY "Users can create their own plan products" ON public.user_business_plan_products AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM user_business_plans bp
  WHERE ((bp.id = user_business_plan_products.business_plan_id) AND (bp.user_id = auth.uid())))));
CREATE POLICY "Users can delete their own plan products" ON public.user_business_plan_products AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans bp
  WHERE ((bp.id = user_business_plan_products.business_plan_id) AND (bp.user_id = auth.uid())))));
CREATE POLICY "Users can update their own plan products" ON public.user_business_plan_products AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans bp
  WHERE ((bp.id = user_business_plan_products.business_plan_id) AND (bp.user_id = auth.uid())))));
CREATE POLICY "Users can view their own plan products" ON public.user_business_plan_products AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans bp
  WHERE ((bp.id = user_business_plan_products.business_plan_id) AND (bp.user_id = auth.uid())))));
CREATE POLICY "Users can create their own plan retailers" ON public.user_business_plan_retailers AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM user_business_plans bp
  WHERE ((bp.id = user_business_plan_retailers.business_plan_id) AND (bp.user_id = auth.uid())))));
CREATE POLICY "Users can delete their own plan retailers" ON public.user_business_plan_retailers AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans bp
  WHERE ((bp.id = user_business_plan_retailers.business_plan_id) AND (bp.user_id = auth.uid())))));
CREATE POLICY "Users can update their own plan retailers" ON public.user_business_plan_retailers AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans bp
  WHERE ((bp.id = user_business_plan_retailers.business_plan_id) AND (bp.user_id = auth.uid())))));
CREATE POLICY "Users can view their own plan retailers" ON public.user_business_plan_retailers AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans bp
  WHERE ((bp.id = user_business_plan_retailers.business_plan_id) AND (bp.user_id = auth.uid())))));
CREATE POLICY "Users can create their own territory targets" ON public.user_business_plan_territories AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM user_business_plans ubp
  WHERE ((ubp.id = user_business_plan_territories.business_plan_id) AND (ubp.user_id = auth.uid())))));
CREATE POLICY "Users can delete their own territory targets" ON public.user_business_plan_territories AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans ubp
  WHERE ((ubp.id = user_business_plan_territories.business_plan_id) AND (ubp.user_id = auth.uid())))));
CREATE POLICY "Users can update their own territory targets" ON public.user_business_plan_territories AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans ubp
  WHERE ((ubp.id = user_business_plan_territories.business_plan_id) AND (ubp.user_id = auth.uid())))));
CREATE POLICY "Users can view their own territory targets" ON public.user_business_plan_territories AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans ubp
  WHERE ((ubp.id = user_business_plan_territories.business_plan_id) AND (ubp.user_id = auth.uid())))));
CREATE POLICY "Users can create their own territory beat targets" ON public.user_business_plan_territory_beats AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM user_business_plans ubp
  WHERE ((ubp.id = user_business_plan_territory_beats.business_plan_id) AND (ubp.user_id = auth.uid())))));
CREATE POLICY "Users can delete their own territory beat targets" ON public.user_business_plan_territory_beats AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans ubp
  WHERE ((ubp.id = user_business_plan_territory_beats.business_plan_id) AND (ubp.user_id = auth.uid())))));
CREATE POLICY "Users can update their own territory beat targets" ON public.user_business_plan_territory_beats AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans ubp
  WHERE ((ubp.id = user_business_plan_territory_beats.business_plan_id) AND (ubp.user_id = auth.uid())))));
CREATE POLICY "Users can view their own territory beat targets" ON public.user_business_plan_territory_beats AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_business_plans ubp
  WHERE ((ubp.id = user_business_plan_territory_beats.business_plan_id) AND (ubp.user_id = auth.uid())))));
CREATE POLICY "Admins can create business plans for any user" ON public.user_business_plans AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin_or_manager());
CREATE POLICY "Admins can delete any business plans" ON public.user_business_plans AS PERMISSIVE FOR DELETE TO public USING (is_admin_or_manager());
CREATE POLICY "Admins can update any business plans" ON public.user_business_plans AS PERMISSIVE FOR UPDATE TO public USING (is_admin_or_manager());
CREATE POLICY "Admins can view all business plans" ON public.user_business_plans AS PERMISSIVE FOR SELECT TO public USING (is_admin_or_manager());
CREATE POLICY "Authenticated users can view business plans for reporting" ON public.user_business_plans AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can create their own business plans" ON public.user_business_plans AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own business plans" ON public.user_business_plans AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own business plans" ON public.user_business_plans AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own business plans" ON public.user_business_plans AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all competency scores" ON public.user_competency_monthly_scores AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can view subordinate scores via scorecard" ON public.user_competency_monthly_scores AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_monthly_scorecards sc
  WHERE ((sc.user_id = user_competency_monthly_scores.user_id) AND (sc.manager_id = auth.uid())))));
CREATE POLICY "Service can insert competency scores" ON public.user_competency_monthly_scores AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Service can update competency scores" ON public.user_competency_monthly_scores AS PERMISSIVE FOR UPDATE TO public USING (true);
CREATE POLICY "Users can view their own competency scores" ON public.user_competency_monthly_scores AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all data usage" ON public.user_data_usage AS PERMISSIVE FOR SELECT TO authenticated USING (is_system_admin(auth.uid()));
CREATE POLICY "Users can insert own data usage" ON public.user_data_usage AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Admin full access on user_expense_config" ON public.user_expense_config AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own expense config" ON public.user_expense_config AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admin invitation creation" ON public.user_invitations AS PERMISSIVE FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin invitation management" ON public.user_invitations AS PERMISSIVE FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage invitations" ON public.user_invitations AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Secure invitation access" ON public.user_invitations AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage user leave policies" ON public.user_leave_policy AS PERMISSIVE FOR ALL TO public USING (is_admin_or_manager());
CREATE POLICY "Users can read their own leave policy" ON public.user_leave_policy AS PERMISSIVE FOR SELECT TO public USING (((user_id = auth.uid()) OR is_admin_or_manager()));
CREATE POLICY "Admins can view all scorecards" ON public.user_monthly_scorecards AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can view subordinate scorecards" ON public.user_monthly_scorecards AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = manager_id));
CREATE POLICY "Service can insert scorecards" ON public.user_monthly_scorecards AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Service can update scorecards" ON public.user_monthly_scorecards AS PERMISSIVE FOR UPDATE TO public USING (true);
CREATE POLICY "Users can view their own scorecards" ON public.user_monthly_scorecards AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage user permissions" ON public.user_object_permissions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own permissions" ON public.user_object_permissions AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all onboarding progress" ON public.user_onboarding_progress AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage their own onboarding progress" ON public.user_onboarding_progress AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own onboarding progress" ON public.user_onboarding_progress AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all page views" ON public.user_page_views AS PERMISSIVE FOR SELECT TO authenticated USING (is_system_admin(auth.uid()));
CREATE POLICY "Users can insert own page views" ON public.user_page_views AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own page views" ON public.user_page_views AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all performance scores" ON public.user_performance_scores AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can view subordinate scores" ON public.user_performance_scores AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT get_subordinate_users.subordinate_user_id
   FROM get_subordinate_users(auth.uid()) get_subordinate_users(subordinate_user_id))));
CREATE POLICY "System can manage performance scores" ON public.user_performance_scores AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view their own scores" ON public.user_performance_scores AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage all period allocations" ON public.user_period_allocations AS PERMISSIVE FOR ALL TO public USING (is_system_admin(auth.uid()));
CREATE POLICY "Users can view their period allocations" ON public.user_period_allocations AS PERMISSIVE FOR SELECT TO public USING ((business_plan_id IN ( SELECT user_business_plans.id
   FROM user_business_plans
  WHERE (user_business_plans.user_id = auth.uid()))));
CREATE POLICY "Admins can view all user targets" ON public.user_period_targets AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can view subordinate targets" ON public.user_period_targets AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT get_subordinate_users.subordinate_user_id
   FROM get_subordinate_users(auth.uid()) get_subordinate_users(subordinate_user_id))));
CREATE POLICY "System can manage user targets" ON public.user_period_targets AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view their own targets" ON public.user_period_targets AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Only admins can manage profile assignments" ON public.user_profiles AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view profile assignments" ON public.user_profiles AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR is_system_admin(auth.uid())));
CREATE POLICY "Admins can view all subscriptions" ON public.user_push_content_subscriptions AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage their own subscriptions" ON public.user_push_content_subscriptions AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage roles" ON public.user_roles AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all sessions" ON public.user_sessions AS PERMISSIVE FOR SELECT TO authenticated USING (is_system_admin(auth.uid()));
CREATE POLICY "Users can insert own sessions" ON public.user_sessions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own sessions" ON public.user_sessions AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own sessions" ON public.user_sessions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage van beat assignments" ON public.van_beat_assignments AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view van beat assignments" ON public.van_beat_assignments AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "System can manage van closing stock" ON public.van_closing_stock AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view van closing stock" ON public.van_closing_stock AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "System can manage van closing stock items" ON public.van_closing_stock_items AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view van closing stock items" ON public.van_closing_stock_items AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can manage their van inward GRN" ON public.van_inward_grn AS PERMISSIVE FOR ALL TO public USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can manage van inward GRN items" ON public.van_inward_grn_items AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM van_inward_grn
  WHERE ((van_inward_grn.id = van_inward_grn_items.grn_id) AND ((van_inward_grn.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))));
CREATE POLICY "Users can view van inward GRN items" ON public.van_inward_grn_items AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM van_inward_grn
  WHERE ((van_inward_grn.id = van_inward_grn_items.grn_id) AND ((van_inward_grn.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))));
CREATE POLICY "System can manage van live inventory" ON public.van_live_inventory AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view van live inventory" ON public.van_live_inventory AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "System can manage van order fulfillment" ON public.van_order_fulfillment AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view van order fulfillment" ON public.van_order_fulfillment AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = van_order_fulfillment.order_id) AND ((orders.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))));
CREATE POLICY "Users can manage their van return GRN" ON public.van_return_grn AS PERMISSIVE FOR ALL TO public USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can manage van return GRN items" ON public.van_return_grn_items AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM van_return_grn
  WHERE ((van_return_grn.id = van_return_grn_items.return_grn_id) AND ((van_return_grn.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))));
CREATE POLICY "Users can view van return GRN items" ON public.van_return_grn_items AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM van_return_grn
  WHERE ((van_return_grn.id = van_return_grn_items.return_grn_id) AND ((van_return_grn.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))));
CREATE POLICY "Admins can manage van sales settings" ON public.van_sales_settings AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view van sales settings" ON public.van_sales_settings AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Admins can view all van stock" ON public.van_stock AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own van stock" ON public.van_stock AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own van stock" ON public.van_stock AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own van stock" ON public.van_stock AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all adjustments" ON public.van_stock_adjustments AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create adjustments for their van stock" ON public.van_stock_adjustments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM van_stock vs
  WHERE ((vs.id = van_stock_adjustments.van_stock_id) AND (vs.user_id = auth.uid())))));
CREATE POLICY "Users can view their own adjustments" ON public.van_stock_adjustments AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM van_stock vs
  WHERE ((vs.id = van_stock_adjustments.van_stock_id) AND (vs.user_id = auth.uid())))));
CREATE POLICY "Admins can view all van stock items" ON public.van_stock_items AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage van stock items for their van stock" ON public.van_stock_items AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM van_stock vs
  WHERE ((vs.id = van_stock_items.van_stock_id) AND (vs.user_id = auth.uid())))));
CREATE POLICY "Authenticated users can view opening edits" ON public.van_stock_opening_edits AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can delete their own opening edits" ON public.van_stock_opening_edits AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own opening edits" ON public.van_stock_opening_edits AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own opening edits" ON public.van_stock_opening_edits AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can manage vans" ON public.vans AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view active vans" ON public.vans AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() IS NOT NULL) AND (is_active = true)));
CREATE POLICY "Admins can manage all vendor data" ON public.vendors AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can delete vendors" ON public.vendors AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vendors" ON public.vendors AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vendors" ON public.vendors AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view vendors" ON public.vendors AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create their own AI insights" ON public.visit_ai_insights AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own AI insights" ON public.visit_ai_insights AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all visits" ON public.visits AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow anon insert visits for portal" ON public.visits AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select visits for portal" ON public.visits AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can view visits for reporting" ON public.visits AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can create their own visits" ON public.visits AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own visits" ON public.visits AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own visits" ON public.visits AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can manage warehouses" ON public.warehouses AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Parent distributors can view child warehouses" ON public.warehouses AS PERMISSIVE FOR SELECT TO public USING (can_view_distributor(distributor_id));
CREATE POLICY "Admins can manage week off config" ON public.week_off_config AS PERMISSIVE FOR ALL TO public USING (is_admin_or_manager());
CREATE POLICY "Anyone can read week off config" ON public.week_off_config AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert WhatsApp config" ON public.whatsapp_config AS PERMISSIVE FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update WhatsApp config" ON public.whatsapp_config AS PERMISSIVE FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view WhatsApp config" ON public.whatsapp_config AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role full access on whatsapp_sessions" ON public.whatsapp_sessions AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage their own work experiences" ON public.work_experiences AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view all work experiences" ON public.work_experiences AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage workflow_steps" ON public.workflow_steps AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone authenticated can read workflow_steps" ON public.workflow_steps AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage working days config" ON public.working_days_config AS PERMISSIVE FOR ALL TO public USING (is_admin_or_manager());
CREATE POLICY "Anyone can read working days config" ON public.working_days_config AS PERMISSIVE FOR SELECT TO public USING (true);

`;
