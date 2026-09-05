-- Account implementation Phase 1 — authorization foundation.
--
-- Supabase Auth remains the credential authority. This profile is the live,
-- immutable-ID authorization source for application role and account status.
-- Registration, username-to-email sign-in, and account UI arrive in Phase 2.

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- Reserved names protect the three deployment-provisioned Administrator
-- identities from being claimed by ordinary Instructor registration. The name
-- itself never grants authority; role is still stored on the Auth user ID.
create table public.reserved_account_usernames (
  username            text        primary key,
  normalized_username text        generated always as (lower(username)) stored,
  created_at          timestamptz not null default now(),

  constraint reserved_account_usernames_username_trimmed
    check (username = btrim(username)),
  constraint reserved_account_usernames_username_length
    check (char_length(username) between 3 and 30),
  constraint reserved_account_usernames_username_format
    check (username ~ '^[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]$'),
  constraint reserved_account_usernames_normalized_username_key
    unique (normalized_username)
);

insert into public.reserved_account_usernames (username)
values ('Zoid'), ('Branden'), ('Jeremy')
on conflict (username) do nothing;

create table public.account_profiles (
  user_id             uuid        primary key references auth.users(id) on delete cascade,
  username            text        not null,
  normalized_username text        generated always as (lower(username)) stored,
  role                text        not null default 'instructor',
  status              text        not null default 'enabled',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint account_profiles_username_trimmed
    check (username = btrim(username)),
  constraint account_profiles_username_length
    check (char_length(username) between 3 and 30),
  constraint account_profiles_username_format
    check (username ~ '^[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]$'),
  constraint account_profiles_normalized_username_key
    unique (normalized_username),
  constraint account_profiles_role_check
    check (role in ('instructor', 'administrator')),
  constraint account_profiles_status_check
    check (status in ('enabled', 'disabled'))
);

-- The primary key covers direct user lookups. The partial index keeps the live
-- enabled-account authorization lookup small if disabled accounts accumulate.
create index account_profiles_enabled_user_id_idx
  on public.account_profiles (user_id)
  where status = 'enabled';

create or replace function private.set_account_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger account_profiles_set_updated_at
before update on public.account_profiles
for each row execute function private.set_account_profile_updated_at();

create or replace function private.enforce_reserved_account_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role <> 'administrator'
     and exists (
       select 1
       from public.reserved_account_usernames reserved
       where reserved.normalized_username = lower(new.username)
     )
  then
    raise exception using
      errcode = '23514',
      message = 'reserved username requires administrator role',
      constraint = 'account_profiles_reserved_username_check';
  end if;

  return new;
end;
$$;

create trigger account_profiles_enforce_reserved_username
before insert or update of username, role on public.account_profiles
for each row execute function private.enforce_reserved_account_username();

alter table public.account_profiles enable row level security;
alter table public.reserved_account_usernames enable row level security;

revoke all on table public.account_profiles from public, anon, authenticated;
revoke all on table public.reserved_account_usernames from public, anon, authenticated, service_role;

grant select on table public.account_profiles to authenticated;
grant select, insert, update, delete on table public.account_profiles to service_role;
grant select on table public.reserved_account_usernames to service_role;

create policy "account_profiles: enabled account reads self"
on public.account_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and status = 'enabled'
);

-- These helpers deliberately run as the caller. The authenticated role has
-- only self-read access to account_profiles, so disabled/missing profiles and
-- other users resolve to false without bypassing RLS. Future protected-table
-- policies can call them without trusting JWT metadata.
create or replace function private.current_account_is_enabled()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.status = 'enabled'
  );
$$;

create or replace function private.current_account_is_administrator()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.status = 'enabled'
      and profile.role = 'administrator'
  );
$$;

revoke all on function private.set_account_profile_updated_at() from public, anon, authenticated;
revoke all on function private.enforce_reserved_account_username() from public, anon, authenticated;
revoke all on function private.current_account_is_enabled() from public, anon;
revoke all on function private.current_account_is_administrator() from public, anon;

grant execute on function private.current_account_is_enabled() to authenticated, service_role;
grant execute on function private.current_account_is_administrator() to authenticated, service_role;
