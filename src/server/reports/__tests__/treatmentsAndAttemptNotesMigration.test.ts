import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260923180000_instructor_treatments_and_attempt_notes.sql'),
  'utf8',
)

describe('Instructor Treatments and Attempt notes migration', () => {
  it('widens the constrained event vocabulary without removing legacy medication rows', () => {
    expect(migration).toContain("'medication'")
    expect(migration).toContain("'treatment'")
    expect(migration).toContain('student_events_kind_check')
  })

  it('stores bounded mutable General Notes and append-only Instructor Notes separately', () => {
    expect(migration).toContain('session_attempts_general_notes_length')
    expect(migration).toContain('char_length(general_notes) <= 4000')
    expect(migration).toContain('create table public.session_instructor_notes')
    expect(migration).toContain('char_length(trim(body)) between 1 and 1000')
  })

  it('hydrates and continuously synchronizes the self-contained Evaluation report', () => {
    expect(migration).toContain('hydrate_evaluation_report_attempt_notes')
    expect(migration).toContain('sync_attempt_general_notes_to_report')
    expect(migration).toContain('append_instructor_note_to_report')
    expect(migration).toContain("instructor_notes || jsonb_build_array(to_jsonb(new))")
  })
})
