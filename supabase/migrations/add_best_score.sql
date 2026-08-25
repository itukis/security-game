-- Secure scoring migration for both fresh and legacy SecureCodeArena projects.
-- Run after schema.sql and before rls.sql.

-- Remove the v1 public leaderboard object before dropping its duplicated email
-- column. Auth remains the only source of account email addresses.
drop function if exists public.get_leaderboard(int);
drop view if exists public.leaderboard;

-- The v1 browser-callable scoring function is intentionally removed. The v2
-- replacement in rls.sql is executable only by the service_role used by the
-- orchestrator.
drop function if exists public.upsert_completion(uuid, text, int, text);

alter table public.profiles
  drop column if exists email;

alter table public.submission_history
  add column if not exists score_mode text;
alter table public.submission_history
  add column if not exists score_awarded int;

-- Legacy history rows predate score modes. Give them an explicit neutral mode
-- before making the column mandatory.
update public.submission_history
set score_mode = 'editPreview'
where score_mode is null;

update public.submission_history as history
set score_awarded = problem.base_score
from public.problems as problem
where history.problem_id = problem.id
  and history.passed
  and history.score_awarded is null;

alter table public.submission_history
  alter column score_mode set not null;

alter table public.completed_problems
  add column if not exists patch text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_display_name_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_display_name_length
      check (display_name is null or char_length(display_name) between 2 and 50);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'submission_score_mode'
      and conrelid = 'public.submission_history'::regclass
  ) then
    alter table public.submission_history
      add constraint submission_score_mode
      check (score_mode in ('multipleChoice', 'editPreview', 'editOnly'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'submission_score_range'
      and conrelid = 'public.submission_history'::regclass
  ) then
    alter table public.submission_history
      add constraint submission_score_range
      check (score_awarded is null or score_awarded between 0 and 250);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'submission_duration_nonnegative'
      and conrelid = 'public.submission_history'::regclass
  ) then
    alter table public.submission_history
      add constraint submission_duration_nonnegative
      check (duration_ms is null or duration_ms >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'submission_pass_score_consistency'
      and conrelid = 'public.submission_history'::regclass
  ) then
    alter table public.submission_history
      add constraint submission_pass_score_consistency
      check ((passed and score_awarded is not null) or (not passed and score_awarded is null));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'completed_score_range'
      and conrelid = 'public.completed_problems'::regclass
  ) then
    alter table public.completed_problems
      add constraint completed_score_range
      check (score between 0 and 250);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'problems_base_score_range'
      and conrelid = 'public.problems'::regclass
  ) then
    alter table public.problems
      add constraint problems_base_score_range
      check (base_score between 0 and 250);
  end if;
end
$$;

create index if not exists submission_history_user_created_idx
  on public.submission_history (user_id, created_at desc);
create index if not exists completed_problems_score_idx
  on public.completed_problems (score desc);
