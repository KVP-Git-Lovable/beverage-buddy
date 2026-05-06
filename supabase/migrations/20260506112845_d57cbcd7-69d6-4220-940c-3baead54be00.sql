-- Re-attach trigger so every new auth user automatically gets a profiles row
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profile rows for existing auth users that are missing one
INSERT INTO public.profiles (id, username, full_name)
SELECT u.id,
       SPLIT_PART(u.email, '@', 1),
       COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;