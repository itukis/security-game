alter table public.profiles enable row level security;
alter table public.problems enable row level security;
alter table public.submission_history enable row level security;
alter table public.completed_problems enable row level security;

create policy "profiles_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "problems_read" on public.problems for select using (auth.role() = 'authenticated');
create policy "submission_own" on public.submission_history for select using (auth.uid() = user_id);
create policy "completed_own" on public.completed_problems for select using (auth.uid() = user_id);

create or replace function public.get_leaderboard(limit_n int default 50)
returns table(user_id uuid, display_name text, total_score int, completed_count int, rank int)
language sql security definer set search_path = public as $$
select user_id, display_name, total_score, completed_count,
(row_number() over (order by total_score desc, completed_count desc))::int rank
from public.leaderboard limit limit_n;
$$;

grant execute on function public.get_leaderboard(int) to authenticated, anon;

-- Atomic best-score upsert.
-- score only ever moves upward (GREATEST); patch tracks the best-scoring run's solution.
-- SECURITY DEFINER so both the browser client (anon key + user session) and the
-- server-side orchestrator (service role) can call it without extra RLS policies.
-- When called from the browser, auth.uid() must match p_user_id.
create or replace function public.upsert_completion(
  p_user_id    uuid,
  p_problem_id text,
  p_score      int,
  p_patch      text
)
returns table(best_score int, first_clear bool)
language plpgsql security definer set search_path = public
as $$
declare
  v_score       int;
  v_first_clear bool;
begin
  -- Prevent a browser-side caller from writing another user's row.
  -- Service-role callers have auth.uid() = null, so the check is skipped for them.
  if auth.uid() is not null and p_user_id != auth.uid() then
    raise exception 'permission denied';
  end if;

  insert into public.completed_problems (user_id, problem_id, score, patch, completed_at)
  values (p_user_id, p_problem_id, p_score, p_patch, now())
  on conflict (user_id, problem_id) do update set
    completed_at = excluded.completed_at,
    -- Score only moves upward
    score = greatest(completed_problems.score, excluded.score),
    -- Patch follows the highest-scoring run; ties keep the existing patch
    patch = case
              when excluded.score > completed_problems.score then excluded.patch
              else completed_problems.patch
            end
  returning
    completed_problems.score,
    -- xmax = 0 means no prior row existed (fresh INSERT, not an UPDATE)
    (xmax = 0)
  into v_score, v_first_clear;

  return query select v_score, v_first_clear;
end;
$$;

grant execute on function public.upsert_completion(uuid, text, int, text)
  to authenticated, anon;