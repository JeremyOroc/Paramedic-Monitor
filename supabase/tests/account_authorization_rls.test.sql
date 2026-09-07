begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

select has_table(
  'public',
  'account_profiles',
  'account_profiles exists'
);

select has_table(
  'public',
  'reserved_account_usernames',
  'reserved_account_usernames exists'
);

select col_is_pk(
  'public',
  'account_profiles',
  'user_id',
  'account profile identity is the immutable Auth user ID'
);

insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'instructor-one@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'instructor-two@example.test'),
  ('10000000-0000-0000-0000-000000000003', 'disabled@example.test'),
  ('10000000-0000-0000-0000-000000000004', 'administrator@example.test'),
  ('10000000-0000-0000-0000-000000000005', 'reserved-misuse@example.test'),
  ('10000000-0000-0000-0000-000000000006', 'duplicate@example.test'),
  ('10000000-0000-0000-0000-000000000007', 'invalid@example.test');

insert into public.account_profiles (user_id, username, role, status)
values
  ('10000000-0000-0000-0000-000000000001', 'Instructor.One', 'instructor', 'enabled'),
  ('10000000-0000-0000-0000-000000000002', 'Instructor.Two', 'instructor', 'enabled'),
  ('10000000-0000-0000-0000-000000000003', 'Disabled.User', 'instructor', 'disabled');

set local role service_role;

select results_eq(
  $$select username from public.reserved_account_usernames order by normalized_username$$,
  $$values ('Branden'::text), ('Jeremy'::text), ('Zoid'::text)$$,
  'the server role can read the protected reserved-name source'
);

select lives_ok(
  $$
    insert into public.account_profiles (user_id, username, role)
    values ('10000000-0000-0000-0000-000000000004', 'Zoid', 'administrator')
  $$,
  'a reserved username can be deliberately provisioned as an Administrator'
);

reset role;

select throws_ok(
  $$
    insert into public.account_profiles (user_id, username, role)
    values ('10000000-0000-0000-0000-000000000005', 'Branden', 'instructor')
  $$,
  '23514',
  'reserved username requires administrator role',
  'a reserved username cannot be claimed by an Instructor'
);

select throws_like(
  $$
    insert into public.account_profiles (user_id, username)
    values ('10000000-0000-0000-0000-000000000007', ' bad-name ')
  $$,
  '%account_profiles_username_%',
  'untrimmed usernames are rejected'
);

select throws_like(
  $$
    insert into public.account_profiles (user_id, username)
    values ('10000000-0000-0000-0000-000000000007', 'bad name')
  $$,
  '%account_profiles_username_format%',
  'usernames containing spaces are rejected'
);

select throws_like(
  $$
    insert into public.account_profiles (user_id, username)
    values ('10000000-0000-0000-0000-000000000006', 'instructor.one')
  $$,
  '%account_profiles_normalized_username_key%',
  'usernames are unique without regard to case'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

select results_eq(
  $$select username from public.account_profiles order by username$$,
  $$values ('Instructor.One'::text)$$,
  'an enabled Instructor sees only their own profile'
);

select ok(
  private.current_account_is_enabled(),
  'the live profile marks the Instructor as enabled'
);

select ok(
  not private.current_account_is_administrator(),
  'an Instructor is not an Administrator'
);

select throws_ok(
  $$select * from public.reserved_account_usernames$$,
  '42501',
  'permission denied for table reserved_account_usernames',
  'an authenticated Account cannot read reserved-name data directly'
);

select throws_ok(
  $$
    insert into public.account_profiles (user_id, username)
    values ('10000000-0000-0000-0000-000000000006', 'New.User')
  $$,
  '42501',
  'permission denied for table account_profiles',
  'an authenticated Account cannot create a profile directly'
);

select throws_ok(
  $$update public.account_profiles set role = 'administrator' where user_id = auth.uid()$$,
  '42501',
  'permission denied for table account_profiles',
  'an authenticated Account cannot promote itself'
);

select throws_ok(
  $$delete from public.account_profiles where user_id = auth.uid()$$,
  '42501',
  'permission denied for table account_profiles',
  'an authenticated Account cannot delete its profile'
);

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';

select results_eq(
  $$select username from public.account_profiles$$,
  $$values ('Zoid'::text)$$,
  'an enabled Administrator still sees only their own profile'
);

select ok(
  private.current_account_is_enabled(),
  'the live profile marks the Administrator as enabled'
);

select ok(
  private.current_account_is_administrator(),
  'Administrator authority comes from the live profile role'
);

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';

select is_empty(
  $$select user_id from public.account_profiles$$,
  'a disabled Account cannot read even its own profile'
);

select ok(
  not private.current_account_is_enabled(),
  'a disabled Account fails the live enabled check'
);

select ok(
  not private.current_account_is_administrator(),
  'a disabled Account cannot hold active Administrator authority'
);

set local role anon;
set local request.jwt.claim.sub = '';

select throws_ok(
  $$select * from public.account_profiles$$,
  '42501',
  'permission denied for table account_profiles',
  'an anonymous caller cannot read Account profiles'
);

select throws_ok(
  $$select private.current_account_is_enabled()$$,
  '42501',
  'permission denied for schema private',
  'an anonymous caller cannot invoke authorization helpers'
);

select * from finish();
rollback;
