-- ============================================================================
-- Demo-only seed: creates fake leaderboard entries with realistic looking data.
--
-- ⚠️  ONLY run against your demo Supabase project. NEVER prod.
--
-- NOTE FOR TEAMMATE B / future readers:
-- The original spec inserted directly into public.profiles. That breaks
-- because profiles.id has a FOREIGN KEY to auth.users(id), so the parent
-- row in auth.users must exist first.
-- This file inserts into auth.users first (which triggers handle_new_user()
-- to create the profiles row), then updates display_name, then inserts
-- completed_problems rows for the leaderboard.
-- If you re-write this, keep that order or the script will fail.
--
-- These rows reference synthetic UUIDs of the form
-- 00000000-0000-0000-0000-00000000000X so they're easy to spot and clean up.
--
-- Cleanup happens at the top, so re-running this script is idempotent.
-- ============================================================================

-- --- Cleanup ----------------------------------------------------------------

delete from public.completed_problems
  where user_id::text like '00000000-0000-0000-0000-%';

delete from public.submission_history
  where user_id::text like '00000000-0000-0000-0000-%';

delete from public.profiles
  where id::text like '00000000-0000-0000-0000-%';

delete from auth.users
  where id::text like '00000000-0000-0000-0000-%';

-- --- Fake auth users --------------------------------------------------------
-- Minimal fields so the trigger that mirrors auth.users → public.profiles
-- fires and creates the matching profile rows.

insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'aoi@demo.local',    '', now(),
   '{"provider":"demo-seed"}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'taro@demo.local',   '', now(),
   '{"provider":"demo-seed"}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'sakura@demo.local', '', now(),
   '{"provider":"demo-seed"}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ren@demo.local',    '', now(),
   '{"provider":"demo-seed"}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

-- The on-insert trigger created profile rows with email but no display_name —
-- fill those in for the leaderboard.
update public.profiles set display_name = 'aoi'
  where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set display_name = 'taro'
  where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set display_name = 'sakura'
  where id = '00000000-0000-0000-0000-000000000003';
update public.profiles set display_name = 'ren'
  where id = '00000000-0000-0000-0000-000000000004';

-- --- Their clears (mix it up so ranking is interesting) ---------------------

insert into public.completed_problems (user_id, problem_id, score) values
  ('00000000-0000-0000-0000-000000000001', 'sqli-login',   100),
  ('00000000-0000-0000-0000-000000000001', 'xss-comments', 100),
  ('00000000-0000-0000-0000-000000000001', 'idor-profile', 100),
  ('00000000-0000-0000-0000-000000000002', 'sqli-login',   100),
  ('00000000-0000-0000-0000-000000000002', 'xss-comments', 100),
  ('00000000-0000-0000-0000-000000000003', 'sqli-login',   100),
  ('00000000-0000-0000-0000-000000000004', 'sqli-login',   100)
on conflict do nothing;
