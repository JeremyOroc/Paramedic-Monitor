import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearParticipantSession,
  hostStorageKey,
  participantHeaders,
  participantStorageKey,
  readHostToken,
  readParticipantSession,
  writeHostToken,
  writeParticipantSession,
} from '../sessionStorage'

describe('sessionStorage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a participant session with an uppercase-normalized key', () => {
    writeParticipantSession('abc123', {
      participantToken: 'participant_token',
      participantId: 'p1',
      nickname: 'Zaid',
    })

    expect(readParticipantSession('ABC123')).toEqual({
      participantToken: 'participant_token',
      participantId: 'p1',
      nickname: 'Zaid',
    })

    clearParticipantSession('abc123')
    expect(readParticipantSession('ABC123')).toBeNull()
  })

  it('round-trips a host token and returns empty string when absent', () => {
    expect(readHostToken('ABC123')).toBe('')
    writeHostToken('abc123', 'host_secret')
    expect(readHostToken('ABC123')).toBe('host_secret')
  })

  it('returns null/empty for corrupt storage entries', () => {
    localStorage.setItem(participantStorageKey('ABC123'), 'not-json')
    localStorage.setItem(hostStorageKey('ABC123'), 'not-json')
    expect(readParticipantSession('ABC123')).toBeNull()
    expect(readHostToken('ABC123')).toBe('')
  })

  it('builds a heartbeat header only when a token exists', () => {
    expect(participantHeaders('token')).toEqual({
      'x-session-participant-token': 'token',
    })
    expect(participantHeaders('')).toBeUndefined()
  })
})
