export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accrual_config: {
        Row: {
          created_at: string
          credit_day: number
          divisor: number
          frequency: string
          id: string
          leave_type_id: string
          prorate_joining: boolean
          round_mode: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_day?: number
          divisor?: number
          frequency?: string
          id?: string
          leave_type_id: string
          prorate_joining?: boolean
          round_mode?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_day?: number
          divisor?: number
          frequency?: string
          id?: string
          leave_type_id?: string
          prorate_joining?: boolean
          round_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          activity_date: string
          activity_name: string | null
          activity_type: string
          completed_at: string | null
          created_at: string
          duration_type: string
          end_time: string | null
          from_date: string | null
          half_day_type: string | null
          id: string
          location: string | null
          remarks: string | null
          retailer_id: string | null
          retailer_name: string | null
          start_time: string | null
          status: string
          to_date: string | null
          total_days: number | null
          user_id: string
          visit_id: string | null
        }
        Insert: {
          activity_date?: string
          activity_name?: string | null
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          duration_type?: string
          end_time?: string | null
          from_date?: string | null
          half_day_type?: string | null
          id?: string
          location?: string | null
          remarks?: string | null
          retailer_id?: string | null
          retailer_name?: string | null
          start_time?: string | null
          status?: string
          to_date?: string | null
          total_days?: number | null
          user_id: string
          visit_id?: string | null
        }
        Update: {
          activity_date?: string
          activity_name?: string | null
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          duration_type?: string
          end_time?: string | null
          from_date?: string | null
          half_day_type?: string | null
          id?: string
          location?: string | null
          remarks?: string | null
          retailer_id?: string | null
          retailer_name?: string | null
          start_time?: string | null
          status?: string
          to_date?: string | null
          total_days?: number | null
          user_id?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      additional_expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bill_url: string | null
          category: string
          created_at: string
          custom_category: string | null
          description: string | null
          expense_date: string
          id: string
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bill_url?: string | null
          category: string
          created_at?: string
          custom_category?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bill_url?: string | null
          category?: string
          created_at?: string
          custom_category?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_autonomous_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          can_undo: boolean | null
          created_at: string
          executed_at: string | null
          id: string
          status: string
          undo_until: string | null
          undone_at: string | null
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          can_undo?: boolean | null
          created_at?: string
          executed_at?: string | null
          id?: string
          status?: string
          undo_until?: string | null
          undone_at?: string | null
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          can_undo?: boolean | null
          created_at?: string
          executed_at?: string | null
          id?: string
          status?: string
          undo_until?: string | null
          undone_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_feature_feedback: {
        Row: {
          created_at: string | null
          feature: string
          feedback_type: string
          id: string
          retailer_id: string | null
          user_id: string | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string | null
          feature: string
          feedback_type: string
          id?: string
          retailer_id?: string | null
          user_id?: string | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string | null
          feature?: string
          feedback_type?: string
          id?: string
          retailer_id?: string | null
          user_id?: string | null
          visit_id?: string | null
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          action_data: Json | null
          action_type: string | null
          category: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          insight_type: string
          is_actioned: boolean | null
          is_dismissed: boolean | null
          is_read: boolean | null
          priority: string
          reference_id: string | null
          reference_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type?: string | null
          category: string
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          insight_type: string
          is_actioned?: boolean | null
          is_dismissed?: boolean | null
          is_read?: boolean | null
          priority?: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string | null
          category?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_actioned?: boolean | null
          is_dismissed?: boolean | null
          is_read?: boolean | null
          priority?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_scheme_suggestions: {
        Row: {
          admin_modifications: Json | null
          analysis_type: string
          confidence_score: number | null
          created_at: string | null
          created_scheme_id: string | null
          data_signals: Json | null
          expected_benefit: string | null
          expires_at: string | null
          id: string
          reasoning: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          suggested_buy_quantity: number | null
          suggested_category_id: string | null
          suggested_condition_quantity: number | null
          suggested_description: string | null
          suggested_discount_amount: number | null
          suggested_discount_percentage: number | null
          suggested_end_date: string | null
          suggested_free_quantity: number | null
          suggested_min_order_value: number | null
          suggested_name: string
          suggested_product_id: string | null
          suggested_scheme_type: string
          suggested_start_date: string | null
          suggested_tier_data: Json | null
          target_ids: string[] | null
          target_names: string[] | null
          target_type: string
        }
        Insert: {
          admin_modifications?: Json | null
          analysis_type: string
          confidence_score?: number | null
          created_at?: string | null
          created_scheme_id?: string | null
          data_signals?: Json | null
          expected_benefit?: string | null
          expires_at?: string | null
          id?: string
          reasoning: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggested_buy_quantity?: number | null
          suggested_category_id?: string | null
          suggested_condition_quantity?: number | null
          suggested_description?: string | null
          suggested_discount_amount?: number | null
          suggested_discount_percentage?: number | null
          suggested_end_date?: string | null
          suggested_free_quantity?: number | null
          suggested_min_order_value?: number | null
          suggested_name: string
          suggested_product_id?: string | null
          suggested_scheme_type: string
          suggested_start_date?: string | null
          suggested_tier_data?: Json | null
          target_ids?: string[] | null
          target_names?: string[] | null
          target_type: string
        }
        Update: {
          admin_modifications?: Json | null
          analysis_type?: string
          confidence_score?: number | null
          created_at?: string | null
          created_scheme_id?: string | null
          data_signals?: Json | null
          expected_benefit?: string | null
          expires_at?: string | null
          id?: string
          reasoning?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggested_buy_quantity?: number | null
          suggested_category_id?: string | null
          suggested_condition_quantity?: number | null
          suggested_description?: string | null
          suggested_discount_amount?: number | null
          suggested_discount_percentage?: number | null
          suggested_end_date?: string | null
          suggested_free_quantity?: number | null
          suggested_min_order_value?: number | null
          suggested_name?: string
          suggested_product_id?: string | null
          suggested_scheme_type?: string
          suggested_start_date?: string | null
          suggested_tier_data?: Json | null
          target_ids?: string[] | null
          target_names?: string[] | null
          target_type?: string
        }
        Relationships: []
      }
      analytics_likes: {
        Row: {
          created_at: string
          id: string
          liked_at: string
          page_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked_at?: string
          page_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked_at?: string
          page_type?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_views: {
        Row: {
          created_at: string
          id: string
          user_id: string
          viewed_at: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          viewed_at?: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          viewed_at?: string
          visit_id?: string
        }
        Relationships: []
      }
      approval_audit_log: {
        Row: {
          action: string
          approval_request_id: string | null
          entity_id: string
          entity_type: string
          id: string
          level: number | null
          metadata: Json | null
          performed_by: string
          timestamp: string
        }
        Insert: {
          action: string
          approval_request_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          level?: number | null
          metadata?: Json | null
          performed_by: string
          timestamp?: string
        }
        Update: {
          action?: string
          approval_request_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          level?: number | null
          metadata?: Json | null
          performed_by?: string
          timestamp?: string
        }
        Relationships: []
      }
      approval_config: {
        Row: {
          approval_mode: string
          created_at: string
          entity_type: string
          final_approval_role: string | null
          id: string
          max_levels: number
          skip_levels: boolean
          updated_at: string
          use_full_hierarchy: boolean
        }
        Insert: {
          approval_mode?: string
          created_at?: string
          entity_type: string
          final_approval_role?: string | null
          id?: string
          max_levels?: number
          skip_levels?: boolean
          updated_at?: string
          use_full_hierarchy?: boolean
        }
        Update: {
          approval_mode?: string
          created_at?: string
          entity_type?: string
          final_approval_role?: string | null
          id?: string
          max_levels?: number
          skip_levels?: boolean
          updated_at?: string
          use_full_hierarchy?: boolean
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          created_at: string
          current_level: number
          entity_id: string
          entity_type: string
          final_approved_by: string | null
          id: string
          requester_id: string
          status: string
          total_levels: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          entity_id: string
          entity_type: string
          final_approved_by?: string | null
          id?: string
          requester_id: string
          status?: string
          total_levels?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_level?: number
          entity_id?: string
          entity_type?: string
          final_approved_by?: string | null
          id?: string
          requester_id?: string
          status?: string
          total_levels?: number
          updated_at?: string
        }
        Relationships: []
      }
      approval_steps: {
        Row: {
          action_taken_at: string | null
          approval_request_id: string
          approver_id: string
          created_at: string
          id: string
          level: number
          rejection_reason: string | null
          status: string
        }
        Insert: {
          action_taken_at?: string | null
          approval_request_id: string
          approver_id: string
          created_at?: string
          id?: string
          level: number
          rejection_reason?: string | null
          status?: string
        }
        Update: {
          action_taken_at?: string | null
          approval_request_id?: string
          approver_id?: string
          created_at?: string
          id?: string
          level?: number
          rejection_reason?: string | null
          status?: string
        }
        Relationships: []
      }
      approval_workflows: {
        Row: {
          approval_mode: string
          created_at: string
          entity_type: string
          id: string
          is_active: boolean
          is_default: boolean
          updated_at: string
          workflow_name: string
        }
        Insert: {
          approval_mode?: string
          created_at?: string
          entity_type?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
          workflow_name: string
        }
        Update: {
          approval_mode?: string
          created_at?: string
          entity_type?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
          workflow_name?: string
        }
        Relationships: []
      }
      approvers: {
        Row: {
          approver_level: number
          created_at: string
          department: string | null
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approver_level: number
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approver_level?: number
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      aspirations_and_preferences: {
        Row: {
          career_goal: string | null
          created_at: string | null
          dream_role: string | null
          favorite_activity: string | null
          five_year_vision: string | null
          id: string
          motivation_driver: string | null
          preferred_reward: string | null
          preferred_work_style: string | null
          team_preference: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          career_goal?: string | null
          created_at?: string | null
          dream_role?: string | null
          favorite_activity?: string | null
          five_year_vision?: string | null
          id?: string
          motivation_driver?: string | null
          preferred_reward?: string | null
          preferred_work_style?: string | null
          team_preference?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          career_goal?: string | null
          created_at?: string | null
          dream_role?: string | null
          favorite_activity?: string | null
          five_year_vision?: string | null
          id?: string
          motivation_driver?: string | null
          preferred_reward?: string | null
          preferred_work_style?: string | null
          team_preference?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in_address: string | null
          check_in_location: Json | null
          check_in_photo_url: string | null
          check_in_time: string | null
          check_out_address: string | null
          check_out_location: Json | null
          check_out_photo_url: string | null
          check_out_time: string | null
          created_at: string
          date: string
          face_match_confidence: number | null
          face_match_confidence_out: number | null
          face_verification_status: string | null
          face_verification_status_out: string | null
          id: string
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          manual_override_reason: string | null
          notes: string | null
          regularized_request_id: string | null
          status: string
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_address?: string | null
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_address?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          face_match_confidence?: number | null
          face_match_confidence_out?: number | null
          face_verification_status?: string | null
          face_verification_status_out?: string | null
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          manual_override_reason?: string | null
          notes?: string | null
          regularized_request_id?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_address?: string | null
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_address?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          face_match_confidence?: number | null
          face_match_confidence_out?: number | null
          face_verification_status?: string | null
          face_verification_status_out?: string | null
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          manual_override_reason?: string | null
          notes?: string | null
          regularized_request_id?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance_daily_admin_summary: {
        Row: {
          avg_hours: number | null
          created_at: string
          date: string
          id: string
          total_absent: number
          total_employees: number
          total_half_day: number
          total_hours_sum: number | null
          total_on_leave: number
          total_present: number
          updated_at: string
        }
        Insert: {
          avg_hours?: number | null
          created_at?: string
          date: string
          id?: string
          total_absent?: number
          total_employees?: number
          total_half_day?: number
          total_hours_sum?: number | null
          total_on_leave?: number
          total_present?: number
          updated_at?: string
        }
        Update: {
          avg_hours?: number | null
          created_at?: string
          date?: string
          id?: string
          total_absent?: number
          total_employees?: number
          total_half_day?: number
          total_hours_sum?: number | null
          total_on_leave?: number
          total_present?: number
          updated_at?: string
        }
        Relationships: []
      }
      attendance_user_monthly_summary: {
        Row: {
          absent_days: number
          avg_daily_hours: number | null
          created_at: string
          half_day_leave_days: number
          id: string
          leave_days: number
          lop_days: number | null
          month: number
          present_days: number
          regularized_days: number
          total_hours: number | null
          updated_at: string
          user_id: string
          working_days: number | null
          year: number
        }
        Insert: {
          absent_days?: number
          avg_daily_hours?: number | null
          created_at?: string
          half_day_leave_days?: number
          id?: string
          leave_days?: number
          lop_days?: number | null
          month: number
          present_days?: number
          regularized_days?: number
          total_hours?: number | null
          updated_at?: string
          user_id: string
          working_days?: number | null
          year: number
        }
        Update: {
          absent_days?: number
          avg_daily_hours?: number | null
          created_at?: string
          half_day_leave_days?: number
          id?: string
          leave_days?: number
          lop_days?: number | null
          month?: number
          present_days?: number
          regularized_days?: number
          total_hours?: number | null
          updated_at?: string
          user_id?: string
          working_days?: number | null
          year?: number
        }
        Relationships: []
      }
      auto_end_day_policy: {
        Row: {
          auto_close_time: string
          cancel_planned_visits: boolean
          close_in_progress_visits: boolean
          created_at: string
          id: string
          is_enabled: boolean
          last_activity_source: string
          mark_unproductive: boolean
          pre_warning_enabled: boolean
          pre_warning_minutes_before: number
          timezone: string
          updated_at: string
        }
        Insert: {
          auto_close_time?: string
          cancel_planned_visits?: boolean
          close_in_progress_visits?: boolean
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_activity_source?: string
          mark_unproductive?: boolean
          pre_warning_enabled?: boolean
          pre_warning_minutes_before?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          auto_close_time?: string
          cancel_planned_visits?: boolean
          close_in_progress_visits?: boolean
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_activity_source?: string
          mark_unproductive?: boolean
          pre_warning_enabled?: boolean
          pre_warning_minutes_before?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_color: string | null
          created_at: string
          criteria_type: string
          criteria_value: number
          description: string | null
          icon: string
          id: string
          name: string
        }
        Insert: {
          badge_color?: string | null
          created_at?: string
          criteria_type: string
          criteria_value: number
          description?: string | null
          icon: string
          id?: string
          name: string
        }
        Update: {
          badge_color?: string | null
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string | null
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      beat_allowances: {
        Row: {
          average_km: number | null
          average_time_minutes: number | null
          beat_id: string
          beat_name: string
          created_at: string
          daily_allowance: number
          id: string
          travel_allowance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_km?: number | null
          average_time_minutes?: number | null
          beat_id: string
          beat_name: string
          created_at?: string
          daily_allowance?: number
          id?: string
          travel_allowance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_km?: number | null
          average_time_minutes?: number | null
          beat_id?: string
          beat_name?: string
          created_at?: string
          daily_allowance?: number
          id?: string
          travel_allowance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beat_audit_log: {
        Row: {
          action: string
          beat_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_user_id: string | null
          old_user_id: string | null
          performed_by: string
        }
        Insert: {
          action: string
          beat_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_user_id?: string | null
          old_user_id?: string | null
          performed_by: string
        }
        Update: {
          action?: string
          beat_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_user_id?: string | null
          old_user_id?: string | null
          performed_by?: string
        }
        Relationships: []
      }
      beat_plans: {
        Row: {
          beat_data: Json
          beat_id: string
          beat_name: string
          created_at: string
          id: string
          joint_sales_manager_id: string | null
          plan_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          beat_data?: Json
          beat_id: string
          beat_name: string
          created_at?: string
          id?: string
          joint_sales_manager_id?: string | null
          plan_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          beat_data?: Json
          beat_id?: string
          beat_name?: string
          created_at?: string
          id?: string
          joint_sales_manager_id?: string | null
          plan_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beats: {
        Row: {
          average_km: number | null
          average_time_minutes: number | null
          beat_id: string
          beat_name: string
          category: string | null
          created_at: string
          created_by: string | null
          distributor_id: string | null
          id: string
          is_active: boolean | null
          owner_id: string | null
          owner_name: string | null
          territory_id: string | null
          travel_allowance: number | null
          updated_at: string
        }
        Insert: {
          average_km?: number | null
          average_time_minutes?: number | null
          beat_id: string
          beat_name: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          distributor_id?: string | null
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
          owner_name?: string | null
          territory_id?: string | null
          travel_allowance?: number | null
          updated_at?: string
        }
        Update: {
          average_km?: number | null
          average_time_minutes?: number | null
          beat_id?: string
          beat_name?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          distributor_id?: string | null
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
          owner_name?: string | null
          territory_id?: string | null
          travel_allowance?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      branding_request_items: {
        Row: {
          approved_budget: number | null
          asset_type: string
          branding_request_id: string | null
          created_at: string
          current_stage: string | null
          due_date: string | null
          id: string
          pending_status: string | null
          preferred_vendor: string | null
          updated_at: string
          vendor_budget: number | null
          vendor_confirmation_status: string | null
        }
        Insert: {
          approved_budget?: number | null
          asset_type: string
          branding_request_id?: string | null
          created_at?: string
          current_stage?: string | null
          due_date?: string | null
          id?: string
          pending_status?: string | null
          preferred_vendor?: string | null
          updated_at?: string
          vendor_budget?: number | null
          vendor_confirmation_status?: string | null
        }
        Update: {
          approved_budget?: number | null
          asset_type?: string
          branding_request_id?: string | null
          created_at?: string
          current_stage?: string | null
          due_date?: string | null
          id?: string
          pending_status?: string | null
          preferred_vendor?: string | null
          updated_at?: string
          vendor_budget?: number | null
          vendor_confirmation_status?: string | null
        }
        Relationships: []
      }
      branding_requests: {
        Row: {
          approved_at: string | null
          assigned_vendor_id: string | null
          budget: number | null
          contract_document_url: string | null
          created_at: string
          description: string | null
          due_date: string | null
          executed_at: string | null
          id: string
          implementation_date: string | null
          implementation_photo_urls: string[] | null
          manager_comments: string | null
          manager_id: string | null
          measurement_photo_urls: string[] | null
          order_impact_notes: string | null
          pincode: string | null
          post_implementation_notes: string | null
          procurement_id: string | null
          requested_assets: string | null
          retailer_feedback_on_branding: string | null
          retailer_id: string
          size: string | null
          status: Database["public"]["Enums"]["branding_status"]
          title: string | null
          updated_at: string
          user_id: string
          vendor_budget: number | null
          vendor_confirmation_status: string | null
          vendor_due_date: string | null
          vendor_feedback: string | null
          vendor_rating: number | null
          verification_photo_url: string | null
          visit_id: string
        }
        Insert: {
          approved_at?: string | null
          assigned_vendor_id?: string | null
          budget?: number | null
          contract_document_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          executed_at?: string | null
          id?: string
          implementation_date?: string | null
          implementation_photo_urls?: string[] | null
          manager_comments?: string | null
          manager_id?: string | null
          measurement_photo_urls?: string[] | null
          order_impact_notes?: string | null
          pincode?: string | null
          post_implementation_notes?: string | null
          procurement_id?: string | null
          requested_assets?: string | null
          retailer_feedback_on_branding?: string | null
          retailer_id: string
          size?: string | null
          status?: Database["public"]["Enums"]["branding_status"]
          title?: string | null
          updated_at?: string
          user_id: string
          vendor_budget?: number | null
          vendor_confirmation_status?: string | null
          vendor_due_date?: string | null
          vendor_feedback?: string | null
          vendor_rating?: number | null
          verification_photo_url?: string | null
          visit_id: string
        }
        Update: {
          approved_at?: string | null
          assigned_vendor_id?: string | null
          budget?: number | null
          contract_document_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          executed_at?: string | null
          id?: string
          implementation_date?: string | null
          implementation_photo_urls?: string[] | null
          manager_comments?: string | null
          manager_id?: string | null
          measurement_photo_urls?: string[] | null
          order_impact_notes?: string | null
          pincode?: string | null
          post_implementation_notes?: string | null
          procurement_id?: string | null
          requested_assets?: string | null
          retailer_feedback_on_branding?: string | null
          retailer_id?: string
          size?: string | null
          status?: Database["public"]["Enums"]["branding_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
          vendor_budget?: number | null
          vendor_confirmation_status?: string | null
          vendor_due_date?: string | null
          vendor_feedback?: string | null
          vendor_rating?: number | null
          verification_photo_url?: string | null
          visit_id?: string
        }
        Relationships: []
      }
      broadcast_notification_log: {
        Row: {
          created_at: string
          id: string
          message: string
          sent_by: string | null
          sent_count: number | null
          target_ids: string[] | null
          target_portals: string[] | null
          target_type: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sent_by?: string | null
          sent_count?: number | null
          target_ids?: string[] | null
          target_portals?: string[] | null
          target_type?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sent_by?: string | null
          sent_count?: number | null
          target_ids?: string[] | null
          target_portals?: string[] | null
          target_type?: string | null
          title?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          message_id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          message_id: string
          rating?: number | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          message_id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "user"
      approval_status: "pending" | "approved" | "rejected"
      branding_status:
        | "submitted"
        | "manager_approved"
        | "manager_rejected"
        | "assigned"
        | "in_progress"
        | "executed"
        | "verified"
      employee_doc_type: "address_proof" | "id_proof" | "other"
      pm_member_role:
        | "owner"
        | "manager"
        | "developer"
        | "designer"
        | "tester"
        | "viewer"
      pm_priority: "critical" | "high" | "medium" | "low"
      pm_project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      pm_sprint_status: "planning" | "active" | "completed" | "cancelled"
      pm_task_status:
        | "backlog"
        | "todo"
        | "in_progress"
        | "in_review"
        | "done"
        | "cancelled"
        | "overdue"
      pm_task_type: "epic" | "story" | "task" | "bug" | "idea" | "milestone"
      user_status:
        | "pending_completion"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "active"
        | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      approval_status: ["pending", "approved", "rejected"],
      branding_status: [
        "submitted",
        "manager_approved",
        "manager_rejected",
        "assigned",
        "in_progress",
        "executed",
        "verified",
      ],
      employee_doc_type: ["address_proof", "id_proof", "other"],
      pm_member_role: [
        "owner",
        "manager",
        "developer",
        "designer",
        "tester",
        "viewer",
      ],
      pm_priority: ["critical", "high", "medium", "low"],
      pm_project_status: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      pm_sprint_status: ["planning", "active", "completed", "cancelled"],
      pm_task_status: [
        "backlog",
        "todo",
        "in_progress",
        "in_review",
        "done",
        "cancelled",
        "overdue",
      ],
      pm_task_type: ["epic", "story", "task", "bug", "idea", "milestone"],
      user_status: [
        "pending_completion",
        "pending_approval",
        "approved",
        "rejected",
        "active",
        "inactive",
      ],
    },
  },
} as const
