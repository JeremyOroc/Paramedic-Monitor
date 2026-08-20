-- Make every scenario folder ordinary/deletable and persist explicit scenario order.

drop trigger if exists scenario_folders_protect_general on public.scenario_folders;
drop function if exists public.protect_general_scenario_folder();
drop index if exists public.scenario_folders_single_general_idx;

alter table public.scenario_folders
  drop column if exists is_general;

alter table public.saved_scenarios
  drop constraint if exists saved_scenarios_folder_id_fkey;

alter table public.saved_scenarios
  add constraint saved_scenarios_folder_id_fkey
  foreign key (folder_id)
  references public.scenario_folders(id)
  on delete cascade;

alter table public.saved_scenarios
  add column if not exists position integer;

with ranked as (
  select
    id,
    row_number() over (
      partition by folder_id
      order by updated_at desc, scenario_number asc
    )::integer as next_position
  from public.saved_scenarios
)
update public.saved_scenarios as scenario
set position = ranked.next_position
from ranked
where scenario.id = ranked.id
  and scenario.position is null;

alter table public.saved_scenarios
  alter column position set not null;

alter table public.saved_scenarios
  add constraint saved_scenarios_position_positive_check
  check (position > 0);

alter table public.saved_scenarios
  add constraint saved_scenarios_folder_position_key
  unique (folder_id, position)
  deferrable initially immediate;

drop index if exists public.saved_scenarios_folder_updated_idx;

create index saved_scenarios_folder_position_idx
  on public.saved_scenarios (folder_id, position asc, scenario_number asc);

create or replace function public.set_scenario_library_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_saved_scenario(
  folder_id uuid,
  requested_title text,
  scenario_snapshot jsonb
)
returns public.saved_scenarios
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_number integer;
  next_position integer;
  inserted public.saved_scenarios;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('scenario_library_write'));

  if not exists (
    select 1 from public.scenario_folders as folder where folder.id = folder_id
  ) then
    raise exception 'Scenario folder not found';
  end if;

  select min(candidate)
    into next_number
    from generate_series(
      1,
      (select coalesce(max(existing.scenario_number), 0) + 1 from public.saved_scenarios as existing)
    ) as candidate
    left join public.saved_scenarios as existing
      on existing.scenario_number = candidate
   where existing.scenario_number is null;

  select coalesce(max(existing.position), 0) + 1
    into next_position
    from public.saved_scenarios as existing
   where existing.folder_id = create_saved_scenario.folder_id;

  insert into public.saved_scenarios (
    folder_id,
    scenario_number,
    title,
    snapshot,
    position
  ) values (
    folder_id,
    next_number,
    coalesce(nullif(btrim(requested_title), ''), 'Scenario ' || next_number),
    scenario_snapshot,
    next_position
  )
  returning * into inserted;

  return inserted;
end;
$$;

create or replace function public.create_saved_scenario_with_auto_folder(
  requested_title text,
  scenario_snapshot jsonb
)
returns public.saved_scenarios
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_folder_number integer;
  created_folder_id uuid;
  inserted public.saved_scenarios;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('scenario_library_write'));

  if exists (select 1 from public.scenario_folders) then
    raise exception 'Select a folder before saving';
  end if;

  select min(candidate)
    into next_folder_number
    from generate_series(1, 1000000) as candidate
    left join public.scenario_folders as existing
      on lower(existing.name) = lower('Folder ' || candidate)
   where existing.id is null;

  insert into public.scenario_folders (name)
  values ('Folder ' || next_folder_number)
  returning id into created_folder_id;

  select * into inserted
  from public.create_saved_scenario(
    created_folder_id,
    requested_title,
    scenario_snapshot
  );

  return inserted;
end;
$$;

create or replace function public.move_saved_scenario(
  scenario_to_move uuid,
  target_folder uuid
)
returns public.saved_scenarios
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current public.saved_scenarios;
  next_position integer;
  moved public.saved_scenarios;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('scenario_library_write'));

  select * into current
    from public.saved_scenarios
   where id = scenario_to_move
   for update;

  if current.id is null then
    raise exception 'Saved scenario not found';
  end if;
  if not exists (
    select 1 from public.scenario_folders as folder where folder.id = target_folder
  ) then
    raise exception 'Scenario folder not found';
  end if;
  if current.folder_id = target_folder then
    return current;
  end if;

  select coalesce(max(existing.position), 0) + 1
    into next_position
    from public.saved_scenarios as existing
   where existing.folder_id = target_folder;

  update public.saved_scenarios
     set folder_id = target_folder,
         position = next_position
   where id = scenario_to_move
  returning * into moved;

  return moved;
end;
$$;

create or replace function public.reorder_saved_scenarios(
  folder_to_reorder uuid,
  ordered_scenario_ids uuid[]
)
returns setof public.saved_scenarios
language plpgsql
security invoker
set search_path = ''
as $$
declare
  stored_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('scenario_library_write'));

  if not exists (
    select 1 from public.scenario_folders as folder where folder.id = folder_to_reorder
  ) then
    raise exception 'Scenario folder not found';
  end if;

  select count(*)::integer
    into stored_count
    from public.saved_scenarios as scenario
   where scenario.folder_id = folder_to_reorder;

  if cardinality(ordered_scenario_ids) <> stored_count
     or (select count(distinct id) from unnest(ordered_scenario_ids) as id) <> stored_count
     or exists (
       select requested.id
       from unnest(ordered_scenario_ids) as requested(id)
       except
       select scenario.id
       from public.saved_scenarios as scenario
       where scenario.folder_id = folder_to_reorder
     ) then
    raise exception 'Scenario order must contain every scenario in the folder exactly once';
  end if;

  set constraints saved_scenarios_folder_position_key deferred;

  update public.saved_scenarios as scenario
     set position = requested.ordinality::integer
    from unnest(ordered_scenario_ids) with ordinality as requested(id, ordinality)
   where scenario.id = requested.id
     and scenario.folder_id = folder_to_reorder;

  return query
    select scenario.*
      from public.saved_scenarios as scenario
     where scenario.folder_id = folder_to_reorder
     order by scenario.position asc, scenario.scenario_number asc;
end;
$$;

drop function if exists public.delete_scenario_folder(uuid);

revoke execute on function public.create_saved_scenario(uuid, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.create_saved_scenario_with_auto_folder(text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.move_saved_scenario(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.reorder_saved_scenarios(uuid, uuid[])
  from public, anon, authenticated;

grant execute on function public.create_saved_scenario(uuid, text, jsonb)
  to service_role;
grant execute on function public.create_saved_scenario_with_auto_folder(text, jsonb)
  to service_role;
grant execute on function public.move_saved_scenario(uuid, uuid)
  to service_role;
grant execute on function public.reorder_saved_scenarios(uuid, uuid[])
  to service_role;

grant select, insert, update, delete on table public.scenario_folders to service_role;
grant select, insert, update, delete on table public.saved_scenarios to service_role;
