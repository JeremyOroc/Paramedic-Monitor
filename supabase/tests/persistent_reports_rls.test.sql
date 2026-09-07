begin;

create extension if not exists pgtap with schema extensions;

select plan(35);

select has_table('public', 'evaluation_reports', 'durable Evaluation reports have their own table');
select has_table('public', 'evaluation_report_audit_log', 'report mutations have a protected audit table');
select col_is_fk('public', 'evaluation_reports', 'owner_user_id', 'report ownership references Auth identity');
select col_not_null('public', 'evaluation_reports', 'scenario_snapshot', 'every report stores a scenario snapshot');
select has_index('public', 'evaluation_reports', 'evaluation_reports_owner_started_idx', 'owner and newest-first reads are indexed');
select has_index('public', 'evaluation_reports', 'evaluation_reports_owner_status_started_idx', 'status-filtered owner reads are indexed');
select is(
  (select relrowsecurity from pg_class where oid = 'public.evaluation_reports'::regclass),
  true,
  'report RLS is enabled'
);

insert into auth.users (id, email)
values
  ('40000000-0000-0000-0000-000000000001', 'report-one@example.test'),
  ('40000000-0000-0000-0000-000000000002', 'report-two@example.test');

insert into public.account_profiles (user_id, username, role, status)
values
  ('40000000-0000-0000-0000-000000000001', 'Report.One', 'instructor', 'enabled'),
  ('40000000-0000-0000-0000-000000000002', 'Report.Two', 'instructor', 'enabled');

insert into public.sessions (id, code, owner_user_id, status, active_attempt_version)
values (
  '41000000-0000-0000-0000-000000000001',
  'RPT001',
  '40000000-0000-0000-0000-000000000001',
  'waiting',
  1
);

insert into public.session_state (session_id, state, version)
values (
  '41000000-0000-0000-0000-000000000001',
  '{"scenarioTitleConfirmed":"Cardiac arrest","defibrillatorModelConfirmed":"wagamiZ","confirmed":{"hr":40},"dispatchRouteConfirmed":{"geometry":[[1,2]],"destination":"Hospital"}}'::jsonb,
  1
);

insert into public.participants (id, session_id, nickname, token_hash)
values (
  '42000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  'Trainee One',
  repeat('a', 64)
);

insert into public.participant_attempts (session_id, participant_id, attempt_version)
values (
  '41000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000001',
  1
);

insert into public.session_state_history (session_id, attempt_version, version, state)
values (
  '41000000-0000-0000-0000-000000000001',
  1,
  1,
  '{"scenarioTitleConfirmed":"Cardiac arrest","confirmed":{"hr":40}}'::jsonb
);

insert into public.student_events (
  id, session_id, participant_id, attempt_version, kind, label, state_version
) values (
  '43000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000001',
  1,
  'analyze',
  'Analyze',
  1
);

update public.sessions
set status = 'active'
where id = '41000000-0000-0000-0000-000000000001';

select is(
  (select count(*) from public.evaluation_reports),
  1::bigint,
  'starting an Attempt creates exactly one report'
);
select results_eq(
  $$select scenario_name, defibrillator_model, status from public.evaluation_reports$$,
  $$values ('Cardiac arrest'::text, 'wagamiZ'::text, 'incomplete'::text)$$,
  'the report captures scenario identity and begins Incomplete'
);
select is(
  (select scenario_snapshot #> '{dispatchRouteConfirmed,geometry}' from public.evaluation_reports),
  null::jsonb,
  'the immutable scenario snapshot excludes derived route geometry'
);
select is(
  (select jsonb_array_length(participants) from public.evaluation_reports),
  1,
  'participants already present at Attempt start are copied'
);
select is(
  (select jsonb_array_length(participant_attempts) from public.evaluation_reports),
  1,
  'participant Attempt timing already present is copied'
);
select is(
  (select jsonb_array_length(events) from public.evaluation_reports),
  1,
  'trainee events already present are copied'
);
select is(
  (select jsonb_array_length(state_history) from public.evaluation_reports),
  1,
  'instructor history already present is copied'
);
select results_eq(
  $$select action from public.evaluation_report_audit_log order by created_at, action$$,
  $$values ('create'::text)$$,
  'report creation writes a content-free audit action'
);

insert into public.session_state_history (session_id, attempt_version, version, state)
values ('41000000-0000-0000-0000-000000000001', 1, 2, '{"confirmed":{"hr":80}}'::jsonb);
insert into public.student_events (
  id, session_id, participant_id, attempt_version, kind, label, state_version
) values (
  '43000000-0000-0000-0000-000000000002',
  '41000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000001',
  1,
  'shock',
  'Shock delivered',
  2
);

select results_eq(
  $$select jsonb_array_length(events), jsonb_array_length(state_history) from public.evaluation_reports$$,
  $$values (2, 2)$$,
  'new trainee and instructor rows autosave into the durable report'
);

insert into public.session_attempts (session_id, attempt_version, label)
values ('41000000-0000-0000-0000-000000000001', 1, 'Morning cohort');

select results_eq(
  $$select attempt_label from public.evaluation_reports$$,
  $$values ('Morning cohort'::text)$$,
  'live Attempt renaming stays synchronized'
);
select ok(
  exists(select 1 from public.evaluation_report_audit_log where action = 'attempt_name_update'),
  'Attempt-name changes are audited without their value'
);

update public.sessions
set active_attempt_version = 2, status = 'waiting'
where id = '41000000-0000-0000-0000-000000000001';

select results_eq(
  $$select status, completion_method from public.evaluation_reports where attempt_version = 1$$,
  $$values ('complete'::text, 'attempt_transition'::text)$$,
  'New Attempt completes the outgoing report'
);

update public.sessions
set status = 'active'
where id = '41000000-0000-0000-0000-000000000001';
update public.sessions
set status = 'ended'
where id = '41000000-0000-0000-0000-000000000001';

select results_eq(
  $$select status, completion_method from public.evaluation_reports where attempt_version = 2$$,
  $$values ('incomplete'::text, null::text)$$,
  'a passive status end such as expiry never silently completes the current report'
);

set local role authenticated;
set local request.jwt.claim.sub = '40000000-0000-0000-0000-000000000001';

select is(
  (select count(*) from public.evaluation_reports),
  2::bigint,
  'an enabled owner reads all of their own reports'
);
select lives_ok(
  $$update public.evaluation_reports set student_names = array[' Alice ', '', 'Alice'] where attempt_version = 2$$,
  'an owner may edit Student names'
);
select results_eq(
  $$select student_names from public.evaluation_reports where attempt_version = 2$$,
  $$values (array['Alice', 'Alice']::text[])$$,
  'Student names are trimmed, blanks removed, and duplicates preserved'
);
select throws_ok(
  $$update public.evaluation_reports set scenario_snapshot = '{}'::jsonb where attempt_version = 2$$,
  '42501',
  'permission denied for table evaluation_reports',
  'a browser cannot alter captured report content'
);
select throws_like(
  $$update public.evaluation_reports set attempt_label = repeat('x', 61) where attempt_version = 2$$,
  '%Attempt name must be 60 characters or fewer%',
  'Attempt names keep their 60-character boundary'
);
select throws_like(
  $$update public.evaluation_reports set status = 'complete', completion_method = 'room_ended', completed_at = now() where attempt_version = 2$$,
  '%Accounts may only mark reports complete manually%',
  'a browser cannot forge a system completion reason'
);
select lives_ok(
  $$update public.evaluation_reports set status = 'complete', completion_method = 'manual', completed_at = now() where attempt_version = 2$$,
  'an owner may manually complete an abandoned report'
);
reset role;
select ok(
  exists(select 1 from public.evaluation_report_audit_log where action = 'manual_completion'),
  'manual completion writes a content-free audit action'
);
set local role authenticated;
set local request.jwt.claim.sub = '40000000-0000-0000-0000-000000000001';
select throws_ok(
  $$select * from public.evaluation_report_audit_log$$,
  '42501',
  'permission denied for table evaluation_report_audit_log',
  'app Accounts cannot read the operator-only audit table'
);

set local request.jwt.claim.sub = '40000000-0000-0000-0000-000000000002';
select is_empty(
  $$select id from public.evaluation_reports$$,
  'another Account cannot discover report rows'
);

set local request.jwt.claim.sub = '40000000-0000-0000-0000-000000000001';
select lives_ok(
  $$delete from public.evaluation_reports where attempt_version = 1$$,
  'the owner may permanently delete a report'
);

reset role;
select ok(
  exists(select 1 from public.evaluation_report_audit_log where action = 'delete'),
  'the deletion audit survives report deletion'
);
select throws_like(
  $$update public.evaluation_reports set owner_user_id = '40000000-0000-0000-0000-000000000002' where attempt_version = 2$$,
  '%Report identity and scenario snapshot are immutable%',
  'report ownership cannot be transferred'
);
select lives_ok(
  $$delete from auth.users where id = '40000000-0000-0000-0000-000000000001'$$,
  'an operator may deliberately delete the owning Account'
);
select is(
  (select count(*) from public.evaluation_reports),
  0::bigint,
  'deliberate Account deletion cascades retained reports'
);

select * from finish();
rollback;
