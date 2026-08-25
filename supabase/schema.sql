-- SecureCodeArena schema v2
--
-- Supabase Auth owns credentials and email addresses. Public tables contain
-- only game data; authoritative score writes are performed by the
-- orchestrator with a backend-only secret key.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 2 and 50)
);

create table if not exists public.problems (
  id text primary key,
  title text not null,
  vulnerability text not null,
  base_score int not null default 100,
  constraint problems_base_score_range check (base_score between 0 and 250)
);

create table if not exists public.submission_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id text not null references public.problems(id) on delete cascade,
  patch text not null,
  passed boolean not null,
  score_mode text not null,
  score_awarded int,
  duration_ms int,
  created_at timestamptz not null default now(),
  constraint submission_score_mode
    check (score_mode in ('multipleChoice', 'editPreview', 'editOnly')),
  constraint submission_score_range
    check (score_awarded is null or score_awarded between 0 and 250),
  constraint submission_duration_nonnegative
    check (duration_ms is null or duration_ms >= 0),
  constraint submission_pass_score_consistency
    check ((passed and score_awarded is not null) or (not passed and score_awarded is null))
);

create table if not exists public.completed_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id text not null references public.problems(id) on delete cascade,
  completed_at timestamptz not null default now(),
  score int not null,
  patch text,
  unique (user_id, problem_id),
  constraint completed_score_range check (score between 0 and 250)
);

create index if not exists submission_history_user_created_idx
  on public.submission_history (user_id, created_at desc);
create index if not exists completed_problems_score_idx
  on public.completed_problems (score desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_name text;
begin
  requested_name := trim(coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    ''
  ));

  insert into public.profiles (id, display_name)
  values (
    new.id,
    case
      when char_length(requested_name) between 2 and 50 then requested_name
      else null
    end
  )
  on conflict (id) do update set
    display_name = excluded.display_name;

  return new;
end;
$$;

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_name text;
begin
  requested_name := trim(coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    ''
  ));

  insert into public.profiles (id, display_name)
  values (
    new.id,
    case
      when char_length(requested_name) between 2 and 50 then requested_name
      else null
    end
  )
  on conflict (id) do update set
    display_name = excluded.display_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_profile_updated on auth.users;
create trigger on_auth_user_profile_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.sync_profile_from_auth_user();
