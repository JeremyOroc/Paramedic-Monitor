begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

select results_eq(
  $$
    select table_name::text collate "C", privilege_type::text collate "C"
      from information_schema.table_privileges
     where grantee = 'service_role'
       and table_schema = 'public'
       and table_name in ('participant_attempts', 'participants', 'session_state', 'student_events')
       and privilege_type in ('DELETE', 'INSERT', 'SELECT', 'UPDATE')
     order by table_name, privilege_type
  $$,
  $$
    values
      ('participant_attempts'::text collate "C", 'INSERT'::text collate "C"),
      ('participant_attempts'::text collate "C", 'SELECT'::text collate "C"),
      ('participant_attempts'::text collate "C", 'UPDATE'::text collate "C"),
      ('participants'::text collate "C", 'INSERT'::text collate "C"),
      ('participants'::text collate "C", 'SELECT'::text collate "C"),
      ('participants'::text collate "C", 'UPDATE'::text collate "C"),
      ('session_state'::text collate "C", 'INSERT'::text collate "C"),
      ('session_state'::text collate "C", 'SELECT'::text collate "C"),
      ('session_state'::text collate "C", 'UPDATE'::text collate "C"),
      ('student_events'::text collate "C", 'INSERT'::text collate "C"),
      ('student_events'::text collate "C", 'SELECT'::text collate "C")
  $$,
  'service_role has exactly the DML privileges used by protected live-Room routes'
);

select is_empty(
  $$
    select table_name
      from information_schema.table_privileges
     where grantee in ('anon', 'authenticated', 'PUBLIC')
       and table_schema = 'public'
       and table_name in ('participant_attempts', 'participants', 'session_state', 'student_events')
       and privilege_type in ('DELETE', 'INSERT', 'SELECT', 'UPDATE')
  $$,
  'browser and public roles have no direct live-Room table privileges'
);

select has_column(
  'public',
  'sessions',
  'owner_user_id',
  'Rooms carry an immutable Auth user owner'
);

select col_not_null(
  'public',
  'sessions',
  'owner_user_id',
  'every Room requires an owner'
);

select col_not_null(
  'public',
  'sessions',
  'expires_at',
  'every Room has a fixed expiry'
);

select col_is_fk(
  'public',
  'sessions',
  'owner_user_id',
  'Room ownership references Auth identity'
);

select has_table(
  'public',
  'session_controllers',
  'browser controller fences have a protected table'
);

select hasnt_table(
  'public',
  'session_hosts',
  'the legacy host-token authorization table is retired'
);

select has_index(
  'public',
  'sessions',
  'sessions_one_live_room_per_owner_idx',
  'one-live-Room-per-Account is database enforced'
);

select is(
  (select count(*) from public.sessions),
  0::bigint,
  'legacy temporary Rooms are removed during the ownership rollout'
);

insert into auth.users (id, email)
values
  ('30000000-0000-0000-0000-000000000001', 'room-one@example.test'),
  ('30000000-0000-0000-0000-000000000002', 'room-two@example.test'),
  ('30000000-0000-0000-0000-000000000003', 'room-disabled@example.test');

insert into public.account_profiles (user_id, username, role, status)
values
  ('30000000-0000-0000-0000-000000000001', 'Room.One', 'instructor', 'enabled'),
  ('30000000-0000-0000-0000-000000000002', 'Room.Two', 'instructor', 'enabled'),
  ('30000000-0000-0000-0000-000000000003', 'Room.Disabled', 'instructor', 'disabled');

insert into public.sessions (id, code, owner_user_id, status)
values
  ('31000000-0000-0000-0000-000000000001', 'ROOM01', '30000000-0000-0000-0000-000000000001', 'active'),
  ('31000000-0000-0000-0000-000000000002', 'ROOM02', '30000000-0000-0000-0000-000000000002', 'waiting'),
  ('31000000-0000-0000-0000-000000000003', 'ROOM03', '30000000-0000-0000-0000-000000000003', 'active');

insert into public.session_controllers (session_id, token_hash)
values
  ('31000000-0000-0000-0000-000000000001', repeat('a', 64)),
  ('31000000-0000-0000-0000-000000000002', repeat('b', 64)),
  ('31000000-0000-0000-0000-000000000003', repeat('c', 64));

insert into public.participants (id, session_id, nickname, token_hash)
values (
  '32000000-0000-0000-0000-000000000003',
  '31000000-0000-0000-0000-000000000003',
  'Trainee',
  repeat('d', 64)
);

insert into public.participant_attempts (
  session_id,
  participant_id,
  attempt_version
) values (
  '31000000-0000-0000-0000-000000000003',
  '32000000-0000-0000-0000-000000000003',
  1
);

set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000001';

select results_eq(
  $$select code from public.sessions order by code$$,
  $$values ('ROOM01'::text)$$,
  'an enabled Account sees only its own Room'
);

select throws_ok(
  $$
    insert into public.sessions (code, owner_user_id)
    values ('FORGED', '30000000-0000-0000-0000-000000000001')
  $$,
  '42501',
  'permission denied for table sessions',
  'an Account cannot bypass server controller fencing to create a Room'
);

select throws_ok(
  $$update public.sessions set status = 'ended' where code = 'ROOM01'$$,
  '42501',
  'permission denied for table sessions',
  'an Account cannot mutate its Room through the Data API'
);

select throws_ok(
  $$delete from public.sessions where code = 'ROOM01'$$,
  '42501',
  'permission denied for table sessions',
  'an Account cannot delete its Room through the Data API'
);

select throws_ok(
  $$select * from public.session_controllers$$,
  '42501',
  'permission denied for table session_controllers',
  'controller hashes are never exposed to Account browsers'
);

set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000002';

select results_eq(
  $$select code from public.sessions order by code$$,
  $$values ('ROOM02'::text)$$,
  'a second Account sees only its own Room'
);

set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000003';

select is_empty(
  $$select code from public.sessions$$,
  'a disabled Account cannot observe its Room'
);

set local role anon;
set local request.jwt.claim.sub = '';

select throws_ok(
  $$select * from public.sessions$$,
  '42501',
  'permission denied for table sessions',
  'an anonymous browser cannot browse Rooms'
);

reset role;

-- Prepare the disabled-Account lifecycle test without opening the Room as a
-- side effect. Re-enabling never reopens or changes existing Room state.
update public.account_profiles
set status = 'enabled'
where user_id = '30000000-0000-0000-0000-000000000003';

select throws_like(
  $$
    update public.sessions
       set owner_user_id = '30000000-0000-0000-0000-000000000002'
     where id = '31000000-0000-0000-0000-000000000001'
  $$,
  '%room owner is immutable%',
  'Room ownership cannot be transferred even by privileged code'
);

select throws_like(
  $$
    insert into public.sessions (code, owner_user_id)
    values ('SECOND', '30000000-0000-0000-0000-000000000001')
  $$,
  '%sessions_one_live_room_per_owner_idx%',
  'one Account cannot have two waiting or active Rooms'
);

select lives_ok(
  $$
    update public.sessions set status = 'ended'
    where id = '31000000-0000-0000-0000-000000000001';
    insert into public.sessions (id, code, owner_user_id)
    values (
      '31000000-0000-0000-0000-000000000011',
      'SECOND',
      '30000000-0000-0000-0000-000000000001'
    );
  $$,
  'ending a Room releases the Account live-Room slot'
);

select throws_like(
  $$
    insert into public.session_controllers (session_id, token_hash)
    values ('31000000-0000-0000-0000-000000000011', 'not-a-hash')
  $$,
  '%session_controllers_token_hash_format%',
  'controller hashes must use the expected digest format'
);

select throws_like(
  $$
    insert into public.session_controllers (session_id, token_hash, claim_version)
    values (
      '31000000-0000-0000-0000-000000000011',
      repeat('e', 64),
      0
    )
  $$,
  '%session_controllers_claim_version_positive%',
  'controller claim versions cannot move below one'
);

select lives_ok(
  $$
    update public.account_profiles
    set status = 'disabled'
    where user_id = '30000000-0000-0000-0000-000000000003'
  $$,
  'disabling an Account ends its active work transactionally'
);

select results_eq(
  $$
    select status
    from public.sessions
    where id = '31000000-0000-0000-0000-000000000003'
  $$,
  $$values ('ended'::text)$$,
  'disabling an Account immediately ends its live Room'
);

select ok(
  (
    select completed_at is not null
    from public.participant_attempts
    where participant_id = '32000000-0000-0000-0000-000000000003'
  ),
  'disabling an Account closes its current trainee attempt'
);

select lives_ok(
  $$
    update public.account_profiles
    set status = 'enabled'
    where user_id = '30000000-0000-0000-0000-000000000003'
  $$,
  'an operator may re-enable the Account later'
);

select results_eq(
  $$
    select status
    from public.sessions
    where id = '31000000-0000-0000-0000-000000000003'
  $$,
  $$values ('ended'::text)$$,
  're-enabling an Account does not reopen its ended Room'
);

select lives_ok(
  $$delete from auth.users where id = '30000000-0000-0000-0000-000000000002'$$,
  'an operator may delete the Auth identity'
);

select is_empty(
  $$
    select id from public.sessions
    where owner_user_id = '30000000-0000-0000-0000-000000000002'
  $$,
  'deleting the Auth identity cascades its temporary Rooms'
);

select is_empty(
  $$
    select session_id from public.session_controllers
    where session_id = '31000000-0000-0000-0000-000000000002'
  $$,
  'deleting a Room cascades its controller fence'
);

select * from finish();
rollback;
