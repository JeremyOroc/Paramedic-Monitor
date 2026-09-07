import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260907032643_phase_3_scenario_ownership.sql',
  ),
  'utf8',
)

describe('Phase 3 scenario ownership migration', () => {
  it('converts the existing library to Templates without deleting its data', () => {
    expect(migration).toContain("add column library_kind text not null default 'template'")
    expect(migration).toContain('add column owner_user_id uuid')
    expect(migration).toContain('on delete cascade')
    expect(migration).not.toMatch(/delete\s+from\s+public\.saved_scenarios/i)
    expect(migration).not.toMatch(/delete\s+from\s+public\.scenario_folders/i)
  })

  it('isolates Personal folders and permits enabled Accounts to read Templates', () => {
    expect(migration).toContain('scenario_folders_personal_name_lower_idx')
    expect(migration).toContain("library_kind = 'template'")
    expect(migration).toContain('owner_user_id = (select auth.uid())')
    expect(migration).toContain('(select private.current_account_is_enabled())')
  })

  it('limits Template writes to Administrators and records their identity', () => {
    expect(migration).toContain('(select private.current_account_is_administrator())')
    expect(migration).toContain('template_scenario_audit_log')
    expect(migration).toContain('actor uuid := (select auth.uid())')
    expect(migration).toMatch(
      /revoke all on table public\.template_scenario_audit_log[\s\S]+from public, anon, authenticated/i,
    )
  })

  it('uses authenticated RLS for library CRUD while denying anonymous callers', () => {
    expect(migration).toMatch(
      /grant select, insert, update, delete on table public\.scenario_folders to authenticated, service_role/i,
    )
    expect(migration).toMatch(
      /revoke execute on function public\.create_saved_scenario\(uuid, text, jsonb\)[\s\S]+from public, anon/i,
    )
    expect(migration).toMatch(
      /grant execute on function public\.create_saved_scenario\(uuid, text, jsonb\)[\s\S]+to authenticated, service_role/i,
    )
  })
})
