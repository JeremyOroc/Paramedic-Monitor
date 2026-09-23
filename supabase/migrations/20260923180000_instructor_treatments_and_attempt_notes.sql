-- Instructor Treatments and Attempt notes.
--
-- Treatments remain participant-scoped assessed actions. General Notes and
-- Instructor Notes belong to the Attempt itself and are copied into the
-- self-contained Evaluation report.

alter table public.student_events
  drop constraint if exists student_events_kind_check;

alter table public.student_events
  add constraint student_events_kind_check check (kind in (
    'acknowledge',
    'arrival',
    'transport',
    'medication',
    'treatment',
    'analyze',
    'charge',
    'shock',
    'etco2_calibration',
    'nibp_start',
    'nibp_result',
    'power_on',
    'power_off',
    'twelve_lead',
    'twelve_lead_capture',
    'twelve_lead_send',
    'print',
    'etco2_toggle',
    'energy_change',
    'treatment_menu',
    'patient_info',
    'sample_ask',
    'opqrst_ask'
  ));

alter table public.session_attempts
  add column if not exists general_notes text not null default '';

alter table public.session_attempts
  drop constraint if exists session_attempts_general_notes_length;

alter table public.session_attempts
  add constraint session_attempts_general_notes_length
  check (char_length(general_notes) <= 4000);

create table public.session_instructor_notes (
  id              uuid        primary key default gen_random_uuid(),
  session_id      uuid        not null references public.sessions(id) on delete cascade,
  attempt_version integer     not null check (attempt_version >= 1),
  body            text        not null,
  occurred_at     timestamptz not null default now(),
  constraint session_instructor_notes_body_length
    check (char_length(trim(body)) between 1 and 1000)
);

create index session_instructor_notes_attempt_idx
  on public.session_instructor_notes (session_id, attempt_version, occurred_at, id);

alter table public.session_instructor_notes enable row level security;
revoke all on table public.session_instructor_notes from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.session_instructor_notes to service_role;

alter table public.evaluation_reports
  add column if not exists general_notes text not null default '',
  add column if not exists instructor_notes jsonb not null default '[]'::jsonb;

alter table public.evaluation_reports
  add constraint evaluation_reports_general_notes_length
    check (char_length(general_notes) <= 4000),
  add constraint evaluation_reports_instructor_notes_array
    check (jsonb_typeof(instructor_notes) = 'array');

grant update (general_notes) on table public.evaluation_reports to authenticated;

alter table public.evaluation_report_audit_log
  drop constraint if exists evaluation_report_audit_log_action_check;

alter table public.evaluation_report_audit_log
  add constraint evaluation_report_audit_log_action_check check (action in (
    'create',
    'attempt_name_update',
    'student_names_update',
    'general_notes_update',
    'manual_completion',
    'delete',
    'product_correction'
  ));

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
    raise exception using errcode = '22001', message = 'Attempt name must be 60 characters or fewer';
  end if;

  if char_length(new.general_notes) > 4000 then
    raise exception using errcode = '22001', message = 'General Notes must be 4000 characters or fewer';
  end if;
  if jsonb_typeof(new.instructor_notes) <> 'array' then
    raise exception using errcode = '22023', message = 'Instructor Notes must be a list';
  end if;

  if coalesce(array_length(new.student_names, 1), 0) > 100 then
    raise exception using errcode = '22001', message = 'No more than 100 Student names are allowed';
  end if;
  foreach candidate in array coalesce(new.student_names, '{}'::text[]) loop
    candidate := trim(candidate);
    if candidate <> '' then
      if char_length(candidate) > 100 then
        raise exception using errcode = '22001', message = 'Each Student name must be 100 characters or fewer';
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
  if new.general_notes is distinct from old.general_notes then
    insert into public.evaluation_report_audit_log (report_id, actor_user_id, action)
    values (new.id, actor, 'general_notes_update');
  end if;
  if old.status = 'incomplete' and new.status = 'complete' and new.completion_method = 'manual' then
    insert into public.evaluation_report_audit_log (report_id, actor_user_id, action)
    values (new.id, actor, 'manual_completion');
  end if;
  return new;
end;
$$;

create or replace function private.hydrate_evaluation_report_attempt_notes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(attempt.general_notes, '')
    into new.general_notes
    from public.session_attempts as attempt
   where attempt.session_id = new.source_session_id
     and attempt.attempt_version = new.attempt_version;
  new.general_notes := coalesce(new.general_notes, '');

  select coalesce(jsonb_agg(to_jsonb(note) order by note.occurred_at, note.id), '[]'::jsonb)
    into new.instructor_notes
    from (
      select id, session_id, attempt_version, body, occurred_at
        from public.session_instructor_notes
       where session_id = new.source_session_id
         and attempt_version = new.attempt_version
    ) as note;
  return new;
end;
$$;

drop trigger if exists evaluation_reports_attempt_notes_hydrate on public.evaluation_reports;
create trigger evaluation_reports_attempt_notes_hydrate
before insert on public.evaluation_reports
for each row execute function private.hydrate_evaluation_report_attempt_notes();

create or replace function private.sync_attempt_general_notes_to_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.evaluation_reports
     set general_notes = new.general_notes
   where source_session_id = new.session_id
     and attempt_version = new.attempt_version;
  return new;
end;
$$;

drop trigger if exists session_attempts_sync_evaluation_report_general_notes on public.session_attempts;
create trigger session_attempts_sync_evaluation_report_general_notes
after insert or update of general_notes on public.session_attempts
for each row execute function private.sync_attempt_general_notes_to_report();

create or replace function private.append_instructor_note_to_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.evaluation_reports
     set instructor_notes = instructor_notes || jsonb_build_array(to_jsonb(new))
   where source_session_id = new.session_id
     and attempt_version = new.attempt_version;
  return new;
end;
$$;

drop trigger if exists session_instructor_notes_append_evaluation_report on public.session_instructor_notes;
create trigger session_instructor_notes_append_evaluation_report
after insert on public.session_instructor_notes
for each row execute function private.append_instructor_note_to_report();
