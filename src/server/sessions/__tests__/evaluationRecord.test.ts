import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hashSessionToken } from '../tokens'
import {
  createSupabaseStub,
  filterValue,
  type QueryResult,
  type RecordedOp,
  type Resolver,
  type TableResolver,
} from './supabaseStub'

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => currentStub.client),
}))

import {
  REVIEW_EVENT_LIMIT,
  endSession,
  getReview,
  joinSession,
  recordStudentEvent,
  startNewAttempt,
  updateSessionState,
} from '../service'

const HOST_TOKEN = 'host_token'
const PARTICIPANT_TOKEN = 'participant_token'
const CODE = 'ABC234'

const SESSION = {
  id: 'session-id',
  code: CODE,
  status: 'active',
  active_attempt_version: 3,
  created_at: '2026-08-27T10:00:00.000Z',
  expires_at: null,
}

const PARTICIPANT = {
  id: 'participant-id',
  session_id: SESSION.id,
  nickname: 'Sarah',
  joined_at: '2026-08-27T10:01:00.000Z',
  last_seen_at: '2026-08-27T10:05:00.000Z',
}

let currentStub: ReturnType<typeof createSupabaseStub>

/**
 * Answers the reads every service call makes on its way to the behaviour under
 * test (session lookup, host verification, participant lookup) so each test
 * only has to describe the rows it actually cares about.
 */
function baseResolver(overrides: Partial<Record<string, TableResolver>> = {}): Resolver {
  return (op) => {
    const override = overrides[op.table]
    if (override) {
      const result = override(op)
      if (result !== undefined) return result
    }
    switch (op.table) {
      case 'sessions':
        return { data: SESSION }
      case 'session_hosts':
        return { data: { token_hash: hashSessionToken(HOST_TOKEN) } }
      case 'participants':
        return { data: PARTICIPANT }
      case 'participant_attempts':
        return { data: null }
      case 'session_state':
        return { data: { state: {}, version: 7, updated_at: '2026-08-27T10:04:00.000Z' } }
      case 'session_state_history':
        return { data: null }
      case 'student_events':
        return { data: [] }
      default:
        return { data: null }
    }
  }
}

function withResolver(overrides: Partial<Record<string, TableResolver>> = {}) {
  currentStub = createSupabaseStub(baseResolver(overrides))
  return currentStub
}

beforeEach(() => {
  withResolver()
})

describe('updateSessionState — instructor-side history (PLAN 12b)', () => {
  it('appends a history row carrying the attempt, version, and state', async () => {
    const stub = withResolver({
      session_state: (op) =>
        op.method === 'upsert'
          ? { data: { state: { hr: 40 }, version: 8, updated_at: 'now' } }
          : { data: { version: 7 } },
    })

    await updateSessionState(CODE, HOST_TOKEN, { hr: 40 })

    const [history] = stub.opsFor('session_state_history')
    expect(history.method).toBe('insert')
    expect(history.payload).toEqual({
      session_id: SESSION.id,
      attempt_version: SESSION.active_attempt_version,
      version: 8,
      state: { hr: 40 },
    })
  })

  it('keeps the history version in step with the live state version', async () => {
    const stub = withResolver({
      session_state: (op) =>
        op.method === 'upsert'
          ? { data: { state: {}, version: 8, updated_at: 'now' } }
          : { data: { version: 7 } },
    })

    await updateSessionState(CODE, HOST_TOKEN, {})

    const upsert = stub.opsFor('session_state').find((op) => op.method === 'upsert')
    const [history] = stub.opsFor('session_state_history')
    expect(history.payload?.version).toBe(upsert?.payload?.version)
  })

  it('still completes the Send when the history write fails', async () => {
    // History is written beside the hot path, not on it: losing a debrief frame
    // must never cost the room a Send.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    withResolver({
      session_state: (op) =>
        op.method === 'upsert'
          ? { data: { state: {}, version: 8, updated_at: 'now' } }
          : { data: { version: 7 } },
      session_state_history: () => ({ error: { message: 'history down' } }),
    })

    const result = await updateSessionState(CODE, HOST_TOKEN, {})

    expect(result.state).toMatchObject({ version: 8 })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('recordStudentEvent — action/state linkage (PLAN 12c, 12d)', () => {
  function eventResolver(stateRow: QueryResult['data']) {
    return withResolver({
      session_state: () => ({ data: stateRow }),
      student_events: (op) =>
        op.method === 'insert' ? { data: { id: 'event-id', ...op.payload } } : undefined,
    })
  }

  it('stamps the current state version onto the event', async () => {
    const stub = eventResolver({ version: 7 })

    await recordStudentEvent(CODE, PARTICIPANT_TOKEN, {
      kind: 'nibp_start',
      label: 'NIBP Start',
      payload: { mode: 'manual' },
    })

    const insert = stub.opsFor('student_events').find((op) => op.method === 'insert')
    expect(insert?.payload).toMatchObject({
      kind: 'nibp_start',
      state_version: 7,
      attempt_version: SESSION.active_attempt_version,
    })
  })

  it('stamps null when the instructor has not sent state yet', async () => {
    const stub = eventResolver(null)

    await recordStudentEvent(CODE, PARTICIPANT_TOKEN, {
      kind: 'power_on',
      label: 'Power On',
    })

    const insert = stub.opsFor('student_events').find((op) => op.method === 'insert')
    expect(insert?.payload?.state_version).toBeNull()
  })

  it('accepts every newly instrumented kind', async () => {
    const kinds = [
      'nibp_start',
      'nibp_result',
      'power_on',
      'power_off',
      'twelve_lead',
      'twelve_lead_capture',
      'print',
      'etco2_toggle',
      'energy_change',
      'treatment_menu',
      'patient_info',
    ] as const

    for (const kind of kinds) {
      eventResolver({ version: 1 })
      await expect(
        recordStudentEvent(CODE, PARTICIPANT_TOKEN, { kind, label: kind }),
      ).resolves.toBeDefined()
    }
  })

  it('rejects an unknown kind with 400 and never reaches the insert', async () => {
    const stub = eventResolver({ version: 7 })

    await expect(
      recordStudentEvent(CODE, PARTICIPANT_TOKEN, {
        kind: 'definitely_not_a_kind',
        label: 'Injected',
      }),
    ).rejects.toMatchObject({ status: 400 })

    expect(stub.opsFor('student_events')).toHaveLength(0)
  })
})

describe('joinSession — participant identity (PLAN 12e)', () => {
  it('reclaims the existing row when a nickname rejoins without a token', async () => {
    const stub = withResolver({
      participants: (op) => {
        if (op.method === 'update') return { data: { ...PARTICIPANT } }
        return { data: PARTICIPANT }
      },
    })

    const result = await joinSession(CODE, 'sarah')

    const update = stub.opsFor('participants').find((op) => op.method === 'update')
    expect(update).toBeDefined()
    expect(stub.opsFor('participants').some((op) => op.method === 'insert')).toBe(false)
    expect(result.participant.id).toBe(PARTICIPANT.id)
    // A fresh token is issued onto the existing row, so the returning trainee
    // keeps one identity across devices.
    expect(result.participantToken).not.toBe('')
  })

  it('matches the nickname case-insensitively, like the unique index', async () => {
    const stub = withResolver({
      participants: (op) =>
        op.method === 'update' ? { data: { ...PARTICIPANT } } : { data: PARTICIPANT },
    })

    await joinSession(CODE, 'SARAH')

    const lookup = stub
      .opsFor('participants')
      .find((op) => op.filters.some((filter) => filter.op === 'ilike'))
    expect(lookup).toBeDefined()
  })

  it('inserts a new row when the nickname is not already in the room', async () => {
    const stub = withResolver({
      participants: (op) => {
        if (op.single === 'maybeSingle') return { data: null }
        if (op.method === 'insert') return { data: { ...PARTICIPANT, nickname: 'Jamie' } }
        return { data: PARTICIPANT }
      },
    })

    await joinSession(CODE, 'Jamie')

    expect(stub.opsFor('participants').some((op) => op.method === 'insert')).toBe(true)
  })
})

describe('getReview — evaluation record assembly (PLAN 12f)', () => {
  function reviewResolver(
    events: unknown[],
    overrides: Partial<Record<string, TableResolver>> = {},
  ) {
    return withResolver({
      student_events: () => ({ data: events }),
      session_state_history: () => ({ data: [{ version: 7, attempt_version: 3, state: {} }] }),
      participants: () => ({ data: [PARTICIPANT] }),
      participant_attempts: () => ({ data: [] }),
      ...overrides,
    })
  }

  const makeEvents = (count: number) =>
    Array.from({ length: count }, (_, index) => ({ id: `event-${index}` }))

  it('scopes to the active attempt by default', async () => {
    const stub = reviewResolver([])

    const result = await getReview(CODE, HOST_TOKEN)

    const events = stub.opsFor('student_events')[0]
    expect(filterValue(events, 'attempt_version')).toBe(SESSION.active_attempt_version)
    expect(result.attemptVersion).toBe(SESSION.active_attempt_version)
  })

  it('scopes to an explicitly requested past attempt', async () => {
    const stub = reviewResolver([])

    await getReview(CODE, HOST_TOKEN, 1)

    expect(filterValue(stub.opsFor('student_events')[0], 'attempt_version')).toBe(1)
    expect(filterValue(stub.opsFor('session_state_history')[0], 'attempt_version')).toBe(1)
  })

  it('drops the attempt filter for a whole-session export', async () => {
    const stub = reviewResolver([])

    const result = await getReview(CODE, HOST_TOKEN, 'all')

    expect(filterValue(stub.opsFor('student_events')[0], 'attempt_version')).toBeUndefined()
    expect(result.attemptVersion).toBe('all')
  })

  it('asks for one row beyond the cap so truncation is detectable', async () => {
    const stub = reviewResolver([])

    await getReview(CODE, HOST_TOKEN)

    expect(stub.opsFor('student_events')[0].limit).toBe(REVIEW_EVENT_LIMIT + 1)
  })

  it('reports truncation and trims to the cap instead of hiding it', async () => {
    reviewResolver(makeEvents(REVIEW_EVENT_LIMIT + 1))

    const result = await getReview(CODE, HOST_TOKEN)

    expect(result.truncated).toBe(true)
    expect(result.events).toHaveLength(REVIEW_EVENT_LIMIT)
  })

  it('reports a complete record as untruncated', async () => {
    reviewResolver(makeEvents(3))

    const result = await getReview(CODE, HOST_TOKEN)

    expect(result.truncated).toBe(false)
    expect(result.events).toHaveLength(3)
  })

  it('returns the state history the evaluator joins actions against', async () => {
    reviewResolver([])

    const result = await getReview(CODE, HOST_TOKEN)

    expect(result.stateHistory).toEqual([{ version: 7, attempt_version: 3, state: {} }])
  })
})

describe('attempt completion (PLAN 12f)', () => {
  it('closes the outgoing attempt before bumping to the next one', async () => {
    const stub = withResolver({
      sessions: (op) =>
        op.method === 'update'
          ? { data: { ...SESSION, active_attempt_version: 4, status: 'waiting' } }
          : { data: SESSION },
    })

    await startNewAttempt(CODE, HOST_TOKEN)

    const close = stub.opsFor('participant_attempts').find((op) => op.method === 'update')
    expect(close?.payload?.completed_at).toEqual(expect.any(String))
    expect(filterValue(close!, 'attempt_version')).toBe(SESSION.active_attempt_version)
  })

  it('closes the attempt when the room ends', async () => {
    const stub = withResolver({
      sessions: (op) =>
        op.method === 'update' ? { data: { ...SESSION, status: 'ended' } } : { data: SESSION },
    })

    await endSession(CODE, HOST_TOKEN)

    const close = stub.opsFor('participant_attempts').find((op) => op.method === 'update')
    expect(close?.payload?.completed_at).toEqual(expect.any(String))
  })

  it('only closes attempts that are still open', async () => {
    const stub = withResolver({
      sessions: (op) =>
        op.method === 'update' ? { data: { ...SESSION, status: 'ended' } } : { data: SESSION },
    })

    await endSession(CODE, HOST_TOKEN)

    const close = stub.opsFor('participant_attempts').find((op) => op.method === 'update')
    expect(close?.filters).toContainEqual({ op: 'is', column: 'completed_at', value: null })
  })
})

describe('RecordedOp harness', () => {
  it('does not reclassify an insert that names returning columns', async () => {
    const stub = withResolver({
      student_events: (op) => (op.method === 'insert' ? { data: { id: 'x' } } : undefined),
      session_state: () => ({ data: { version: 1 } }),
    })

    await recordStudentEvent(CODE, PARTICIPANT_TOKEN, { kind: 'shock', label: 'Shock' })

    const recorded = stub.opsFor('student_events')[0] as RecordedOp
    expect(recorded.method).toBe('insert')
    expect(recorded.columns).toContain('state_version')
  })
})
