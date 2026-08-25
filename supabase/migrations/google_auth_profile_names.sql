-- Keep public profile names in sync for Google OAuth users.
-- Google supplies `full_name` / `name`; email-password signup used
-- `display_name`. Supporting all three keeps the leaderboard name populated.

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

-- Backfill any Google user that signed in before this migration was applied.
update public.profiles as profile
set display_name = source.requested_name
from (
  select
    id,
    trim(coalesce(
      nullif(raw_user_meta_data ->> 'display_name', ''),
      nullif(raw_user_meta_data ->> 'full_name', ''),
      nullif(raw_user_meta_data ->> 'name', ''),
      ''
    )) as requested_name
  from auth.users
) as source
where profile.id = source.id
  and profile.display_name is null
  and char_length(source.requested_name) between 2 and 50;
