create table if not exists public.profiles (
id uuid primary key references auth.users(id) on delete cascade,
email text not null,
display_name text,
created_at timestamptz not null default now()
);

create table if not exists public.problems (
id text primary key,
title text not null,
vulnerability text not null,
base_score int not null default 100
);

create table if not exists public.submission_history (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
problem_id text not null references public.problems(id) on delete cascade,
patch text not null,
passed boolean not null,
duration_ms int,
created_at timestamptz not null default now()
);

create table if not exists public.completed_problems (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
problem_id text not null references public.problems(id) on delete cascade,
completed_at timestamptz not null default now(),
score int not null,
patch text,
unique (user_id, problem_id)
);

create or replace view public.leaderboard as
select p.id user_id, p.display_name, p.email,
coalesce(sum(cp.score),0)::int total_score,
count(cp.id)::int completed_count
from public.profiles p
left join public.completed_problems cp on cp.user_id = p.id
group by p.id, p.display_name, p.email
order by total_score desc, completed_count desc;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
insert into public.profiles (id, email) values (new.id, new.email)
on conflict (id) do nothing;
return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();