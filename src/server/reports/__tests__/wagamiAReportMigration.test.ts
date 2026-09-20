import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260915160205_widen_wagami_a_report_model.sql'),
  'utf8',
)
const databaseTest = readFileSync(
  resolve(process.cwd(), 'supabase/tests/persistent_reports_rls.test.sql'),
  'utf8',
)

describe('Wagami A Evaluation report migration contract', () => {
  it('widens the immutable model constraint while preserving X and Z', () => {
    expect(migration).toContain('drop constraint evaluation_reports_defibrillator_model_check')
    expect(migration).toContain('add constraint evaluation_reports_defibrillator_model_check')
    expect(migration).toContain("('wagamiX', 'wagamiZ', 'wagamiA')")
  })

  it('keeps live enablement out of the schema migration', () => {
    expect(migration).not.toContain('session_state')
    expect(migration).not.toContain('student_events')
    expect(migration).not.toContain('participant_attempts')
  })

  it('has pgTAP coverage for A and retained Z report values', () => {
    expect(databaseTest).toContain("position('wagamiA' in pg_get_constraintdef")
    expect(databaseTest).toContain("position('wagamiZ' in pg_get_constraintdef")
  })
})
