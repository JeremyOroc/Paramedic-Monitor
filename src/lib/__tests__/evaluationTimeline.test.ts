import { describe, it, expect } from 'vitest'

import {
  buildEvaluationTimeline,
  diffStates,
  formatEventDetail,
  formatOffset,
  normalizeHistoryState,
  type EvaluationTimelineInput,
  type TimelineActionRow,
  type TimelineInstructorRow,
  type TimelineStateContext,
} from '../evaluationTimeline'
import type {
  ParticipantAttempt,
  SessionParticipant,
  SessionStateHistoryEntry,
  StudentEvent,
} from '@/types/session'

const START = '2026-09-02T14:00:00.000Z'
const startMs = Date.parse(START)

function at(seconds: number): string {
  return new Date(startMs + seconds * 1000).toISOString()
}

function makeEvent(overrides: Partial<StudentEvent> = {}): StudentEvent {
  return {
    id: `event-${Math.random()}`,
    session_id: 'session-1',
    participant_id: 'student-1',
    attempt_version: 1,
    kind: 'acknowledge',
    label: 'Acknowledge',
    payload: {},
    occurred_at: at(0),
    state_version: null,
    ...overrides,
  }
}

function makeState(
  version: number,
  seconds: number,
  state: unknown,
  attemptVersion = 1,
): SessionStateHistoryEntry {
  return { version, attempt_version: attemptVersion, state, applied_at: at(seconds) }
}

function sharedState(
  confirmed: Record<string, unknown>,
  active: Record<string, boolean> = {},
  extra: Record<string, unknown> = {},
) {
  return {
    confirmed: { rhythm: 'nsr', hr: 88, bp_sys: 118, bp_dia: 76, spo2: 97, etco2: 35, ...confirmed },
    confirmedVitalActive: { hr: true, bp_sys: true, bp_dia: true, spo2: true, etco2: false, ...active },
    ...extra,
  }
}

const PARTICIPANTS: SessionParticipant[] = [
  { id: 'student-1', session_id: 'session-1', nickname: 'Sarah M.', joined_at: at(-30), last_seen_at: at(500) },
]

const ATTEMPTS: ParticipantAttempt[] = [
  { participant_id: 'student-1', attempt_version: 1, started_at: START, completed_at: at(520) },
]

function build(overrides: Partial<EvaluationTimelineInput> = {}) {
  return buildEvaluationTimeline({
    events: [],
    stateHistory: [],
    attempts: ATTEMPTS,
    participants: PARTICIPANTS,
    attemptVersion: 1,
    ...overrides,
  })
}

const actions = (rows: readonly { kind: string }[]) =>
  rows.filter((row): row is TimelineActionRow => row.kind === 'action')
const instructorRows = (rows: readonly { kind: string }[]) =>
  rows.filter((row): row is TimelineInstructorRow => row.kind === 'instructor')

describe('formatOffset', () => {
  it('renders minutes and seconds from the attempt baseline', () => {
    expect(formatOffset(0)).toBe('t+0:00')
    expect(formatOffset(279_000)).toBe('t+4:39')
    expect(formatOffset(59_999)).toBe('t+0:59')
  })

  it('grows to hours only once the run passes one', () => {
    expect(formatOffset(3_599_000)).toBe('t+59:59')
    expect(formatOffset(3_862_000)).toBe('t+1:04:22')
  })

  it('marks an action taken before the attempt started', () => {
    expect(formatOffset(-5_000)).toBe('t-0:05')
  })
})

describe('formatEventDetail', () => {
  it('shows the drug name for a medication, not the repeated timestamp', () => {
    expect(
      formatEventDetail({ kind: 'medication', label: 'Epinephrine', payload: { time: '14:05' } }),
    ).toBe('"Epinephrine"')
  })

  it('formats a payload as the mockup does', () => {
    expect(
      formatEventDetail({ kind: 'nibp_result', label: 'NIBP 82/48', payload: { bp_sys: 82, bp_dia: 48 } }),
    ).toBe('{bp_sys: 82, bp_dia: 48}')
    expect(
      formatEventDetail({ kind: 'analyze', label: 'Analyze - Shock', payload: { result: 'shock', rhythm: 'vf' } }),
    ).toBe('{result: shock, rhythm: vf}')
  })

  it('drops null entries so a manual NIBP reads as one field', () => {
    expect(
      formatEventDetail({ kind: 'nibp_start', label: 'NIBP Start', payload: { mode: 'manual', intervalMinutes: null } }),
    ).toBe('{mode: manual}')
  })

  it('drops the defib machine state, which is bookkeeping rather than clinical', () => {
    expect(
      formatEventDetail({ kind: 'shock', label: 'Shock', payload: { joules: 200, state: 'charged' } }),
    ).toBe('{joules: 200}')
  })

  it('is empty for an action that carries no payload', () => {
    expect(formatEventDetail({ kind: 'power_on', label: 'Power On', payload: {} })).toBe('')
    expect(formatEventDetail({ kind: 'print', label: 'Print', payload: null })).toBe('')
  })
})

describe('normalizeHistoryState', () => {
  it('reads a stored shared state', () => {
    const state = normalizeHistoryState(sharedState({ rhythm: 'vf', hr: 112 }))
    expect(state.rhythm).toBe('vf')
    expect(state.vitals.hr).toBe(112)
    expect(state.active.etco2).toBe(false)
  })

  it('treats an unrecorded channel flag as on, so an older row shows its values', () => {
    const state = normalizeHistoryState({ confirmed: { rhythm: 'nsr', hr: 80 } })
    expect(state.active.hr).toBe(true)
    expect(state.vitals.hr).toBe(80)
  })

  it('degrades rather than throwing on a malformed blob', () => {
    expect(normalizeHistoryState(null).rhythm).toBe('off')
    expect(normalizeHistoryState('nonsense').vitals.hr).toBeNull()
    expect(normalizeHistoryState({ confirmed: { rhythm: 'not-a-rhythm' } }).rhythm).toBe('off')
  })
})

describe('diffStates', () => {
  const base = normalizeHistoryState(sharedState({}))

  it('reports a single changed vital and nothing else', () => {
    const next = normalizeHistoryState(sharedState({ hr: 112 }))
    expect(diffStates(base, next)).toEqual(['HR 88 → 112'])
  })

  it('reports every field the instructor moved in one Send', () => {
    const next = normalizeHistoryState(sharedState({ rhythm: 'vf', hr: 112, bp_sys: 82, bp_dia: 48, spo2: 91 }))
    expect(diffStates(base, next)).toEqual([
      'rhythm NSR → VF',
      'HR 88 → 112',
      'BP sys 118 → 82',
      'BP dia 76 → 48',
      'SpO2 97 → 91',
    ])
  })

  it('reports a channel switched off as a toggle, not a value change', () => {
    const next = normalizeHistoryState(sharedState({ spo2: 91 }, { spo2: false }))
    expect(diffStates(base, next)).toEqual(['SpO2 off'])
  })

  it('reports CPR and monitor resets', () => {
    const withReset = normalizeHistoryState(sharedState({}, {}, { cprMode: 'regular', monitorResetVersion: 1 }))
    const previous = normalizeHistoryState(sharedState({}, {}, { cprMode: 'off', monitorResetVersion: 0 }))
    expect(diffStates(previous, withReset)).toEqual(['CPR off → Regular', 'monitor reset'])
  })

  it('is empty for a Send that changed nothing clinical', () => {
    expect(diffStates(base, normalizeHistoryState(sharedState({})))).toEqual([])
  })
})

describe('buildEvaluationTimeline', () => {
  it('counts offsets from the attempt start', () => {
    const { rows, durationMs } = build({
      events: [makeEvent({ occurred_at: at(0) }), makeEvent({ kind: 'arrival', label: 'Arrival', occurred_at: at(252) })],
    })
    expect(rows.map((row) => row.offset)).toEqual(['t+0:00', 't+4:12'])
    expect(durationMs).toBe(252_000)
  })

  it('falls back to the first recorded row when the attempt has no start time', () => {
    const { rows, baselineMs } = build({
      attempts: [],
      events: [makeEvent({ occurred_at: at(60) }), makeEvent({ occurred_at: at(90) })],
    })
    expect(baselineMs).toBe(startMs + 60_000)
    expect(rows.map((row) => row.offset)).toEqual(['t+0:00', 't+0:30'])
  })

  it('shows an action taken before the first Send as dispatch, not as a state', () => {
    const { rows } = build({ events: [makeEvent({ state_version: null })] })
    expect(rows[0].context.kind).toBe('dispatch')
    expect(rows[0].inAlarm).toBe(false)
  })

  it('says so when the named state version is not in the history', () => {
    const { rows } = build({ events: [makeEvent({ state_version: 7 })] })
    expect(rows[0].context.kind).toBe('missing')
  })

  it('resolves each action against the state in force when it was taken', () => {
    const { rows } = build({
      stateHistory: [
        makeState(1, 5, sharedState({})),
        makeState(2, 270, sharedState({ rhythm: 'vf', hr: 112, bp_sys: 82, bp_dia: 48, spo2: 91 })),
      ],
      events: [
        makeEvent({ kind: 'power_on', label: 'Power On', occurred_at: at(260), state_version: 1 }),
        makeEvent({ kind: 'medication', label: 'Epinephrine', occurred_at: at(302), state_version: 2 }),
      ],
    })
    const [early, late] = actions(rows)
    expect((early.context as TimelineStateContext).rhythm).toBe('NSR 88')
    expect((late.context as TimelineStateContext).rhythm).toBe('VF 112')
    expect((late.context as TimelineStateContext).vitals).toEqual([
      { label: 'BP', value: '82/48', alarm: true },
      { label: 'SpO2', value: '91', alarm: false },
    ])
  })

  it('flags a row whose patient was in alarm and leaves a stable one alone', () => {
    const { rows } = build({
      stateHistory: [makeState(1, 0, sharedState({})), makeState(2, 100, sharedState({ spo2: 84 }))],
      events: [
        makeEvent({ occurred_at: at(10), state_version: 1 }),
        makeEvent({ occurred_at: at(110), state_version: 2 }),
      ],
    })
    const [stable, alarming] = actions(rows)
    expect(stable.inAlarm).toBe(false)
    expect(alarming.inAlarm).toBe(true)
    expect((alarming.context as TimelineStateContext).alarms).toEqual(['spo2'])
  })

  it('prints a channel that was on and has gone off as dashes', () => {
    const { rows } = build({
      stateHistory: [
        makeState(1, 0, sharedState({})),
        makeState(2, 100, sharedState({}, { spo2: false })),
      ],
      events: [
        makeEvent({ occurred_at: at(10), state_version: 1 }),
        makeEvent({ occurred_at: at(110), state_version: 2 }),
      ],
    })
    const [before, after] = actions(rows)
    expect((before.context as TimelineStateContext).vitals).toContainEqual({
      label: 'SpO2',
      value: '97',
      alarm: false,
    })
    expect((after.context as TimelineStateContext).vitals).toContainEqual({
      label: 'SpO2',
      value: '--',
      alarm: false,
    })
  })

  it('omits a channel the run never used rather than printing a column of dashes', () => {
    const { rows } = build({
      stateHistory: [makeState(1, 0, sharedState({}, { spo2: false, etco2: false }))],
      events: [makeEvent({ occurred_at: at(10), state_version: 1 })],
    })
    const context = actions(rows)[0].context as TimelineStateContext
    expect(context.vitals).toEqual([{ label: 'BP', value: '118/76', alarm: false }])
    expect(context.rhythm).toBe('NSR 88')
  })

  it('notes CPR alongside the rhythm', () => {
    const { rows } = build({
      stateHistory: [makeState(1, 0, sharedState({}, {}, { cprMode: 'regular' }))],
      events: [makeEvent({ occurred_at: at(10), state_version: 1 })],
    })
    expect((actions(rows)[0].context as TimelineStateContext).rhythm).toBe('NSR 88 (CPR)')
  })

  it('interleaves the instructor changes with the actions they explain', () => {
    const { rows } = build({
      stateHistory: [
        makeState(1, 0, sharedState({})),
        makeState(2, 276, sharedState({ rhythm: 'vf', hr: 112 })),
      ],
      events: [
        makeEvent({ kind: 'nibp_start', label: 'NIBP Start', occurred_at: at(271), state_version: 1 }),
        makeEvent({ kind: 'nibp_result', label: 'NIBP 82/48', occurred_at: at(279), state_version: 2 }),
      ],
    })
    expect(rows.map((row) => `${row.offset} ${row.kind}`)).toEqual([
      't+0:00 instructor',
      't+4:31 action',
      't+4:36 instructor',
      't+4:39 action',
    ])
    expect(instructorRows(rows)[1].changes).toEqual(['rhythm NSR → VF', 'HR 88 → 112'])
  })

  it('marks the attempt opening state as an opening rather than a change', () => {
    const { rows } = build({ stateHistory: [makeState(1, 0, sharedState({}))] })
    const [opening] = instructorRows(rows)
    expect(opening.opening).toBe(true)
    expect(opening.changes).toEqual([])
  })

  it('puts a state change before an action landing in the same millisecond', () => {
    const { rows } = build({
      stateHistory: [makeState(1, 30, sharedState({}))],
      events: [makeEvent({ occurred_at: at(30), state_version: 1 })],
    })
    expect(rows.map((row) => row.kind)).toEqual(['instructor', 'action'])
  })

  it('leaves out every row belonging to another attempt', () => {
    const { rows } = build({
      attemptVersion: 2,
      attempts: [{ participant_id: 'student-1', attempt_version: 2, started_at: at(600), completed_at: null }],
      stateHistory: [makeState(1, 0, sharedState({}), 1), makeState(2, 620, sharedState({}), 2)],
      events: [
        makeEvent({ attempt_version: 1, occurred_at: at(30) }),
        makeEvent({ attempt_version: 2, occurred_at: at(630) }),
      ],
    })
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.offsetMs >= 0)).toBe(true)
  })

  it('names the trainee behind each action', () => {
    const { rows, participantNames } = build({ events: [makeEvent({})] })
    expect(actions(rows)[0].participantName).toBe('Sarah M.')
    expect(participantNames).toEqual(['Sarah M.'])
  })

  it('returns an empty run rather than failing on a drill with nothing recorded', () => {
    const empty = build({ attempts: [] })
    expect(empty.rows).toEqual([])
    expect(empty.baselineMs).toBeNull()
    expect(empty.durationMs).toBe(0)
  })

  it('skips rows with unparseable timestamps instead of placing them at the epoch', () => {
    const { rows } = build({ events: [makeEvent({ occurred_at: 'not-a-date' }), makeEvent({ occurred_at: at(12) })] })
    expect(rows).toHaveLength(1)
    expect(rows[0].offset).toBe('t+0:12')
  })
})
