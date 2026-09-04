import { describe, it, expect } from 'vitest'

import {
  SUMMARY_CLAUSE_LIMIT,
  buildEvaluationTimeline,
  describeState,
  diffStates,
  eventTimeMs,
  formatEventDetail,
  summarizeChanges,
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
    occurred_at_client: null,
    capture_sequence: null,
    clock_offset_ms: null,
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
    confirmed: { rhythm: 'nsr', hr: 88, bp_sys: 118, bp_dia: 76, spo2: 97, etco2: 35, spo2_waveform: 'normal', etco2_waveform: 'normal', ...confirmed },
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

  it('reads the scenario name the instructor was running', () => {
    expect(normalizeHistoryState(sharedState({}, {}, { scenarioTitleConfirmed: '  Fall from ladder  ' })).scenarioTitle)
      .toBe('Fall from ladder')
  })

  it('has no scenario name when the instructor never gave one', () => {
    expect(normalizeHistoryState(sharedState({})).scenarioTitle).toBe('')
    expect(normalizeHistoryState(sharedState({}, {}, { scenarioTitleConfirmed: 42 })).scenarioTitle).toBe('')
  })

  it('degrades rather than throwing on a malformed blob', () => {
    expect(normalizeHistoryState(null).rhythm).toBe('off')
    expect(normalizeHistoryState('nonsense').vitals.hr).toBeNull()
    expect(normalizeHistoryState({ confirmed: { rhythm: 'not-a-rhythm' } }).rhythm).toBe('off')
  })
})

describe('diffStates', () => {
  const base = normalizeHistoryState(sharedState({}))
  const diff = (a: typeof base, b: typeof base) => summarizeChanges(diffStates(a, b))

  it('reports a single changed vital and nothing else', () => {
    const next = normalizeHistoryState(sharedState({ hr: 112 }))
    expect(diff(base, next)).toEqual(['HR 88 → 112'])
  })

  it('reports every field the instructor moved in one Send', () => {
    const next = normalizeHistoryState(sharedState({ rhythm: 'vf', hr: 112, bp_sys: 82, bp_dia: 48, spo2: 91 }))
    expect(diff(base, next)).toEqual([
      'rhythm NSR → VF',
      'HR 88 → 112',
      'BP sys 118 → 82',
      'BP dia 76 → 48',
      'SpO2 97 → 91',
    ])
  })

  it('reports a channel switched off as a toggle, not a value change', () => {
    const next = normalizeHistoryState(sharedState({ spo2: 91 }, { spo2: false }))
    expect(diff(base, next)).toEqual(['SpO2 off'])
  })

  it('reports CPR and monitor resets', () => {
    const withReset = normalizeHistoryState(sharedState({}, {}, { cprMode: 'regular', monitorResetVersion: 1 }))
    const previous = normalizeHistoryState(sharedState({}, {}, { cprMode: 'off', monitorResetVersion: 0 }))
    expect(diff(previous, withReset)).toEqual(['CPR off → Regular', 'monitor reset'])
  })

  it('reports the instructor switching scenario mid-attempt', () => {
    const before = normalizeHistoryState(sharedState({}, {}, { scenarioTitleConfirmed: 'Fall from ladder' }))
    const after = normalizeHistoryState(sharedState({}, {}, { scenarioTitleConfirmed: 'Cardiac arrest' }))
    expect(diff(before, after)).toEqual(['scenario "Fall from ladder" → "Cardiac arrest"'])
  })

  it('reports a scenario named for the first time, and one cleared', () => {
    const unnamed = normalizeHistoryState(sharedState({}))
    const named = normalizeHistoryState(sharedState({}, {}, { scenarioTitleConfirmed: 'Cardiac arrest' }))
    expect(diff(unnamed, named)).toEqual(['scenario "untitled" → "Cardiac arrest"'])
    expect(diff(named, unnamed)).toEqual(['scenario name cleared'])
  })

  it('is empty for a Send that changed nothing clinical', () => {
    expect(diff(base, normalizeHistoryState(sharedState({})))).toEqual([])
  })
})

describe('eventTimeMs', () => {
  const base = { occurred_at: at(100), occurred_at_client: null, clock_offset_ms: null }

  it('uses the corrected client clock when the monitor supplied one', () => {
    const time = eventTimeMs({ ...base, occurred_at_client: at(92), clock_offset_ms: 3_000 })
    expect(time).toEqual({ at: startMs + 95_000, clientTimed: true })
  })

  it('falls back to the server clock without an offset, since an uncorrected client clock is on its own timeline', () => {
    expect(eventTimeMs({ ...base, occurred_at_client: at(92) })).toEqual({
      at: startMs + 100_000,
      clientTimed: false,
    })
  })

  it('falls back to the server clock for rows predating the columns', () => {
    expect(eventTimeMs(base)).toEqual({ at: startMs + 100_000, clientTimed: false })
  })

  it('is null when neither clock parses', () => {
    expect(eventTimeMs({ occurred_at: 'nope', occurred_at_client: 'nope', clock_offset_ms: 0 })).toBeNull()
  })
})

describe('buildEvaluationTimeline — the trainee\'s clock (PLAN 14c, 14e)', () => {
  it('places a replayed action at the moment it was pressed, not when it reached the server', () => {
    const { rows } = build({
      events: [
        makeEvent({
          kind: 'shock', label: 'Shock',
          occurred_at: at(70),            // reached the server after the outage
          occurred_at_client: at(40),     // pressed here...
          clock_offset_ms: 2_000,         // ...on a clock 2s behind the server
        }),
      ],
    })
    expect(rows[0].offset).toBe('t+0:42')
    expect((rows[0] as TimelineActionRow).clientTimed).toBe(true)
  })

  it('keeps two presses in one millisecond in the order the monitor counted them', () => {
    const { rows } = build({
      events: [
        makeEvent({ id: 'second', kind: 'shock', label: 'Shock', occurred_at: at(10), occurred_at_client: at(10), clock_offset_ms: 0, capture_sequence: 2 }),
        makeEvent({ id: 'first', kind: 'charge', label: 'Charge', occurred_at: at(10), occurred_at_client: at(10), clock_offset_ms: 0, capture_sequence: 1 }),
      ],
    })
    expect(rows.map((row) => row.id)).toEqual(['first', 'second'])
  })

  it('marks an action taken on a monitor that had not received the latest Send', () => {
    const { rows } = build({
      stateHistory: [
        makeState(1, 0, sharedState({})),
        makeState(2, 276, sharedState({ rhythm: 'vf', hr: 112 })),   // the Send the monitor missed
      ],
      events: [
        makeEvent({ kind: 'analyze', label: 'Analyze', occurred_at: at(302), occurred_at_client: at(280), clock_offset_ms: 0, state_version: 1 }),
      ],
    })
    const action = actions(rows)[0]
    expect(action.behindBy).toBe(1)
    // And it is judged against what it saw, not what it should have seen.
    expect((action.context as TimelineStateContext).rhythm).toBe('NSR 88')
  })

  it('does not mark an action that was current, or one before any Send', () => {
    const { rows } = build({
      stateHistory: [makeState(1, 0, sharedState({})), makeState(2, 100, sharedState({ hr: 90 }))],
      events: [
        makeEvent({ occurred_at: at(50), state_version: 1 }),    // current at the time
        makeEvent({ occurred_at: at(150), state_version: 2 }),   // current at the time
        makeEvent({ occurred_at: at(150), state_version: null }), // predates any Send
      ],
    })
    expect(actions(rows).map((row) => row.behindBy)).toEqual([0, 0, 0])
  })

  it('counts every Send the monitor missed, not only the last', () => {
    const { rows } = build({
      stateHistory: [
        makeState(1, 0, sharedState({})),
        makeState(2, 10, sharedState({ hr: 90 })),
        makeState(3, 20, sharedState({ hr: 100 })),
      ],
      events: [makeEvent({ occurred_at: at(30), state_version: 1 })],
    })
    expect(actions(rows)[0].behindBy).toBe(2)
  })
})

describe('diffStates — the instructor\'s other inputs (PLAN 15a)', () => {
  const base = normalizeHistoryState(sharedState({}, {}, {
    callerInfoConfirmed: { problem: 'Fall from ladder', address: '145 Hymus', extra1Label: '', extra1: '' },
    dispatchRouteConfirmed: { originAddress: 'John Abbott', destinationAddress: '145 Hymus', geometry: [], status: 'ready', runId: 'a' },
    defibrillatorModelConfirmed: 'wagamiX',
    dispatchConfirmedSeconds: 240,
    dispatch: { runId: 'r1', startedAt: 1, countdownEndsAt: 2, callerEvents: [], acknowledgedAt: null },
    cprOverrideActive: false,
  }))
  const with_ = (extra: Record<string, unknown>, confirmed: Record<string, unknown> = {}) =>
    normalizeHistoryState(sharedState(confirmed, {}, {
      callerInfoConfirmed: { problem: 'Fall from ladder', address: '145 Hymus', extra1Label: '', extra1: '' },
      dispatchRouteConfirmed: { originAddress: 'John Abbott', destinationAddress: '145 Hymus', geometry: [], status: 'ready', runId: 'a' },
      defibrillatorModelConfirmed: 'wagamiX',
      dispatchConfirmedSeconds: 240,
      dispatch: { runId: 'r1', startedAt: 1, countdownEndsAt: 2, callerEvents: [], acknowledgedAt: null },
      cprOverrideActive: false,
      ...extra,
    }))

  it('reports a waveform change', () => {
    expect(diffStates(base, with_({}, { spo2_waveform: 'weak', etco2_waveform: 'obstructed' }))).toEqual([
      expect.objectContaining({ group: 'patient', label: 'SpO2 waveform', before: 'Normal', after: 'Weak', summary: 'SpO2 waveform Normal → Weak' }),
      expect.objectContaining({ group: 'patient', label: 'EtCO2 waveform', before: 'Normal', after: 'Obstructed' }),
    ])
  })

  it('reports a defibrillator model change', () => {
    expect(diffStates(base, with_({ defibrillatorModelConfirmed: 'wagamiZ' }))).toEqual([
      expect.objectContaining({ group: 'device', summary: 'defibrillator Wagami X → Wagami Z' }),
    ])
  })

  it('reports a response time change as minutes and seconds', () => {
    expect(diffStates(base, with_({ dispatchConfirmedSeconds: 372 }))).toEqual([
      expect.objectContaining({ group: 'timing', summary: 'response time 4:00 → 6:12' }),
    ])
  })

  it('reports each dispatch card field by the console\'s own label', () => {
    const next = with_({
      callerInfoConfirmed: { problem: 'Fall from ladder', address: '145 Hymus', update: 'Now unresponsive', priority: 'P1', extra1Label: '', extra1: '' },
    })
    expect(diffStates(base, next)).toEqual([
      expect.objectContaining({ group: 'dispatch', label: 'Priority', before: '(empty)', after: 'P1' }),
      expect.objectContaining({ group: 'dispatch', label: 'Mise a jour', before: '(empty)', after: 'Now unresponsive' }),
    ])
  })

  it('ignores an extra slot until it has a name', () => {
    const unnamed = with_({ callerInfoConfirmed: { problem: 'Fall from ladder', address: '145 Hymus', extra1Label: '', extra1: 'stray' } })
    expect(diffStates(base, unnamed)).toEqual([])
    const named = with_({ callerInfoConfirmed: { problem: 'Fall from ladder', address: '145 Hymus', extra1Label: 'Allergies', extra1: 'penicillin' } })
    expect(diffStates(base, named).map((c) => c.label)).toEqual(['Extra 1 name', 'Extra 1'])
  })

  it('reports the route by its addresses only', () => {
    expect(diffStates(base, with_({
      dispatchRouteConfirmed: { originAddress: 'John Abbott', destinationAddress: '2100 St-Jean', geometry: [{ lat: 1, lng: 2 }], status: 'loading', runId: 'b' },
    }))).toEqual([expect.objectContaining({ group: 'route', label: 'destination', after: '2100 St-Jean' })])
  })

  it('describes a monitor reset as an event, not a counter', () => {
    expect(diffStates(with_({ monitorResetVersion: 0 }), with_({ monitorResetVersion: 1 }))).toEqual([
      expect.objectContaining({ group: 'care', label: 'monitor', before: 'running', after: 'reset', summary: 'monitor reset' }),
    ])
  })

  it('never compares the fields the instructor did not set', () => {
    const noise = with_({
      dispatch: { runId: 'r2', startedAt: 99, countdownEndsAt: 100, callerEvents: [{ x: 1 }], acknowledgedAt: 5, arrivedAt: 6, transportedAt: 7 },
      dispatchRouteConfirmed: { originAddress: 'John Abbott', destinationAddress: '145 Hymus', geometry: [{ lat: 1, lng: 2 }], status: 'failed', origin: { lat: 9, lng: 9 }, distanceMeters: 5, runId: 'zzz' },
      cprOverrideActive: true,
    })
    expect(diffStates(base, noise)).toEqual([])
  })
})

describe('summarizeChanges (PLAN 15b)', () => {
  const change = (group: 'patient' | 'dispatch' | 'route' | 'care', label: string, summary = `${label} x → y`) =>
    ({ group, label, before: 'x', after: 'y', summary })

  it('names clinical changes and counts the dispatch card', () => {
    expect(summarizeChanges([
      change('patient', 'HR', 'HR 88 → 112'),
      change('dispatch', 'Priority'),
      change('dispatch', 'Mise a jour'),
      change('dispatch', 'Adresse'),
    ])).toEqual(['HR 88 → 112', 'dispatch card · 3 fields'])
  })

  it('names which route endpoints moved', () => {
    expect(summarizeChanges([change('route', 'destination')])).toEqual(['route · destination'])
    expect(summarizeChanges([change('route', 'origin'), change('route', 'destination')])).toEqual(['route · origin, destination'])
    expect(summarizeChanges([change('dispatch', 'Adresse')])).toEqual(['dispatch card · 1 field'])
  })

  it('ends a long line in +n more', () => {
    const many = Array.from({ length: SUMMARY_CLAUSE_LIMIT + 3 }, (_, i) => change('patient', `f${i}`, `f${i}`))
    const out = summarizeChanges(many)
    expect(out).toHaveLength(SUMMARY_CLAUSE_LIMIT)
    expect(out.at(-1)).toBe('+4 more')
  })
})

describe('describeState (PLAN 15c)', () => {
  it('lays the opening scenario out by group and skips empty fields', () => {
    const facts = describeState(normalizeHistoryState(sharedState({ hr: 124 }, { hr: false, etco2: false }, {
      scenarioTitleConfirmed: 'Fall from ladder',
      callerInfoConfirmed: { callNumber: '2026-1', priority: 'P1', problem: 'Male, 58', address: '145 Hymus', update: '', extra1Label: 'Allergies', extra1: 'none', extra2Label: '', extra2: 'stray' },
      dispatchRouteConfirmed: { originAddress: 'John Abbott', destinationAddress: '145 Hymus' },
      dispatchConfirmedSeconds: 240,
      defibrillatorModelConfirmed: 'wagamiZ',
      cprMode: 'weak',
    })))
    expect(facts).toEqual([
      { group: 'Dispatch', label: 'Scenario', value: 'Fall from ladder' },
      { group: 'Dispatch', label: 'Call #', value: '2026-1' },
      { group: 'Dispatch', label: 'Priority', value: 'P1' },
      { group: 'Dispatch', label: 'Adresse', value: '145 Hymus' },
      { group: 'Dispatch', label: 'Probleme', value: 'Male, 58' },
      { group: 'Dispatch', label: 'Allergies', value: 'none' },
      { group: 'Dispatch', label: 'From', value: 'John Abbott' },
      { group: 'Dispatch', label: 'Response time', value: '4:00' },
      { group: 'Patient', label: 'Rhythm', value: 'NSR' },
      { group: 'Patient', label: 'HR', value: '124 (off)' },
      { group: 'Patient', label: 'BP', value: '118/76' },
      { group: 'Patient', label: 'SpO2', value: '97' },
      { group: 'Patient', label: 'SpO2 waveform', value: 'Normal' },
      { group: 'Patient', label: 'EtCO2', value: '35 (off)' },
      { group: 'Patient', label: 'EtCO2 waveform', value: 'Normal' },
      { group: 'Patient', label: 'CPR', value: 'Weak' },
      { group: 'Device', label: 'Defibrillator', value: 'Wagami Z' },
    ])
  })

  it('populates the opening row and leaves later rows with their diff only', () => {
    const { rows } = build({
      stateHistory: [
        makeState(1, 0, sharedState({}, {}, { callerInfoConfirmed: { problem: 'Fall' } })),
        makeState(2, 10, sharedState({ hr: 90 }, {}, { callerInfoConfirmed: { problem: 'Fall' } })),
      ],
    })
    const [opening, later] = instructorRows(rows)
    expect(opening.snapshot.length).toBeGreaterThan(0)
    expect(opening.fieldChanges).toEqual([])
    expect(later.snapshot).toEqual([])
    expect(later.fieldChanges).toEqual([expect.objectContaining({ label: 'HR', before: '88', after: '90' })])
    expect(later.changes).toEqual(['HR 88 → 90'])
  })
})

describe('buildEvaluationTimeline — BP appears only once the trainee reads it', () => {
  const reading = (seconds: number, sys: number, dia: number, over = {}) =>
    makeEvent({ kind: 'nibp_result', label: `NIBP ${sys}/${dia}`, payload: { bp_sys: sys, bp_dia: dia }, occurred_at: at(seconds), state_version: 1, ...over })
  const bpOf = (row: TimelineActionRow | TimelineInstructorRow) =>
    (row.context as TimelineStateContext).vitals.find((v) => v.label === 'BP')

  it('shows dashes before any reading, even though the instructor sent a pressure', () => {
    const { rows } = build({
      stateHistory: [makeState(1, 0, sharedState({ bp_sys: 88, bp_dia: 54 }))],
      events: [makeEvent({ kind: 'power_on', label: 'Power On', occurred_at: at(10), state_version: 1 })],
    })
    expect(bpOf(actions(rows)[0])).toEqual({ label: 'BP', value: '--/--', alarm: false })
  })

  it('does not raise a BP alarm for a pressure the monitor never displayed', () => {
    // 88/54 is below the systolic threshold, but nobody has taken it.
    const { rows } = build({
      stateHistory: [makeState(1, 0, sharedState({ bp_sys: 88, bp_dia: 54 }))],
      events: [makeEvent({ occurred_at: at(10), state_version: 1 })],
    })
    const row = actions(rows)[0]
    expect(row.inAlarm).toBe(false)
    expect((row.context as TimelineStateContext).alarms).toEqual([])
  })

  it('shows the reading from the moment it is taken, and alarms on it', () => {
    const { rows } = build({
      stateHistory: [makeState(1, 0, sharedState({ bp_sys: 88, bp_dia: 54 }))],
      events: [
        makeEvent({ kind: 'power_on', label: 'Power On', occurred_at: at(10), state_version: 1 }),
        reading(20, 88, 54),
        makeEvent({ kind: 'medication', label: 'AAS', occurred_at: at(30), state_version: 1 }),
      ],
    })
    const [before, result, after] = actions(rows)
    expect(bpOf(before)?.value).toBe('--/--')
    expect(before.inAlarm).toBe(false)
    expect(bpOf(result)).toEqual({ label: 'BP', value: '88/54', alarm: true })
    expect(result.inAlarm).toBe(true)
    expect(bpOf(after)?.value).toBe('88/54')
  })

  it('holds the last reading rather than following the instructor', () => {
    const { rows } = build({
      stateHistory: [
        makeState(1, 0, sharedState({ bp_sys: 120, bp_dia: 80 })),
        makeState(2, 30, sharedState({ bp_sys: 88, bp_dia: 54 })),
      ],
      events: [
        reading(10, 120, 80),
        makeEvent({ kind: 'medication', label: 'AAS', occurred_at: at(40), state_version: 2 }),
        reading(50, 88, 54, { state_version: 2 }),
      ],
    })
    const [, afterInstructorChange, secondReading] = actions(rows)
    // The instructor dropped the pressure at t+30; the cuff has not re-read.
    expect(bpOf(afterInstructorChange)?.value).toBe('120/80')
    expect(afterInstructorChange.inAlarm).toBe(false)
    expect(bpOf(secondReading)?.value).toBe('88/54')
  })

  it('clears the reading on a monitor reset', () => {
    const { rows } = build({
      stateHistory: [
        makeState(1, 0, sharedState({}, {}, { monitorResetVersion: 0 })),
        makeState(2, 30, sharedState({}, {}, { monitorResetVersion: 1 })),
      ],
      events: [
        reading(10, 120, 80),
        makeEvent({ kind: 'power_on', label: 'Power On', occurred_at: at(40), state_version: 2 }),
      ],
    })
    const [firstReading, afterReset] = actions(rows)
    expect(bpOf(firstReading)?.value).toBe('120/80')
    expect(bpOf(afterReset)?.value).toBe('--/--')
  })

  it('omits BP entirely when the channels were off for the whole attempt, reading or not', () => {
    const { rows } = build({
      stateHistory: [makeState(1, 0, sharedState({}, { bp_sys: false, bp_dia: false }))],
      events: [reading(10, 120, 80)],
    })
    expect(bpOf(actions(rows)[0])).toBeUndefined()
  })

  it('shows dashes for a reading taken while the instructor had the channels off', () => {
    const { rows } = build({
      stateHistory: [
        makeState(1, 0, sharedState({})),
        makeState(2, 20, sharedState({}, { bp_sys: false, bp_dia: false })),
      ],
      events: [reading(10, 120, 80), makeEvent({ occurred_at: at(30), state_version: 2 })],
    })
    expect(bpOf(actions(rows)[1])?.value).toBe('--/--')
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
        makeEvent({ kind: 'nibp_result', label: 'NIBP 82/48', payload: { bp_sys: 82, bp_dia: 48 }, occurred_at: at(300), state_version: 2 }),
        makeEvent({ kind: 'medication', label: 'Epinephrine', occurred_at: at(302), state_version: 2 }),
      ],
    })
    const [early, , late] = actions(rows)
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
    // BP reads as dashes because the trainee never took one, not because the
    // channel is off -- the column is present, the reading is not.
    expect(context.vitals).toEqual([{ label: 'BP', value: '--/--', alarm: false }])
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

  it('carries the scenario name onto the opening row', () => {
    const { rows } = build({
      stateHistory: [makeState(1, 0, sharedState({}, {}, { scenarioTitleConfirmed: 'Fall from ladder' }))],
    })
    expect(instructorRows(rows)[0].scenarioTitle).toBe('Fall from ladder')
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
