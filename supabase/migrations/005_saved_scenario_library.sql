-- Global folder-based library for reusable instructor scenario drafts.
-- The legacy `scenarios` table remains untouched for the deferred timed-state builder.

create table if not exists scenario_folders (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  is_general  boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint scenario_folders_trimmed_name_check
    check (name = btrim(name) and char_length(name) > 0)
);

create unique index if not exists scenario_folders_name_lower_idx
  on scenario_folders (lower(name));

create unique index if not exists scenario_folders_single_general_idx
  on scenario_folders (is_general)
  where is_general;

insert into scenario_folders (name, is_general)
values ('General', true)
on conflict do nothing;

create table if not exists saved_scenarios (
  id               uuid        primary key default gen_random_uuid(),
  folder_id        uuid        references scenario_folders(id) on delete restrict not null,
  scenario_number  integer     unique not null check (scenario_number > 0),
  title            text        not null check (title = btrim(title) and char_length(title) > 0),
  snapshot         jsonb       not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint saved_scenarios_snapshot_version_check
    check (snapshot->>'version' = '1')
);

create index if not exists saved_scenarios_folder_updated_idx
  on saved_scenarios (folder_id, updated_at desc, scenario_number asc);

create or replace function set_scenario_library_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scenario_folders_set_updated_at on scenario_folders;
create trigger scenario_folders_set_updated_at
before update on scenario_folders
for each row execute function set_scenario_library_updated_at();

drop trigger if exists saved_scenarios_set_updated_at on saved_scenarios;
create trigger saved_scenarios_set_updated_at
before update on saved_scenarios
for each row execute function set_scenario_library_updated_at();

create or replace function protect_general_scenario_folder()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_general then
      raise exception 'General folder cannot be deleted';
    end if;
    return old;
  end if;

  if old.is_general and (new.name is distinct from old.name or not new.is_general) then
    raise exception 'General folder cannot be renamed or changed';
  end if;
  return new;
end;
$$;

drop trigger if exists scenario_folders_protect_general on scenario_folders;
create trigger scenario_folders_protect_general
before update or delete on scenario_folders
for each row execute function protect_general_scenario_folder();

create or replace function create_saved_scenario(
  folder_id uuid,
  requested_title text,
  scenario_snapshot jsonb
)
returns saved_scenarios
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
  inserted saved_scenarios;
begin
  perform pg_advisory_xact_lock(hashtext('saved_scenarios_number'));

  if not exists (select 1 from scenario_folders where id = folder_id) then
    raise exception 'Scenario folder not found';
  end if;

  select min(candidate)
    into next_number
    from generate_series(
      1,
      (select coalesce(max(scenario_number), 0) + 1 from saved_scenarios)
    ) as candidate
    left join saved_scenarios existing
      on existing.scenario_number = candidate
   where existing.scenario_number is null;

  insert into saved_scenarios (
    folder_id,
    scenario_number,
    title,
    snapshot
  ) values (
    folder_id,
    next_number,
    coalesce(nullif(btrim(requested_title), ''), 'Scenario ' || next_number),
    scenario_snapshot
  )
  returning * into inserted;

  return inserted;
end;
$$;

create or replace function delete_scenario_folder(folder_to_delete uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target scenario_folders;
  general_id uuid;
begin
  select * into target
    from scenario_folders
   where id = folder_to_delete
   for update;

  if target.id is null then
    raise exception 'Scenario folder not found';
  end if;
  if target.is_general then
    raise exception 'General folder cannot be deleted';
  end if;

  select id into general_id
    from scenario_folders
   where is_general
   for update;

  if general_id is null then
    raise exception 'General folder is missing';
  end if;

  update saved_scenarios
     set folder_id = general_id
   where folder_id = folder_to_delete;

  delete from scenario_folders where id = folder_to_delete;
  return general_id;
end;
$$;

alter table scenario_folders enable row level security;
alter table saved_scenarios enable row level security;

revoke all on scenario_folders from anon, authenticated;
revoke all on saved_scenarios from anon, authenticated;
revoke execute on function create_saved_scenario(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function delete_scenario_folder(uuid) from public, anon, authenticated;
grant execute on function create_saved_scenario(uuid, text, jsonb) to service_role;
grant execute on function delete_scenario_folder(uuid) to service_role;
