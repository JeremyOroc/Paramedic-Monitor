-- Account implementation Phase 3 — Personal and Template scenario ownership.
--
-- Existing global folders and scenarios become shared Templates in place. New
-- Personal folders belong to one immutable Auth identity. Authenticated API
-- calls use RLS; the server secret is no longer the normal library data path.

alter table public.scenario_folders
  add column library_kind text not null default 'template',
  add column owner_user_id uuid references public.account_profiles(user_id) on delete cascade;

alter table public.scenario_folders
  add constraint scenario_folders_library_kind_check
    check (library_kind in ('personal', 'template')),
  add constraint scenario_folders_owner_scope_check
    check (
      (library_kind = 'template' and owner_user_id is null)
      or (library_kind = 'personal' and owner_user_id is not null)
    );

drop index if exists public.scenario_folders_name_lower_idx;
alter table public.scenario_folders
  drop constraint if exists scenario_folders_position_key;
drop index if exists public.scenario_folders_position_idx;

create unique index scenario_folders_template_name_lower_idx
  on public.scenario_folders (lower(name))
  where library_kind = 'template';

create unique index scenario_folders_personal_name_lower_idx
  on public.scenario_folders (owner_user_id, lower(name))
  where library_kind = 'personal';

alter table public.scenario_folders
  add constraint scenario_folders_scope_position_key
  unique nulls not distinct (library_kind, owner_user_id, position)
  deferrable initially immediate;

create index scenario_folders_owner_access_idx
  on public.scenario_folders (owner_user_id, position, id)
  where library_kind = 'personal';

alter table public.saved_scenarios
  drop constraint if exists saved_scenarios_scenario_number_key;

alter table public.saved_scenarios
  add constraint saved_scenarios_folder_number_key
  unique (folder_id, scenario_number);

create table public.template_scenario_audit_log (
  id            uuid        primary key default gen_random_uuid(),
  actor_user_id uuid        not null,
  action        text        not null,
  entity_type   text        not null,
  entity_id     uuid        not null,
  entity_name   text        not null,
  created_at    timestamptz not null default now(),

  constraint template_scenario_audit_log_action_check
    check (action in ('create', 'update', 'move', 'reorder', 'delete')),
  constraint template_scenario_audit_log_entity_type_check
    check (entity_type in ('folder', 'scenario')),
  constraint template_scenario_audit_log_entity_name_check
    check (entity_name = btrim(entity_name) and char_length(entity_name) > 0)
);

create index template_scenario_audit_log_created_idx
  on public.template_scenario_audit_log (created_at desc, id);

create index template_scenario_audit_log_actor_idx
  on public.template_scenario_audit_log (actor_user_id, created_at desc);

alter table public.template_scenario_audit_log enable row level security;

revoke all on table public.template_scenario_audit_log
  from public, anon, authenticated;
grant select on table public.template_scenario_audit_log to service_role;

create or replace function private.enforce_scenario_folder_scope_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.library_kind is distinct from old.library_kind
     or new.owner_user_id is distinct from old.owner_user_id
  then
    raise exception 'Scenario folder ownership cannot be changed';
  end if;
  return new;
end;
$$;

create trigger scenario_folders_enforce_scope_immutable
before update of library_kind, owner_user_id on public.scenario_folders
for each row execute function private.enforce_scenario_folder_scope_immutable();

create or replace function private.enforce_saved_scenario_scope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_kind text;
  source_owner uuid;
  target_kind text;
  target_owner uuid;
begin
  select folder.library_kind, folder.owner_user_id
    into target_kind, target_owner
    from public.scenario_folders as folder
   where folder.id = new.folder_id;

  if target_kind is null then
    raise exception 'Scenario folder not found';
  end if;

  if tg_op = 'UPDATE' and new.folder_id is distinct from old.folder_id then
    select folder.library_kind, folder.owner_user_id
      into source_kind, source_owner
      from public.scenario_folders as folder
     where folder.id = old.folder_id;

    if source_kind is distinct from target_kind
       or source_owner is distinct from target_owner
    then
      raise exception 'Scenarios cannot move between Personal and Templates';
    end if;
  end if;

  return new;
end;
$$;

create trigger saved_scenarios_enforce_scope
before insert or update of folder_id on public.saved_scenarios
for each row execute function private.enforce_saved_scenario_scope();

create or replace function private.audit_template_folder_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  is_template boolean;
  audit_action text;
  audit_id uuid;
  audit_name text;
begin
  is_template := case
    when tg_op = 'DELETE' then old.library_kind = 'template'
    else new.library_kind = 'template'
  end;
  if not is_template then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if actor is null then
    raise exception 'Template mutations require an authenticated Administrator';
  end if;

  audit_action := case
    when tg_op = 'INSERT' then 'create'
    when tg_op = 'DELETE' then 'delete'
    when new.name is distinct from old.name then 'update'
    when new.position is distinct from old.position then 'reorder'
    else 'update'
  end;
  audit_id := case when tg_op = 'DELETE' then old.id else new.id end;
  audit_name := case when tg_op = 'DELETE' then old.name else new.name end;

  insert into public.template_scenario_audit_log (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    entity_name
  ) values (actor, audit_action, 'folder', audit_id, audit_name);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger scenario_folders_audit_template_mutation
after insert or update or delete on public.scenario_folders
for each row execute function private.audit_template_folder_mutation();

create or replace function private.audit_template_scenario_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  source_is_template boolean := false;
  target_is_template boolean := false;
  audit_action text;
  audit_id uuid;
  audit_name text;
begin
  if tg_op <> 'INSERT' then
    select folder.library_kind = 'template'
      into source_is_template
      from public.scenario_folders as folder
     where folder.id = old.folder_id;
  end if;
  if tg_op <> 'DELETE' then
    select folder.library_kind = 'template'
      into target_is_template
      from public.scenario_folders as folder
     where folder.id = new.folder_id;
  end if;

  if not coalesce(source_is_template, false)
     and not coalesce(target_is_template, false)
  then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if actor is null then
    raise exception 'Template mutations require an authenticated Administrator';
  end if;

  audit_action := case
    when tg_op = 'INSERT' then 'create'
    when tg_op = 'DELETE' then 'delete'
    when new.folder_id is distinct from old.folder_id then 'move'
    when new.position is distinct from old.position then 'reorder'
    else 'update'
  end;
  audit_id := case when tg_op = 'DELETE' then old.id else new.id end;
  audit_name := case when tg_op = 'DELETE' then old.title else new.title end;

  insert into public.template_scenario_audit_log (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    entity_name
  ) values (actor, audit_action, 'scenario', audit_id, audit_name);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger saved_scenarios_audit_template_mutation
after insert or update or delete on public.saved_scenarios
for each row execute function private.audit_template_scenario_mutation();

drop trigger if exists scenario_folders_assign_position on public.scenario_folders;

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
      from public.scenario_folders as folder
     where folder.library_kind = new.library_kind
       and folder.owner_user_id is not distinct from new.owner_user_id;
  end if;
  return new;
end;
$$;

create trigger scenario_folders_assign_position
before insert on public.scenario_folders
for each row execute function public.assign_scenario_folder_position();

drop trigger if exists scenario_folders_compact_positions on public.scenario_folders;

create or replace function public.compact_scenario_folder_positions()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  set constraints public.scenario_folders_scope_position_key deferred;

  with ranked as (
    select
      folder.id,
      row_number() over (
        order by folder.position, lower(folder.name), folder.id
      )::integer as next_position
    from public.scenario_folders as folder
    where folder.library_kind = old.library_kind
      and folder.owner_user_id is not distinct from old.owner_user_id
  )
  update public.scenario_folders as folder
     set position = ranked.next_position
    from ranked
   where folder.id = ranked.id
     and folder.position <> ranked.next_position;
  return old;
end;
$$;

create trigger scenario_folders_compact_positions
after delete on public.scenario_folders
for each row execute function public.compact_scenario_folder_positions();

drop function if exists public.reorder_scenario_folders(uuid[]);

create function public.reorder_scenario_folders(
  library_scope text,
  ordered_folder_ids uuid[]
)
returns setof public.scenario_folders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  scope_owner uuid;
  stored_count integer;
begin
  if library_scope not in ('personal', 'template') then
    raise exception 'Invalid scenario library scope';
  end if;
  if library_scope = 'personal' then
    scope_owner := (select auth.uid());
    if scope_owner is null then
      raise exception 'Authentication required';
    end if;
  elsif not (select private.current_account_is_administrator()) then
    raise exception 'Administrator access required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('scenario_library_write'));
  set constraints public.scenario_folders_scope_position_key deferred;

  select count(*)::integer
    into stored_count
    from public.scenario_folders as folder
   where folder.library_kind = library_scope
     and folder.owner_user_id is not distinct from scope_owner;

  if cardinality(ordered_folder_ids) <> stored_count
     or (select count(distinct id) from unnest(ordered_folder_ids) as id) <> stored_count
     or exists (
       select requested.id
       from unnest(ordered_folder_ids) as requested(id)
       except
       select folder.id
       from public.scenario_folders as folder
       where folder.library_kind = library_scope
         and folder.owner_user_id is not distinct from scope_owner
     ) then
    raise exception 'Folder order must contain every folder in the area exactly once';
  end if;

  update public.scenario_folders as folder
     set position = requested.ordinality::integer
    from unnest(ordered_folder_ids) with ordinality as requested(id, ordinality)
   where folder.id = requested.id
     and folder.library_kind = library_scope
     and folder.owner_user_id is not distinct from scope_owner;

  return query
    select folder.*
      from public.scenario_folders as folder
     where folder.library_kind = library_scope
       and folder.owner_user_id is not distinct from scope_owner
     order by folder.position, lower(folder.name), folder.id;
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
      (
        select coalesce(max(existing.scenario_number), 0) + 1
        from public.saved_scenarios as existing
        where existing.folder_id = create_saved_scenario.folder_id
      )
    ) as candidate
    left join public.saved_scenarios as existing
      on existing.folder_id = create_saved_scenario.folder_id
     and existing.scenario_number = candidate
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
  account_id uuid := (select auth.uid());
  next_folder_number integer;
  created_folder_id uuid;
  inserted public.saved_scenarios;
begin
  if account_id is null then
    raise exception 'Authentication required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('scenario_library_write'));

  if exists (
    select 1
    from public.scenario_folders as folder
    where folder.library_kind = 'personal'
      and folder.owner_user_id = account_id
  ) then
    raise exception 'Select a Personal folder before saving';
  end if;

  select min(candidate)
    into next_folder_number
    from generate_series(1, 1000000) as candidate
    left join public.scenario_folders as existing
      on existing.library_kind = 'personal'
     and existing.owner_user_id = account_id
     and lower(existing.name) = lower('Folder ' || candidate)
   where existing.id is null;

  insert into public.scenario_folders (
    name,
    library_kind,
    owner_user_id
  ) values (
    'Folder ' || next_folder_number,
    'personal',
    account_id
  )
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

  set constraints public.saved_scenarios_folder_position_key deferred;

  update public.saved_scenarios as scenario
     set position = requested.ordinality::integer
    from unnest(ordered_scenario_ids) with ordinality as requested(id, ordinality)
   where scenario.id = requested.id
     and scenario.folder_id = folder_to_reorder;

  return query
    select scenario.*
      from public.saved_scenarios as scenario
     where scenario.folder_id = folder_to_reorder
     order by scenario.position, scenario.scenario_number;
end;
$$;

drop policy if exists "scenario_folders: enabled account reads accessible" on public.scenario_folders;
create policy "scenario_folders: enabled account reads accessible"
on public.scenario_folders
for select
to authenticated
using (
  (select private.current_account_is_enabled())
  and (
    library_kind = 'template'
    or owner_user_id = (select auth.uid())
  )
);

drop policy if exists "scenario_folders: account creates allowed scope" on public.scenario_folders;
create policy "scenario_folders: account creates allowed scope"
on public.scenario_folders
for insert
to authenticated
with check (
  (select private.current_account_is_enabled())
  and (
    (library_kind = 'personal' and owner_user_id = (select auth.uid()))
    or (
      library_kind = 'template'
      and owner_user_id is null
      and (select private.current_account_is_administrator())
    )
  )
);

drop policy if exists "scenario_folders: account updates allowed scope" on public.scenario_folders;
create policy "scenario_folders: account updates allowed scope"
on public.scenario_folders
for update
to authenticated
using (
  (library_kind = 'personal' and owner_user_id = (select auth.uid()))
  or (library_kind = 'template' and (select private.current_account_is_administrator()))
)
with check (
  (select private.current_account_is_enabled())
  and (
    (library_kind = 'personal' and owner_user_id = (select auth.uid()))
    or (library_kind = 'template' and (select private.current_account_is_administrator()))
  )
);

drop policy if exists "scenario_folders: account deletes allowed scope" on public.scenario_folders;
create policy "scenario_folders: account deletes allowed scope"
on public.scenario_folders
for delete
to authenticated
using (
  (select private.current_account_is_enabled())
  and (
    (library_kind = 'personal' and owner_user_id = (select auth.uid()))
    or (library_kind = 'template' and (select private.current_account_is_administrator()))
  )
);

drop policy if exists "saved_scenarios: enabled account reads accessible" on public.saved_scenarios;
create policy "saved_scenarios: enabled account reads accessible"
on public.saved_scenarios
for select
to authenticated
using (
  (select private.current_account_is_enabled())
  and exists (
    select 1
    from public.scenario_folders as folder
    where folder.id = saved_scenarios.folder_id
      and (
        folder.library_kind = 'template'
        or folder.owner_user_id = (select auth.uid())
      )
  )
);

drop policy if exists "saved_scenarios: account creates in allowed scope" on public.saved_scenarios;
create policy "saved_scenarios: account creates in allowed scope"
on public.saved_scenarios
for insert
to authenticated
with check (
  (select private.current_account_is_enabled())
  and exists (
    select 1
    from public.scenario_folders as folder
    where folder.id = saved_scenarios.folder_id
      and (
        (folder.library_kind = 'personal' and folder.owner_user_id = (select auth.uid()))
        or (
          folder.library_kind = 'template'
          and (select private.current_account_is_administrator())
        )
      )
  )
);

drop policy if exists "saved_scenarios: account updates in allowed scope" on public.saved_scenarios;
create policy "saved_scenarios: account updates in allowed scope"
on public.saved_scenarios
for update
to authenticated
using (
  exists (
    select 1
    from public.scenario_folders as folder
    where folder.id = saved_scenarios.folder_id
      and (
        (folder.library_kind = 'personal' and folder.owner_user_id = (select auth.uid()))
        or (
          folder.library_kind = 'template'
          and (select private.current_account_is_administrator())
        )
      )
  )
)
with check (
  (select private.current_account_is_enabled())
  and exists (
    select 1
    from public.scenario_folders as folder
    where folder.id = saved_scenarios.folder_id
      and (
        (folder.library_kind = 'personal' and folder.owner_user_id = (select auth.uid()))
        or (
          folder.library_kind = 'template'
          and (select private.current_account_is_administrator())
        )
      )
  )
);

drop policy if exists "saved_scenarios: account deletes in allowed scope" on public.saved_scenarios;
create policy "saved_scenarios: account deletes in allowed scope"
on public.saved_scenarios
for delete
to authenticated
using (
  (select private.current_account_is_enabled())
  and exists (
    select 1
    from public.scenario_folders as folder
    where folder.id = saved_scenarios.folder_id
      and (
        (folder.library_kind = 'personal' and folder.owner_user_id = (select auth.uid()))
        or (
          folder.library_kind = 'template'
          and (select private.current_account_is_administrator())
        )
      )
  )
);

revoke all on table public.scenario_folders from public, anon, authenticated;
revoke all on table public.saved_scenarios from public, anon, authenticated;
grant select, insert, update, delete on table public.scenario_folders to authenticated, service_role;
grant select, insert, update, delete on table public.saved_scenarios to authenticated, service_role;

revoke execute on function public.create_saved_scenario(uuid, text, jsonb)
  from public, anon;
revoke execute on function public.create_saved_scenario_with_auto_folder(text, jsonb)
  from public, anon;
revoke execute on function public.move_saved_scenario(uuid, uuid)
  from public, anon;
revoke execute on function public.reorder_saved_scenarios(uuid, uuid[])
  from public, anon;
revoke execute on function public.reorder_scenario_folders(text, uuid[])
  from public, anon;

grant execute on function public.create_saved_scenario(uuid, text, jsonb)
  to authenticated, service_role;
grant execute on function public.create_saved_scenario_with_auto_folder(text, jsonb)
  to authenticated, service_role;
grant execute on function public.move_saved_scenario(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.reorder_saved_scenarios(uuid, uuid[])
  to authenticated, service_role;
grant execute on function public.reorder_scenario_folders(text, uuid[])
  to authenticated, service_role;

revoke execute on function private.enforce_scenario_folder_scope_immutable()
  from public, anon, authenticated;
revoke execute on function private.enforce_saved_scenario_scope()
  from public, anon, authenticated;
revoke execute on function private.audit_template_folder_mutation()
  from public, anon, authenticated;
revoke execute on function private.audit_template_scenario_mutation()
  from public, anon, authenticated;
