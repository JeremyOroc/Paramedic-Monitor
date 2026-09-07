import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260907194832_phase_7_audit_retention.sql'),
  'utf8',
)

describe('Phase 7 Account-audit retention migration contract', () => {
  it('guards the accepted one-year pilot retention floor', () => {
    expect(migration).toContain("p_before > now() - interval '1 year'")
    expect(migration).toContain("errcode = '22023'")
    expect(migration).toMatch(
      /revoke all on function private\.purge_evaluation_report_audit\(timestamptz\)[\s\S]+from service_role/i,
    )
  })

  it('purges both privacy-minimized audit stores behind one protected function', () => {
    expect(migration).toContain('delete from public.template_scenario_audit_log')
    expect(migration).toContain('delete from public.evaluation_report_audit_log')
    expect(migration).toContain(
      'revoke all on function private.purge_account_audits(timestamptz)',
    )
    expect(migration).toContain(
      'grant execute on function private.purge_account_audits(timestamptz)',
    )
  })
})
