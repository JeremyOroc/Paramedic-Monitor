import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260907163444_grant_live_room_service_access.sql',
  ),
  'utf8',
)

describe('Phase 6 live Room service grants migration contract', () => {
  it('keeps browser roles out of temporary live-Room tables', () => {
    expect(migration).toMatch(
      /revoke all on table[\s\S]+from public, anon, authenticated, service_role/i,
    )
  })

  it('grants only the operations used by protected server routes', () => {
    expect(migration).toMatch(
      /grant select, insert, update on table[\s\S]+public\.session_state,[\s\S]+public\.participants,[\s\S]+public\.participant_attempts[\s\S]+to service_role/i,
    )
    expect(migration).toContain(
      'grant select, insert on table public.student_events to service_role',
    )
    expect(migration).not.toMatch(/grant[\s\S]+delete[\s\S]+to service_role/i)
  })
})
