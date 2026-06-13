-- Migration: store the best-scoring run's patch and lock the score to the maximum.
--
-- Apply this to any existing database with:
--   psql "$DATABASE_URL" -f supabase/migrations/add_best_score.sql
-- or paste it into the Supabase SQL editor.

-- 1. Add the patch column (nullable so existing rows are unaffected).
alter table public.completed_problems
  add column if not exists patch text;

-- 2. Atomic best-score upsert function.
--    score only ever moves upward (GREATEST); patch tracks the best-scoring run's solution.
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
    -- xmax = 0 means no prior row existed (fresh INSERT, not UPDATE on conflict)
    (xmax = 0)
  into v_score, v_first_clear;

  return query select v_score, v_first_clear;
end;
$$;

grant execute on function public.upsert_completion(uuid, text, int, text)
  to authenticated, anon;
