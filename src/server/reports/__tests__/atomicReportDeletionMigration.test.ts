import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260913181928_atomic_report_deletion.sql'),
  'utf8',
)

describe('atomic report deletion migration contract', () => {
  it('protects only the current unexpired active Attempt at the owner RLS boundary', () => {
    expect(migration).toContain('room.status = \'active\'')
    expect(migration).toContain('room.expires_at > now()')
    expect(migration).toContain('room.active_attempt_version = evaluation_reports.attempt_version')
    expect(migration).toContain('owner_user_id = (select auth.uid())')
  })

  it('exposes one explicitly granted security-invoker transaction for 1–25 unique reports', () => {
    expect(migration).toContain('create or replace function public.delete_evaluation_reports')
    expect(migration).toContain('security invoker')
    expect(migration).toContain('requested_count < 1 or requested_count > 25')
    expect(migration).toContain('count(distinct report_id)')
    expect(migration).toContain('matched_count <> requested_count')
    expect(migration).toContain('deleted_count <> requested_count')
    expect(migration).toContain('grant execute on function public.delete_evaluation_reports(uuid[])')
  })

  it('adds active-Attempt deletion eligibility without exposing Room state', () => {
    expect(migration).toContain('as deletion_blocked')
    expect(migration).toContain("'items', coalesce")
    expect(migration).not.toContain('room.*')
  })
})
