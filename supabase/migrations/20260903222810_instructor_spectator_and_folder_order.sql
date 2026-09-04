-- Instructor Console folder ordering and participant-specific Spectator projections.

-- ─────────────────────────────────────────────────────────────────────────────
-- Persistent global scenario-folder order
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.scenario_folders
  add column if not exists position integer;

with ranked as (
  select
    id,
    row_number() over (order by lower(name), name, created_at, id)::integer as next_position
  from public.scenario_folders
)
update public.scenario_folders as folder
set position = ranked.next_position
from ranked
where folder.id = ranked.id
  and folder.position is null;

alter table public.scenario_folders
  alter column position set not null;

alter table public.scenario_folders
  add constraint scenario_folders_position_positive_check
  check (position > 0);

alter table public.scenario_folders
  add constraint scenario_folders_position_key
  unique (position)
  deferrable initially immediate;

create index scenario_folders_position_idx
  on public.scenario_folders (position asc, lower(name), id);

create or replace function public.assign_scenario_folder_position()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('scenario_library_write'));
  if new.position is null then
    select coalesce(max(folder.position), 0) + 1
      into new.position
      from public.scenario_folders as folder;
  end if;
  return new;
end;
$$;

drop trigger if exists scenario_folders_assign_position on public.scenario_folders;
create trigger scenario_folders_assign_position
before insert on public.scenario_folders
for each row execute function public.assign_scenario_folder_position();

create or replace function public.compact_scenario_folder_positions()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  with ranked as (
    select
      folder.id,
      row_number() over (order by folder.position, lower(folder.name), folder.id)::integer as next_position
    from public.scenario_folders as folder
  )
  update public.scenario_folders as folder
     set position = ranked.next_position
    from ranked
   where folder.id = ranked.id
     and folder.position <> ranked.next_position;
  return null;
end;
$$;

drop trigger if exists scenario_folders_compact_positions on public.scenario_folders;
create trigger scenario_folders_compact_positions
after delete on public.scenario_folders
for each statement execute function public.compact_scenario_folder_positions();

create or replace function public.reorder_scenario_folders(
  ordered_folder_ids uuid[]
)
returns setof public.scenario_folders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  stored_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('scenario_library_write'));

  select count(*)::integer
    into stored_count
    from public.scenario_folders;

  if cardinality(ordered_folder_ids) <> stored_count
     or (select count(distinct id) from unnest(ordered_folder_ids) as id) <> stored_count
     or exists (
       select requested.id
       from unnest(ordered_folder_ids) as requested(id)
       except
       select folder.id from public.scenario_folders as folder
     ) then
    raise exception 'Folder order must contain every folder exactly once';
  end if;

  set constraints public.scenario_folders_position_key deferred;

  update public.scenario_folders as folder
     set position = requested.ordinality::integer
    from unnest(ordered_folder_ids) with ordinality as requested(id, ordinality)
   where folder.id = requested.id;

  return query
    select folder.*
      from public.scenario_folders as folder
     order by folder.position asc, lower(folder.name), folder.id;
end;
$$;

revoke execute on function public.assign_scenario_folder_position()
  from public, anon, authenticated;
revoke execute on function public.compact_scenario_folder_positions()
  from public, anon, authenticated;
revoke execute on function public.reorder_scenario_folders(uuid[])
  from public, anon, authenticated;
grant execute on function public.reorder_scenario_folders(uuid[])
  to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Latest participant monitor projection for host-authorized Spectator views
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.trainee_monitor_projections (
  participant_id  uuid        primary key references public.participants(id) on delete cascade,
  session_id      uuid        references public.sessions(id) on delete cascade not null,
  attempt_version integer     not null,
  stream_id       uuid        not null,
  client_sequence bigint      not null default 0,
  projection      jsonb       not null default '{}'::jsonb,
  updated_at      timestamptz not null default now(),
  constraint trainee_monitor_projections_sequence_nonnegative_check
    check (client_sequence >= 0),
  constraint trainee_monitor_projections_payload_size_check
    check (pg_catalog.octet_length(projection::text) <= 262144)
);

create index if not exists trainee_monitor_projections_session_idx
  on public.trainee_monitor_projections (session_id, participant_id);

alter table public.trainee_monitor_projections enable row level security;
revoke all on public.trainee_monitor_projections from anon, authenticated;
grant select, insert, update, delete on table public.trainee_monitor_projections to service_role;

create or replace function public.clear_monitor_projection_on_new_attempt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.active_attempt_version is distinct from old.active_attempt_version then
    delete from public.trainee_monitor_projections as projection
     where projection.session_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sessions_clear_monitor_projection on public.sessions;
create trigger sessions_clear_monitor_projection
after update of active_attempt_version on public.sessions
for each row execute function public.clear_monitor_projection_on_new_attempt();

revoke execute on function public.clear_monitor_projection_on_new_attempt()
  from public, anon, authenticated;
