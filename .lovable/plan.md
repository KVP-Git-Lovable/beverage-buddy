# Issue: Newly created users do not appear in User Management → Users & Roles

## Root cause

The Supabase backend currently shows 2 auth users:
- `abhishek.kvp2979@gmail.com` — appears in User Management
- `prajwalkvpcorp@gmail.com` — **missing** from User Management

When I joined `auth.users` against `public.profiles`, only one user has a profile row. The newer user (`prajwalkvpcorp@gmail.com`) has:
- A row in `auth.users` ✅
- A row in `public.user_profiles` (security profile assigned) ✅
- **No row in `public.profiles`** ❌

The User Management list relies on `public.profiles` (via the `get_limited_profiles_for_admin` RPC and several joins), so any user without a `profiles` row is silently invisible.

### Why the profile row is missing

The `handle_new_user()` function exists in the database (it inserts into `public.profiles` from `auth.users`), but **no trigger is attached to `auth.users` to actually call it**. So profile rows are only created when the application path explicitly inserts one. The `admin-create-user` edge function creates `auth.users` + `employees` + `user_roles` + `user_profiles`, but never inserts into `public.profiles`. As a result, any user created through the wizard (or any path that bypasses an explicit profile insert, including direct Supabase signups) ends up without a profile.

## Fix

Two complementary changes — pick the one matching your preference, or apply both for full safety.

### A. Re-attach the `on_auth_user_created` trigger (recommended, repo-wide fix)

Database migration that:
1. Creates trigger `on_auth_user_created` on `auth.users AFTER INSERT` to call `public.handle_new_user()`.
2. Backfills the missing profile row for the existing user `prajwalkvpcorp@gmail.com` (and any other auth user without a profile) by running the same insert logic once.

After this, every future user — created via the admin wizard, signup, or invitation — automatically gets a `profiles` row.

### B. Defensive insert inside `admin-create-user` edge function

Update `supabase/functions/admin-create-user/index.ts` so that immediately after creating the auth user (around line 308), it upserts into `public.profiles` with `id`, `username` (email local-part or provided username), and `full_name`. Use `onConflict: 'id'` so existing users are not affected.

This guards against any future case where the trigger is dropped or bypassed.

## Verification

After the fix:
- `prajwalkvpcorp@gmail.com` should appear in User Management → Users & Roles, with "Total Users: 2".
- Creating any new user from the wizard should immediately show them in the list (the page already subscribes to realtime `profiles` changes and refetches).

## Technical details

- Trigger SQL:
  ```sql
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  ```
- Backfill SQL:
  ```sql
  INSERT INTO public.profiles (id, username, full_name)
  SELECT u.id,
         SPLIT_PART(u.email, '@', 1),
         COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1))
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
  ON CONFLICT (id) DO NOTHING;
  ```
- The existing `handle_new_user` function is already `SECURITY DEFINER` with a fixed `search_path`, so re-attaching the trigger is safe.

Shall I proceed with Option A (trigger + backfill) plus the defensive upsert in `admin-create-user` (Option B) for full robustness?
