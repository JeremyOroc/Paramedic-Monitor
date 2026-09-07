-- Account implementation Phase 5 — persistent Evaluation reports.
--
-- Live Room tables remain optimized for the active classroom workflow and may
-- be removed later. Each Attempt therefore receives one self-contained durable
-- report row. Source identifiers are intentionally not foreign keys: deleting
-- temporary Room state must never erase a retained Evaluation record.

create table public.evaluation_reports (
  id                    uuid        primary key default gen_random_uuid(),
  owner_user_id         uuid        not null references auth.users(id) on delete cascade,
  source_session_id     uuid        not null,
  source_room_code      text        not null,
  attempt_version       integer     not null check (attempt_version >= 1),
  attempt_label         text        not null default '',
  scenario_name         text        not null default 'Untitled Scenario',
  defibrillator_model   text        check (defibrillator_model in ('wagamiX', 'wagamiZ')),
  scenario_snapshot     jsonb       not null default '{}'::jsonb,
  participants          jsonb       not null default '[]'::jsonb,
  participant_attempts  jsonb       not null default '[]'::jsonb,
  events                jsonb       not null default '[]'::jsonb,
  state_history         jsonb       not null default '[]'::jsonb,
  student_names         text[]      not null default '{}'::text[],
  status                text        not null default 'incomplete'
    check (status in ('incomplete', 'complete')),
  completion_method     text
    check (completion_method in ('attempt_transition', 'room_ended', 'manual', 'account_disabled')),
  started_at            timestamptz not null default now(),
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint evaluation_reports_source_attempt_unique
    unique (source_session_id, attempt_version),
  constraint evaluation_reports_completion_consistent check (
    (status = 'incomplete' and completion_method is null and completed_at is null)
    or
    (status = 'complete' and completion_method is not null and completed_at is not null)
  )
);

create index evaluation_reports_owner_started_idx
  on public.evaluation_reports (owner_user_id, started_at desc, id desc);
create index evaluation_reports_owner_status_started_idx
  on public.evaluation_reports (owner_user_id, status, started_at desc, id desc);

alter table public.evaluation_reports enable row level security;

revoke all on table public.evaluation_reports from public, anon, authenticated, service_role;
grant select on table public.evaluation_reports to authenticated;
grant update (attempt_label, student_names, status, completion_method, completed_at)
  on table public.evaluation_reports to authenticated;
grant delete on table public.evaluation_reports to authenticated;
grant select, insert, update, delete on table public.evaluation_reports to service_role;

create policy "evaluation reports: enabled owner reads"
on public.evaluation_reports
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select private.current_account_is_enabled())
);

create policy "evaluation reports: enabled owner edits"
on public.evaluation_reports
for update
to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select private.current_account_is_enabled())
)
with check (
  owner_user_id = (select auth.uid())
  and (select private.current_account_is_enabled())
);

create policy "evaluation reports: enabled owner deletes"
on public.evaluation_reports
for delete
to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select private.current_account_is_enabled())
);

-- Audit rows deliberately contain no Attempt name, Student name, scenario
-- content, or timeline content. A deletion entry survives deletion of both the
-- report and, eventually, its Account.
create table public.evaluation_report_audit_log (
  id            uuid        primary key default gen_random_uuid(),
  report_id     uuid        not null,
  actor_user_id uuid        not null,
  action        text        not null check (action in (
    'create',
    'attempt_name_update',
    'student_names_update',
    'manual_completion',
    'delete',
    'product_correction'
  )),
  created_at    timestamptz not null default now()
);

create index evaluation_report_audit_created_idx
  on public.evaluation_report_audit_log (created_at);
create index evaluation_report_audit_report_idx
  on public.evaluation_report_audit_log (report_id, created_at);

alter table public.evaluation_report_audit_log enable row level security;
revoke all on table public.evaluation_report_audit_log from public, anon, authenticated, service_role;
grant select, insert, delete on table public.evaluation_report_audit_log to service_role;

-- Normalize editable metadata and protect the immutable report identity and
-- captured record. Column grants already keep browsers away from content
-- arrays; this trigger also protects privileged application code from mistakes.
create or replace function private.prepare_evaluation_report_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  candidate text;
  normalized_names text[] := '{}'::text[];
begin
  new.attempt_label := regexp_replace(trim(new.attempt_label), '\s+', ' ', 'g');
  if char_length(new.attempt_label) > 60 then
    raise exception using
      errcode = '22001',
      message = 'Attempt name must be 60 characters or fewer';
  end if;

  if coalesce(array_length(new.student_names, 1), 0) > 100 then
    raise exception using
      errcode = '22001',
      message = 'No more than 100 Student names are allowed';
  end if;
  foreach candidate in array coalesce(new.student_names, '{}'::text[]) loop
    candidate := trim(candidate);
    if candidate <> '' then
      if char_length(candidate) > 100 then
        raise exception using
          errcode = '22001',
          message = 'Each Student name must be 100 characters or fewer';
      end if;
      normalized_names := array_append(normalized_names, candidate);
    end if;
  end loop;
  new.student_names := normalized_names;

  if tg_op = 'UPDATE' then
    if new.owner_user_id is distinct from old.owner_user_id
      or new.source_session_id is distinct from old.source_session_id
      or new.source_room_code is distinct from old.source_room_code
      or new.attempt_version is distinct from old.attempt_version
      or new.scenario_name is distinct from old.scenario_name
      or new.defibrillator_model is distinct from old.defibrillator_model
      or new.scenario_snapshot is distinct from old.scenario_snapshot
      or new.started_at is distinct from old.started_at
      or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '23514',
        message = 'Report identity and scenario snapshot are immutable',
        constraint = 'evaluation_reports_immutable_snapshot';
    end if;
    if old.status = 'complete' and new.status <> 'complete' then
      raise exception using
        errcode = '23514',
        message = 'A completed report cannot be reopened',
        constraint = 'evaluation_reports_no_reopen';
    end if;
    if old.status = 'complete' and (
      new.completion_method is distinct from old.completion_method
      or new.completed_at is distinct from old.completed_at
    ) then
      raise exception using
        errcode = '23514',
        message = 'Report completion metadata is immutable',
        constraint = 'evaluation_reports_completion_immutable';
    end if;
    if current_user = 'authenticated'
      and old.status = 'incomplete'
      and new.status = 'complete'
      and new.completion_method <> 'manual' then
      raise exception using
        errcode = '23514',
        message = 'Accounts may only mark reports complete manually',
        constraint = 'evaluation_reports_manual_completion_only';
    end if;
  end if;

  if new.status = 'incomplete' then
    new.completion_method := null;
    new.completed_at := null;
  elsif new.completion_method is null then
    raise exception using errcode = '23514', message = 'Completion method is required';
  elsif new.completed_at is null then
    new.completed_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger evaluation_reports_prepare_write
before insert or update on public.evaluation_reports
for each row execute function private.prepare_evaluation_report_write();

create or replace function private.audit_evaluation_report_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
begin
  actor := coalesce(auth.uid(), case when tg_op = 'DELETE' then old.owner_user_id else new.owner_user_id end);
  if tg_op = 'INSERT' then
    insert into public.evaluation_report_audit_log (report_id, actor_user_id, action)
    values (new.id, actor, 'create');
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.evaluation_report_audit_log (report_id, actor_user_id, action)
    values (old.id, actor, 'delete');
    return old;
  end if;

  if new.attempt_label is distinct from old.attempt_label then
    insert into public.evaluation_report_audit_log (report_id, actor_user_id, action)
    values (new.id, actor, 'attempt_name_update');
  end if;
  if new.student_names is distinct from old.student_names then
    insert into public.evaluation_report_audit_log (report_id, actor_user_id, action)
    values (new.id, actor, 'student_names_update');
  end if;
  if old.status = 'incomplete' and new.status = 'complete' and new.completion_method = 'manual' then
    insert into public.evaluation_report_audit_log (report_id, actor_user_id, action)
    values (new.id, actor, 'manual_completion');
  end if;
  return new;
end;
$$;

create trigger evaluation_reports_audit_write
after insert or update or delete on public.evaluation_reports
for each row execute function private.audit_evaluation_report_write();

-- Build the durable row when the instructor starts an Attempt. Existing rows
-- are copied as well because participants can join and instructor state can be
-- sent while the Room is waiting.
create or replace function private.create_evaluation_report_for_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  captured_state jsonb;
  captured_name text;
  captured_model text;
begin
  if new.status <> 'active' or old.status = 'active' then
    return new;
  end if;

  select coalesce(state, '{}'::jsonb) #- '{dispatchRouteConfirmed,geometry}'
    into captured_state
    from public.session_state
   where session_id = new.id;
  captured_state := coalesce(captured_state, '{}'::jsonb);
  captured_name := coalesce(nullif(trim(captured_state ->> 'scenarioTitleConfirmed'), ''), 'Untitled Scenario');
  captured_model := nullif(captured_state ->> 'defibrillatorModelConfirmed', '');
  if captured_model not in ('wagamiX', 'wagamiZ') then
    captured_model := null;
  end if;

  insert into public.evaluation_reports (
    owner_user_id,
    source_session_id,
    source_room_code,
    attempt_version,
    attempt_label,
    scenario_name,
    defibrillator_model,
    scenario_snapshot,
    participants,
    participant_attempts,
    events,
    state_history,
    started_at
  )
  values (
    new.owner_user_id,
    new.id,
    new.code,
    new.active_attempt_version,
    coalesce((
      select label from public.session_attempts
       where session_id = new.id and attempt_version = new.active_attempt_version
    ), ''),
    captured_name,
    captured_model,
    captured_state,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nickname', p.nickname) order by p.joined_at, p.id)
        from public.participants p where p.session_id = new.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(to_jsonb(pa) - 'id' - 'session_id' order by pa.started_at, pa.participant_id)
        from public.participant_attempts pa
       where pa.session_id = new.id and pa.attempt_version = new.active_attempt_version
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(to_jsonb(e) order by e.occurred_at, e.id)
        from public.student_events e
       where e.session_id = new.id and e.attempt_version = new.active_attempt_version
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(to_jsonb(h) - 'id' - 'session_id' order by h.version)
        from public.session_state_history h
       where h.session_id = new.id and h.attempt_version = new.active_attempt_version
    ), '[]'::jsonb),
    now()
  )
  on conflict (source_session_id, attempt_version) do nothing;
  return new;
end;
$$;

create trigger sessions_create_evaluation_report
after update of status on public.sessions
for each row execute function private.create_evaluation_report_for_attempt();

create or replace function private.sync_evaluation_report_participants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.evaluation_reports r
     set participants = coalesce((
           select jsonb_agg(jsonb_build_object('id', p.id, 'nickname', p.nickname) order by p.joined_at, p.id)
             from public.participants p where p.session_id = new.session_id
         ), '[]'::jsonb),
         participant_attempts = coalesce((
           select jsonb_agg(to_jsonb(pa) - 'id' - 'session_id' order by pa.started_at, pa.participant_id)
             from public.participant_attempts pa
            where pa.session_id = new.session_id and pa.attempt_version = new.attempt_version
         ), '[]'::jsonb)
   where r.source_session_id = new.session_id
     and r.attempt_version = new.attempt_version;
  return new;
end;
$$;

create trigger participant_attempts_sync_evaluation_report
after insert or update on public.participant_attempts
for each row execute function private.sync_evaluation_report_participants();

create or replace function private.append_evaluation_report_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.evaluation_reports
     set events = events || jsonb_build_array(to_jsonb(new))
   where source_session_id = new.session_id
     and attempt_version = new.attempt_version;
  return new;
end;
$$;

create trigger student_events_append_evaluation_report
after insert on public.student_events
for each row execute function private.append_evaluation_report_event();

create or replace function private.append_evaluation_report_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.evaluation_reports
     set state_history = state_history || jsonb_build_array(to_jsonb(new) - 'id' - 'session_id')
   where source_session_id = new.session_id
     and attempt_version = new.attempt_version;
  return new;
end;
$$;

create trigger session_state_history_append_evaluation_report
after insert on public.session_state_history
for each row execute function private.append_evaluation_report_history();

create or replace function private.sync_evaluation_report_attempt_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.evaluation_reports
     set attempt_label = new.label
   where source_session_id = new.session_id
     and attempt_version = new.attempt_version;
  return new;
end;
$$;

create trigger session_attempts_sync_evaluation_report_name
after insert or update of label on public.session_attempts
for each row execute function private.sync_evaluation_report_attempt_name();

-- Only the Attempt-version transition auto-completes. Expiry changes status to
-- ended without changing the version and therefore deliberately leaves the
-- current report Incomplete for manual review.
create or replace function private.complete_evaluation_report_on_attempt_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active_attempt_version > old.active_attempt_version then
    update public.evaluation_reports
       set status = 'complete',
           completion_method = 'attempt_transition',
           completed_at = now()
     where source_session_id = old.id
       and attempt_version = old.active_attempt_version
       and status = 'incomplete';
  end if;
  return new;
end;
$$;

create trigger sessions_complete_evaluation_report_on_attempt
after update of active_attempt_version on public.sessions
for each row execute function private.complete_evaluation_report_on_attempt_transition();

-- Disabling an Account is an operator-driven Room end, unlike passive expiry.
-- Extend the Phase 4 cleanup trigger so the current durable report completes.
create or replace function private.end_rooms_for_disabled_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'enabled' and new.status = 'disabled' then
    update public.evaluation_reports as report
       set status = 'complete',
           completion_method = 'account_disabled',
           completed_at = now()
      from public.sessions as room
     where room.owner_user_id = new.user_id
       and room.status in ('waiting', 'active')
       and report.source_session_id = room.id
       and report.attempt_version = room.active_attempt_version
       and report.status = 'incomplete';

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

-- RLS-aware paginated search. It returns summaries only, keeping large timeline
-- arrays out of the list response.
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
      r.updated_at
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

-- Pilot audit retention is one year. Scheduling stays an operator concern;
-- this restricted function provides the safe purge primitive.
create or replace function private.purge_evaluation_report_audit(p_before timestamptz)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed bigint;
begin
  delete from public.evaluation_report_audit_log where created_at < p_before;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function private.prepare_evaluation_report_write() from public, anon, authenticated;
revoke all on function private.audit_evaluation_report_write() from public, anon, authenticated;
revoke all on function private.create_evaluation_report_for_attempt() from public, anon, authenticated;
revoke all on function private.sync_evaluation_report_participants() from public, anon, authenticated;
revoke all on function private.append_evaluation_report_event() from public, anon, authenticated;
revoke all on function private.append_evaluation_report_history() from public, anon, authenticated;
revoke all on function private.sync_evaluation_report_attempt_name() from public, anon, authenticated;
revoke all on function private.complete_evaluation_report_on_attempt_transition() from public, anon, authenticated;
revoke all on function private.purge_evaluation_report_audit(timestamptz) from public, anon, authenticated;

grant execute on function private.prepare_evaluation_report_write() to service_role;
grant execute on function private.audit_evaluation_report_write() to service_role;
grant execute on function private.create_evaluation_report_for_attempt() to service_role;
grant execute on function private.sync_evaluation_report_participants() to service_role;
grant execute on function private.append_evaluation_report_event() to service_role;
grant execute on function private.append_evaluation_report_history() to service_role;
grant execute on function private.sync_evaluation_report_attempt_name() to service_role;
grant execute on function private.complete_evaluation_report_on_attempt_transition() to service_role;
grant execute on function private.purge_evaluation_report_audit(timestamptz) to service_role;
