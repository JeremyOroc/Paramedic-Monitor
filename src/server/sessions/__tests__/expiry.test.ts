import { describe, it, expect } from 'vitest'

import { applySessionExpiry, type SessionRecord } from '../service'

const NOW = Date.parse('2026-07-04T12:00:00.000Z')

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'session-id',
    code: 'ABC123',
    status: 'active',
    active_attempt_version: 1,
    created_at: '2026-07-04T10:00:00.000Z',
    expires_at: '2026-07-05T10:00:00.000Z',
    ...overrides,
  }
}

describe('applySessionExpiry', () => {
  it('leaves unexpired sessions untouched', () => {
    const session = makeSession()
    expect(applySessionExpiry(session, NOW)).toBe(session)
  })

  it('maps sessions past expires_at to ended', () => {
    const session = makeSession({ expires_at: '2026-07-04T11:59:59.000Z' })
    expect(applySessionExpiry(session, NOW)).toEqual({
      ...session,
      status: 'ended',
    })
  })

  it('treats a session expiring exactly now as ended', () => {
    const session = makeSession({ expires_at: '2026-07-04T12:00:00.000Z' })
    expect(applySessionExpiry(session, NOW).status).toBe('ended')
  })

  it('never expires sessions without an expires_at', () => {
    const session = makeSession({ expires_at: null })
    expect(applySessionExpiry(session, NOW)).toBe(session)
  })

  it('ignores malformed expires_at values', () => {
    const session = makeSession({ expires_at: 'not-a-date' })
    expect(applySessionExpiry(session, NOW)).toBe(session)
  })

  it('keeps already-ended sessions ended', () => {
    const session = makeSession({ status: 'ended' })
    expect(applySessionExpiry(session, NOW)).toBe(session)
  })
})
