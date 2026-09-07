-- Account implementation Phase 4 — Account-owned Rooms.
--
-- Rooms are temporary live-operation records. The accepted rollout contract
-- expires every legacy host-token Room instead of preserving two instructor
-- authorization systems. Cascades deliberately remove their temporary child
-- state before ownership becomes required.

delete from public.sessions;

drop table if exists public.session_hosts;

alter table public.sessions
  add column owner_user_id uuid references auth.users(id) on delete cascade;

alter table public.sessions
  alter column owner_user_id set not null,
  alter column expires_at set not null,
  alter column expires_at set default (now() + interval '24 hours');

create unique index sessions_one_live_room_per_owner_idx
  on public.sessions (owner_user_id)
  where status in ('waiting', 'active');

create index sessions_owner_created_at_idx
  on public.sessions (owner_user_id, created_at desc);

-- The controller token is a same-Account concurrency fence, not the Room's
-- authorization identity. Only server routes may read or rotate its hash.
create table public.session_controllers (
  session_id    uuid        primary key references public.sessions(id) on delete cascade,
  token_hash    text        not null,
  claim_version bigint      not null default 1,
  claimed_at    timestamptz not null default now(),

  constraint session_controllers_token_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint session_controllers_claim_version_positive
    check (claim_version >= 1)
);

alter table public.session_controllers enable row level security;

-- Room owners may observe only their own Rooms through the authenticated Data
-- API. All writes stay behind protected application routes so a browser cannot
-- bypass controller fencing by calling PostgREST directly.
revoke all on table public.sessions from public, anon, authenticated, service_role;
grant select on table public.sessions to authenticated;
grant select, insert, update, delete on table public.sessions to service_role;

revoke all on table public.session_controllers from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.session_controllers to service_role;

drop policy if exists "sessions: enabled owner reads room" on public.sessions;
create policy "sessions: enabled owner reads room"
on public.sessions
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select private.current_account_is_enabled())
);

-- Ownership is immutable even for privileged application code. Deliberate
-- Account deletion removes the Room by FK cascade instead of transferring it.
create or replace function private.enforce_session_owner_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id then
    raise exception using
      errcode = '23514',
      message = 'room owner is immutable',
      constraint = 'sessions_owner_user_id_immutable';
  end if;
  return new;
end;
$$;

create trigger sessions_enforce_owner_immutable
before update of owner_user_id on public.sessions
for each row execute function private.enforce_session_owner_immutable();

-- Disabling an Account must affect already-issued browser sessions
-- immediately. End its live Room and close the current trainee attempt while
-- retaining the temporary rows for Phase 5 report persistence work.
create or replace function private.end_rooms_for_disabled_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'enabled' and new.status = 'disabled' then
    update public.participant_attempts as attempt
       set completed_at = coalesce(attempt.completed_at, now())
      from public.sessions as room
     where room.owner_user_id = new.user_id
       and room.status in ('waiting', 'active')
       and attempt.session_id = room.id
       and attempt.attempt_version = room.active_attempt_version;

    update public.sessions
       set status = 'ended'
     where owner_user_id = new.user_id
       and status in ('waiting', 'active');
  end if;
  return new;
end;
$$;

create trigger account_profiles_end_rooms_when_disabled
after update of status on public.account_profiles
for each row execute function private.end_rooms_for_disabled_account();

revoke all on function private.enforce_session_owner_immutable() from public, anon, authenticated;
revoke all on function private.end_rooms_for_disabled_account() from public, anon, authenticated;
grant execute on function private.enforce_session_owner_immutable() to service_role;
grant execute on function private.end_rooms_for_disabled_account() to service_role;
