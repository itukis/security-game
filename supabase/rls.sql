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