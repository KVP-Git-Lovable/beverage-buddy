
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
