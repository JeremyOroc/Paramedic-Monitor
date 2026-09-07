-- Phase 7 production operations — enforce the one-year pilot retention floor
-- for privacy-minimized Template and Evaluation-report audit records.

revoke all on function private.purge_evaluation_report_audit(timestamptz)
  from service_role;

create or replace function private.purge_account_audits(p_before timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  template_removed bigint;
  report_removed bigint;
begin
  if p_before is null or p_before > now() - interval '1 year' then
    raise exception 'audit retention cutoff must be at least one year old'
      using errcode = '22023';
  end if;

  delete from public.template_scenario_audit_log
  where created_at < p_before;
  get diagnostics template_removed = row_count;

  delete from public.evaluation_report_audit_log
  where created_at < p_before;
  get diagnostics report_removed = row_count;

  return jsonb_build_object(
    'templateAuditRows', template_removed,
    'reportAuditRows', report_removed
  );
end;
$$;

revoke all on function private.purge_account_audits(timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function private.purge_account_audits(timestamptz)
  to service_role;
