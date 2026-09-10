import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260909120000_twelve_lead_transmission.sql',
  ),
  'utf8',
)

describe('12-lead transmission migration contract', () => {
  it('replaces the event-kind constraint and admits twelve_lead_send', () => {
    expect(migration).toMatch(/drop constraint if exists student_events_kind_check/i)
    expect(migration).toMatch(/add constraint student_events_kind_check check/i)
    expect(migration).toContain("'twelve_lead_send'")
    expect(migration).toContain("'sample_ask'")
    expect(migration).toContain("'opqrst_ask'")
  })
})
