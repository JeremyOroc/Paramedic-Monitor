begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

select has_column(
  'public',
  'scenario_folders',
  'library_kind',
  'scenario folders identify their fixed library area'
);

select has_column(
  'public',
  'scenario_folders',
  'owner_user_id',
  'Personal folders carry an immutable Account owner'
);

select has_table(
  'public',
  'template_scenario_audit_log',
  'Template mutations have a protected audit table'
);

select results_eq(
  $$
    select library_kind, owner_user_id
    from public.scenario_folders
    where name = 'General'
  $$,
  $$values ('template'::text, null::uuid)$$,
  'the existing global library is converted to Templates in place'
);

insert into auth.users (id, email)
values
  ('20000000-0000-0000-0000-000000000001', 'scenario-one@example.test'),
  ('20000000-0000-0000-0000-000000000002', 'scenario-two@example.test'),
  ('20000000-0000-0000-0000-000000000003', 'scenario-disabled@example.test'),
  ('20000000-0000-0000-0000-000000000004', 'scenario-admin@example.test');

insert into public.account_profiles (user_id, username, role, status)
values
  ('20000000-0000-0000-0000-000000000001', 'Scenario.One', 'instructor', 'enabled'),
  ('20000000-0000-0000-0000-000000000002', 'Scenario.Two', 'instructor', 'enabled'),
  ('20000000-0000-0000-0000-000000000003', 'Scenario.Disabled', 'instructor', 'disabled'),
  ('20000000-0000-0000-0000-000000000004', 'Jeremy', 'administrator', 'enabled');

insert into public.scenario_folders (
  id,
  name,
  library_kind,
  owner_user_id,
  position
) values
  (
    '21000000-0000-0000-0000-000000000001',
    'One Personal',
    'personal',
    '20000000-0000-0000-0000-000000000001',
    1
  ),
  (
    '21000000-0000-0000-0000-000000000002',
    'Two Personal',
    'personal',
    '20000000-0000-0000-0000-000000000002',
    1
  );

insert into public.saved_scenarios (
  id,
  folder_id,
  scenario_number,
  title,
  snapshot,
  position
) values (
  '22000000-0000-0000-0000-000000000002',
  '21000000-0000-0000-0000-000000000002',
  1,
  'Other Personal Scenario',
  '{"version":"1"}'::jsonb,
  1
);

set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000004';

select lives_ok(
  $$
    insert into public.scenario_folders (
      id,
      name,
      library_kind,
      owner_user_id
    ) values (
      '21000000-0000-0000-0000-000000000010',
      'Administrator Template',
      'template',
      null
    )
  $$,
  'an enabled Administrator can create a Template folder'
);

select lives_ok(
  $$
    select public.create_saved_scenario(
      '21000000-0000-0000-0000-000000000010',
      'Shared Template',
      '{"version":"1"}'::jsonb
    )
  $$,
  'an enabled Administrator can create a Template scenario'
);

select lives_ok(
  $$
    update public.scenario_folders
    set name = 'Renamed Template'
    where id = '21000000-0000-0000-0000-000000000010'
  $$,
  'an enabled Administrator can edit a Template folder'
);

select results_eq(
  $$
    select count(*)
    from public.scenario_folders
    where library_kind = 'personal'
  $$,
  array[0::bigint],
  'an Administrator cannot browse another Account Personal folders'
);

select throws_ok(
  $$select * from public.template_scenario_audit_log$$,
  '42501',
  'permission denied for table template_scenario_audit_log',
  'Administrators cannot read the operator-only audit table through the app role'
);

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';

select results_eq(
  $$
    select name
    from public.scenario_folders
    order by library_kind, position, name
  $$,
  $$
    values
      ('One Personal'::text),
      ('General'::text),
      ('Renamed Template'::text)
  $$,
  'an Instructor reads Templates and only their own Personal folders'
);

select lives_ok(
  $$
    insert into public.scenario_folders (
      id,
      name,
      library_kind,
      owner_user_id
    ) values (
      '21000000-0000-0000-0000-000000000003',
      'One More',
      'personal',
      '20000000-0000-0000-0000-000000000001'
    )
  $$,
  'an Instructor can create their own Personal folder'
);

select throws_ok(
  $$
    insert into public.scenario_folders (
      name,
      library_kind,
      owner_user_id
    ) values (
      'Wrong Owner',
      'personal',
      '20000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "scenario_folders"',
  'an Instructor cannot create a Personal folder for another Account'
);

select throws_ok(
  $$
    insert into public.scenario_folders (name, library_kind)
    values ('Unauthorized Template', 'template')
  $$,
  '42501',
  'new row violates row-level security policy for table "scenario_folders"',
  'an Instructor cannot create a Template folder'
);

select lives_ok(
  $$
    select public.create_saved_scenario(
      '21000000-0000-0000-0000-000000000001',
      'My Scenario',
      '{"version":"1"}'::jsonb
    )
  $$,
  'an Instructor can create a scenario in their Personal folder'
);

select results_eq(
  $$
    select title
    from public.saved_scenarios
    order by title
  $$,
  $$values ('My Scenario'::text), ('Shared Template'::text)$$,
  'an Instructor reads shared Templates and their Personal scenarios only'
);

select is_empty(
  $$
    update public.saved_scenarios
    set title = 'Changed by Instructor'
    where title = 'Shared Template'
    returning id
  $$,
  'an Instructor cannot update a shared Template scenario'
);

select is_empty(
  $$
    delete from public.saved_scenarios
    where title = 'Shared Template'
    returning id
  $$,
  'an Instructor cannot delete a shared Template scenario'
);

select throws_like(
  $$
    select public.move_saved_scenario(
      (select id from public.saved_scenarios where title = 'Shared Template'),
      '21000000-0000-0000-0000-000000000001'
    )
  $$,
  '%Saved scenario not found%',
  'an Instructor cannot move a Template into Personal storage'
);

select throws_ok(
  $$
    insert into public.template_scenario_audit_log (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      entity_name
    ) values (
      '20000000-0000-0000-0000-000000000001',
      'create',
      'folder',
      gen_random_uuid(),
      'Forged audit'
    )
  $$,
  '42501',
  'permission denied for table template_scenario_audit_log',
  'Accounts cannot forge Template audit entries'
);

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000003';

select is_empty(
  $$select id from public.scenario_folders$$,
  'a disabled Account cannot read Personal folders or Templates'
);

set local role anon;
set local request.jwt.claim.sub = '';

select throws_ok(
  $$select * from public.scenario_folders$$,
  '42501',
  'permission denied for table scenario_folders',
  'an anonymous caller cannot read scenario folders'
);

select throws_ok(
  $$select * from public.saved_scenarios$$,
  '42501',
  'permission denied for table saved_scenarios',
  'an anonymous caller cannot read saved scenarios'
);

reset role;

select results_eq(
  $$
    select action, entity_type, actor_user_id
    from public.template_scenario_audit_log
    order by created_at, entity_type, action
  $$,
  $$
    values
      ('create'::text, 'folder'::text, '20000000-0000-0000-0000-000000000004'::uuid),
      ('update'::text, 'folder'::text, '20000000-0000-0000-0000-000000000004'::uuid),
      ('create'::text, 'scenario'::text, '20000000-0000-0000-0000-000000000004'::uuid)
  $$,
  'Template mutations record the immutable Administrator identity and action'
);

select throws_like(
  $$
    update public.scenario_folders
    set library_kind = 'template', owner_user_id = null
    where id = '21000000-0000-0000-0000-000000000001'
  $$,
  '%Scenario folder ownership cannot be changed%',
  'folder ownership scope is immutable even for privileged database callers'
);

select throws_like(
  $$
    update public.saved_scenarios
    set folder_id = '21000000-0000-0000-0000-000000000010'
    where title = 'My Scenario'
  $$,
  '%Scenarios cannot move between Personal and Templates%',
  'scenarios cannot be reclassified by moving between fixed areas'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_saved_scenario(uuid,text,jsonb)',
    'EXECUTE'
  ),
  'authenticated Accounts can execute the RLS-protected create RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_saved_scenario(uuid,text,jsonb)',
    'EXECUTE'
  ),
  'anonymous callers cannot execute scenario mutation RPCs'
);

select lives_ok(
  $$
    delete from public.account_profiles
    where user_id = '20000000-0000-0000-0000-000000000002'
  $$,
  'deleting an Account cascades its Personal library'
);

select is_empty(
  $$
    select id
    from public.scenario_folders
    where owner_user_id = '20000000-0000-0000-0000-000000000002'
  $$,
  'no Personal folders remain after Account deletion'
);

select is_empty(
  $$
    select scenario.id
    from public.saved_scenarios as scenario
    where scenario.id = '22000000-0000-0000-0000-000000000002'
  $$,
  'Personal scenarios cascade with their deleted Account folders'
);

select * from finish();
rollback;
