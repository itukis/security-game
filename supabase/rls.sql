-- SecureCodeArena access policy v2
--
-- Browser roles use Supabase Auth only. Game data is read and written through
-- the orchestrator, whose backend-only secret key maps to service_role.

alter table public.profiles enable row level security;
alter table public.problems enable row level security;
alter table public.submission_history enable row level security;
alter table public.completed_problems enable row level security;

drop policy if exists profiles_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists problems_read on public.problems;
drop policy if exists submission_own on public.submission_history;
drop policy if exists completed_own on public.completed_problems;

create policy profiles_own
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy submission_own
  on public.submission_history for select
  to authenticated
  using (auth.uid() = user_id);

create policy completed_own
  on public.completed_problems for select
  to authenticated
  using (auth.uid() = user_id);

-- Supabase grants broad public-schema privileges by default. Revoke them so a
-- forged browser request cannot write scores or read another user's records,
-- even if a future policy is accidentally loosened.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.problems from anon, authenticated;
revoke all on table public.submission_history from anon, authenticated;
revoke all on table public.completed_problems from anon, authenticated;

drop function if exists public.upsert_completion(uuid, text, int, text);

create or replace function public.record_verified_submission(
  p_user_id uuid,
  p_problem_id text,
  p_patch text,
  p_passed boolean,
  p_score int,
  p_score_mode text,
  p_duration_ms int
)
returns table(first_clear boolean, best_score int)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_first_clear boolean := false;
  v_best_score int := null;
begin
  if p_user_id is null or p_problem_id is null or p_patch is null then
    raise exception 'required submission field is missing';
  end if;

  if octet_length(p_patch) > 32768 then
    raise exception 'patch exceeds storage limit';
  end if;

  if p_score_mode not in ('multipleChoice', 'editPreview', 'editOnly') then
    raise exception 'invalid score mode';
  end if;

  if p_duration_ms is not null and p_duration_ms < 0 then
    raise exception 'invalid duration';
  end if;

  if p_passed and (p_score is null or p_score < 0 or p_score > 250) then
    raise exception 'passing submission requires a valid server score';
  end if;

  if not p_passed and p_score is not null then
    raise exception 'failed submission cannot award score';
  end if;

  insert into public.submission_history (
    user_id,
    problem_id,
    patch,
    passed,
    score_mode,
    score_awarded,
    duration_ms
  ) values (
    p_user_id,
    p_problem_id,
    p_patch,
    p_passed,
    p_score_mode,
    p_score,
    p_duration_ms
  );

  if p_passed then
    insert into public.completed_problems (
      user_id,
      problem_id,
      score,
      patch,
      completed_at
    ) values (
      p_user_id,
      p_problem_id,
      p_score,
      p_patch,
      now()
    )
    on conflict (user_id, problem_id) do update set
      completed_at = excluded.completed_at,
      score = greatest(completed_problems.score, excluded.score),
      patch = case
        when excluded.score > completed_problems.score then excluded.patch
        else completed_problems.patch
      end
    returning (xmax = 0), completed_problems.score
      into v_first_clear, v_best_score;
  end if;

  return query select v_first_clear, v_best_score;
end;
$$;

revoke all on function public.record_verified_submission(
  uuid, text, text, boolean, int, text, int
) from public, anon, authenticated;
grant execute on function public.record_verified_submission(
  uuid, text, text, boolean, int, text, int
) to service_role;

create or replace function public.get_leaderboard(limit_n int default 50)
returns table(
  user_id uuid,
  display_name text,
  total_score int,
  completed_count int,
  rank int
)
language sql
security invoker
set search_path = public, pg_temp
as $$
  with totals as (
    select
      p.id as user_id,
      p.display_name,
      coalesce(sum(cp.score), 0)::int as total_score,
      count(cp.id)::int as completed_count
    from public.profiles p
    left join public.completed_problems cp on cp.user_id = p.id
    group by p.id, p.display_name
  ), ranked as (
    select
      totals.*,
      row_number() over (
        order by total_score desc, completed_count desc, user_id
      )::int as rank
    from totals
  )
  select user_id, display_name, total_score, completed_count, rank
  from ranked
  order by rank
  limit greatest(1, least(coalesce(limit_n, 50), 100));
$$;

revoke all on function public.get_leaderboard(int)
  from public, anon, authenticated;
grant execute on function public.get_leaderboard(int)
  to service_role;
