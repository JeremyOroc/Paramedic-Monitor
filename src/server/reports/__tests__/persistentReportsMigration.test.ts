import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260907135753_phase_5_persistent_reports.sql'),
  'utf8',
)

describe('Phase 5 persistent reports migration contract', () => {
  it('keeps report ownership and captured scenario identity immutable', () => {
    expect(migration).toContain('owner_user_id         uuid        not null references auth.users(id) on delete cascade')
    expect(migration).toContain('evaluation_reports_immutable_snapshot')
    expect(migration).not.toContain('source_session_id     uuid        not null references public.sessions')
  })

  it('creates on Attempt start, autosaves both timeline axes, and distinguishes expiry', () => {
    expect(migration).toContain('sessions_create_evaluation_report')
    expect(migration).toContain('student_events_append_evaluation_report')
    expect(migration).toContain('session_state_history_append_evaluation_report')
    expect(migration).toContain("completion_method = 'attempt_transition'")
    expect(migration).toContain('Expiry changes status to')
  })

  it('exposes only owner editing columns and protects content-free audit rows', () => {
    expect(migration).toContain('grant update (attempt_label, student_names, status, completion_method, completed_at)')
    expect(migration).toContain('revoke all on table public.evaluation_report_audit_log from public, anon, authenticated')
    expect(migration).toContain("'student_names_update'")
    expect(migration).toContain('America/Toronto')
  })
})
