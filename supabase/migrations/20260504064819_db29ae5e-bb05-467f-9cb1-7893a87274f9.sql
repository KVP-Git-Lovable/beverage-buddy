-- 1. password_reset_tokens: remove permissive policy (service_role bypasses RLS)
DROP POLICY IF EXISTS "Service role can manage password reset tokens" ON public.password_reset_tokens;

-- 2. attendance_daily_admin_summary: drop unrestricted ALL policy
-- Service role (used by edge functions / triggers running as superuser) bypasses RLS.
-- Existing "Admin can read daily summary" policy stays for reads.
DROP POLICY IF EXISTS "System can manage daily summary" ON public.attendance_daily_admin_summary;

-- 3. attendance_user_monthly_summary: drop unrestricted policies and add owner-only read
DROP POLICY IF EXISTS "System can manage monthly summary" ON public.attendance_user_monthly_summary;
DROP POLICY IF EXISTS "Users can read own monthly summary" ON public.attendance_user_monthly_summary;

CREATE POLICY "Users can read own monthly summary"
ON public.attendance_user_monthly_summary
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
