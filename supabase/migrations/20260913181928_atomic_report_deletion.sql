-- Compact Instructor library and page-scoped report deletion requirement.
--
-- A report for the current unexpired active Attempt is still being appended to.
-- Keep that record immutable from deletion at the RLS boundary, and expose one
-- bounded transaction primitive for current-page multi-delete.

drop policy if exists "evaluation reports: enabled owner deletes"
  on public.evaluation_reports;
create policy "evaluation reports: enabled owner deletes"
on public.evaluation_reports
for delete
to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select private.current_account_is_enabled())
  and not exists (
    select 1
    from public.sessions as room
    where room.id = evaluation_reports.source_session_id
      and room.owner_user_id = evaluation_reports.owner_user_id
      and room.status = 'active'
      and room.expires_at > now()
      and room.active_attempt_version = evaluation_reports.attempt_version
  )
);

create or replace function public.delete_evaluation_reports(
  p_report_ids uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  requested_count integer;
  matched_count integer;
  deleted_count integer;
begin
  if caller is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required';
  end if;

  requested_count := coalesce(cardinality(p_report_ids), 0);
  if requested_count < 1 or requested_count > 25 then
    raise exception using
      errcode = '22023',
      message = 'Select between 1 and 25 reports';
  end if;

  if (select count(distinct report_id) from unnest(p_report_ids) as selected(report_id))
      <> requested_count then
    raise exception using
      errcode = '22023',
      message = 'Each selected report must be unique';
  end if;

  -- Lock every requested owner row before validating the complete set. Missing
  -- or inaccessible IDs make the whole transaction fail rather than partially
  -- deleting the rows that happen to match.
  perform report.id
  from public.evaluation_reports as report
  where report.owner_user_id = caller
    and report.id = any(p_report_ids)
  order by report.id
  for update;

  select count(*)
    into matched_count
  from public.evaluation_reports as report
  where report.owner_user_id = caller
    and report.id = any(p_report_ids);

  if matched_count <> requested_count then
    raise exception using
      errcode = 'P0002',
      message = 'One or more reports were not found';
  end if;

  if exists (
    select 1
    from public.evaluation_reports as report
    join public.sessions as room
      on room.id = report.source_session_id
     and room.owner_user_id = report.owner_user_id
     and room.active_attempt_version = report.attempt_version
    where report.owner_user_id = caller
      and report.id = any(p_report_ids)
      and room.status = 'active'
      and room.expires_at > now()
  ) then
    raise exception using
      errcode = '55000',
      message = 'The active Attempt report cannot be deleted';
  end if;

  delete from public.evaluation_reports as report
  where report.owner_user_id = caller
    and report.id = any(p_report_ids);
  get diagnostics deleted_count = row_count;

  -- The DELETE policy repeats the active-Attempt check. If Room state changed
  -- between validation and deletion, a short delete rolls the transaction back.
  if deleted_count <> requested_count then
    raise exception using
      errcode = '55000',
      message = 'The selected reports changed and were not deleted';
  end if;

  return deleted_count;
end;
$$;

revoke all on function public.delete_evaluation_reports(uuid[])
  from public, anon, authenticated;
grant execute on function public.delete_evaluation_reports(uuid[])
  to authenticated;

-- Include deletion eligibility in the existing summary response without
-- exposing Room internals or adding a report-to-Room foreign key.
create or replace function public.search_evaluation_reports(
  p_owner uuid,
  p_status text default 'all',
  p_query text default '',
  p_from date default null,
  p_to date default null,
  p_offset integer default 0,
  p_limit integer default 25
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered as (
    select
      r.id,
      r.source_room_code,
      r.attempt_version,
      r.attempt_label,
      r.scenario_name,
      r.defibrillator_model,
      r.student_names,
      r.status,
      r.completion_method,
      r.started_at,
      r.completed_at,
      r.created_at,
      r.updated_at,
      exists (
        select 1
        from public.sessions as room
        where room.id = r.source_session_id
          and room.owner_user_id = r.owner_user_id
          and room.status = 'active'
          and room.expires_at > now()
          and room.active_attempt_version = r.attempt_version
      ) as deletion_blocked
    from public.evaluation_reports r
    where r.owner_user_id = p_owner
      and (p_status = 'all' or r.status = p_status)
      and (p_from is null or (r.started_at at time zone 'America/Toronto')::date >= p_from)
      and (p_to is null or (r.started_at at time zone 'America/Toronto')::date <= p_to)
      and (
        trim(p_query) = ''
        or lower(r.attempt_label) like '%' || lower(trim(p_query)) || '%'
        or lower(r.scenario_name) like '%' || lower(trim(p_query)) || '%'
        or lower(array_to_string(r.student_names, ' ')) like '%' || lower(trim(p_query)) || '%'
      )
  ),
  page as (
    select * from filtered
    order by started_at desc, id desc
    offset greatest(p_offset, 0)
    limit least(greatest(p_limit, 1), 25)
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page) order by started_at desc, id desc) from page), '[]'::jsonb),
    'total', (select count(*) from filtered)
  );
$$;

revoke all on function public.search_evaluation_reports(uuid, text, text, date, date, integer, integer)
  from public, anon, authenticated;
grant execute on function public.search_evaluation_reports(uuid, text, text, date, date, integer, integer)
  to authenticated;
