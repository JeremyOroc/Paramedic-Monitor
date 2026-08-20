-- Keep the reorder function's empty search_path while resolving its deferrable
-- unique constraint explicitly from the public schema.

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
     order by scenario.position asc, scenario.scenario_number asc;
end;
$$;

revoke execute on function public.reorder_saved_scenarios(uuid, uuid[])
  from public, anon, authenticated;
grant execute on function public.reorder_saved_scenarios(uuid, uuid[])
  to service_role;
