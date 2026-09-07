begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select has_function(
  'private',
  'purge_account_audits',
  array['timestamp with time zone'],
  'Phase 7 provides one guarded Account-audit purge primitive'
);

select ok(
  has_function_privilege(
    'service_role',
    'private.purge_account_audits(timestamp with time zone)',
    'EXECUTE'
  ),
  'service_role may invoke the guarded purge primitive'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.purge_account_audits(timestamp with time zone)',
    'EXECUTE'
  ),
  'browser Accounts cannot invoke audit retention'
);

select ok(
  not has_function_privilege(
    'service_role',
    'private.purge_evaluation_report_audit(timestamp with time zone)',
    'EXECUTE'
  ),
  'the former unrestricted report-only purge is no longer available to service_role'
);

select throws_ok(
  $$select private.purge_account_audits(now() - interval '30 days')$$,
  '22023',
  'audit retention cutoff must be at least one year old',
  'the purge refuses a cutoff newer than the one-year pilot retention floor'
);

insert into public.template_scenario_audit_log (
  actor_user_id, action, entity_type, entity_id, entity_name, created_at
) values
  ('70000000-0000-0000-0000-000000000001', 'create', 'scenario', '71000000-0000-0000-0000-000000000001', 'Old template audit', now() - interval '400 days'),
  ('70000000-0000-0000-0000-000000000001', 'update', 'scenario', '71000000-0000-0000-0000-000000000002', 'Retained template audit', now() - interval '100 days');

insert into public.evaluation_report_audit_log (
  report_id, actor_user_id, action, created_at
) values
  ('72000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'create', now() - interval '400 days'),
  ('72000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'manual_completion', now() - interval '100 days');

select is(
  private.purge_account_audits(now() - interval '365 days'),
  '{"reportAuditRows": 1, "templateAuditRows": 1}'::jsonb,
  'the guarded purge reports only expired audit rows'
);

select is(
  (select count(*) from public.template_scenario_audit_log),
  1::bigint,
  'Template audit rows inside the one-year window remain'
);

select is(
  (select count(*) from public.evaluation_report_audit_log),
  1::bigint,
  'Evaluation-report audit rows inside the one-year window remain'
);

select * from finish();

rollback;
