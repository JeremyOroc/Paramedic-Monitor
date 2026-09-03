import { RHYTHM_LABELS } from '@/lib/rhythmLabels'
import {
  getActiveAlarms,
  type AlarmChannel,
  type CprMode,
  type NumericVitalField,
  type Rhythm,
  type VitalActiveState,
} from '@/types/vitals'
import type {
  ParticipantAttempt,
  SessionParticipant,
  SessionStateHistoryEntry,
  StudentEvent,
  StudentEventKind,
} from '@/types/session'

/**
 * The evaluation report's assembly step: the review payload in, one ordered
 * stream of rows out.
 *
 * Kept pure and away from the panel because everything difficult here is
 * arithmetic and ordering -- offsets, state resolution, instructor diffs --
 * and none of it needs a database or a DOM to be checked.
 *
 * It reports; it does not grade. The only derived signal is alarm state, and
 * that comes from `getActiveAlarms` and the thresholds already agreed in
 * `types/vitals.ts`. Whether an action was right stays with the evaluator.
 */

/** One numeric channel as the report prints it. `--` is an inactive channel. */
export type TimelineVital = {
  label: string
  value: string
  alarm: boolean
}

export type TimelineStateContext = {
  kind: 'state'
  rhythm: string
  vitals: TimelineVital[]
  alarms: AlarmChannel[]
}

export type TimelineContext =
  /** The action predates the instructor's first Send -- there is no state to show. */
  | { kind: 'dispatch' }
  /**
   * The action names a state version the history does not contain: a row from
   * before migration 007, or a history write that failed behind a Send. Saying
   * so beats inventing a state the trainee never saw.
   */
  | { kind: 'missing' }
  | TimelineStateContext

type TimelineRowBase = {
  id: string
  /** Milliseconds from the attempt baseline. Negative if the row predates it. */
  offsetMs: number
  /** `t+4:39`, or `t+1:04:22` past the hour. */
  offset: string
  occurredAt: string
  context: TimelineContext
  inAlarm: boolean
}

export type TimelineActionRow = TimelineRowBase & {
  kind: 'action'
  eventKind: StudentEventKind
  label: string
  /** The event's distinguishing detail, already formatted. Empty when it has none. */
  detail: string
  participantId: string
  participantName: string
  /**
   * How many instructor changes the monitor had not yet received when this
   * was pressed. Zero when it was current. A decision made on a stale monitor
   * reads as "had not received it yet," not "ignored it" (docs/adr/0004).
   */
  behindBy: number
  /** True when the row is placed by the trainee's own clock rather than the server's. */
  clientTimed: boolean
}

export type TimelineInstructorRow = TimelineRowBase & {
  kind: 'instructor'
  version: number
  /** `HR 88 → 112`, one per changed field. Empty on a Send that changed nothing clinical. */
  changes: string[]
  /** The attempt's first state: an opening position rather than a change. */
  opening: boolean
  /** The scenario running at this point, by name. Empty when unnamed. */
  scenarioTitle: string
}

export type TimelineRow = TimelineActionRow | TimelineInstructorRow

export type EvaluationTimeline = {
  rows: TimelineRow[]
  /** Epoch ms that `t+0:00` counts from, or null when the run has no rows at all. */
  baselineMs: number | null
  /** Baseline to last row. The run's length as the record can account for it. */
  durationMs: number
  participantNames: string[]
}

export type EvaluationTimelineInput = {
  events: readonly StudentEvent[]
  stateHistory: readonly SessionStateHistoryEntry[]
  attempts: readonly ParticipantAttempt[]
  /** Only id and nickname are used, so a roster row from any shape fits. */
  participants: readonly Pick<SessionParticipant, 'id' | 'nickname'>[]
  attemptVersion: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Reading the state blob
//
// `session_state_history.state` is jsonb the server stored without inspecting,
// so every field is narrowed rather than asserted. A history row written by an
// older client is missing fields, not malformed -- it degrades to what it has.
// ─────────────────────────────────────────────────────────────────────────────

type NormalizedState = {
  rhythm: Rhythm
  vitals: Record<NumericVitalField, number | null>
  active: VitalActiveState
  cprMode: CprMode
  monitorResetVersion: number | null
  /** The scenario's name, empty when the instructor never named one. */
  scenarioTitle: string
}

const NUMERIC_FIELDS: readonly NumericVitalField[] = [
  'hr',
  'bp_sys',
  'bp_dia',
  'spo2',
  'etco2',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function rhythmOrOff(value: unknown): Rhythm {
  return typeof value === 'string' && value in RHYTHM_LABELS ? (value as Rhythm) : 'off'
}

function cprModeOrOff(value: unknown): CprMode {
  return value === 'regular' || value === 'weak' ? value : 'off'
}

export function normalizeHistoryState(state: unknown): NormalizedState {
  const root = isRecord(state) ? state : {}
  const confirmed = isRecord(root.confirmed) ? root.confirmed : {}
  const activeRaw = isRecord(root.confirmedVitalActive) ? root.confirmedVitalActive : {}

  const vitals = {} as Record<NumericVitalField, number | null>
  const active = {} as VitalActiveState
  for (const field of NUMERIC_FIELDS) {
    vitals[field] = numberOrNull(confirmed[field])
    // A channel with no recorded flag is treated as on: the flags arrived after
    // the first sessions, and an older row showing values reads better than one
    // showing dashes it never displayed.
    active[field] = activeRaw[field] !== false
  }

  return {
    rhythm: rhythmOrOff(confirmed.rhythm),
    vitals,
    active,
    cprMode: cprModeOrOff(root.cprMode),
    monitorResetVersion: numberOrNull(root.monitorResetVersion),
    scenarioTitle:
      typeof root.scenarioTitleConfirmed === 'string' ? root.scenarioTitleConfirmed.trim() : '',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The patient-state column
// ─────────────────────────────────────────────────────────────────────────────

const VITAL_LABELS: Record<Exclude<NumericVitalField, 'hr' | 'bp_dia'>, string> = {
  bp_sys: 'BP',
  spo2: 'SpO2',
  etco2: 'EtCO2',
}

function alarmsFor(state: NormalizedState): AlarmChannel[] {
  return getActiveAlarms(
    {
      hr: state.vitals.hr ?? Number.NaN,
      bp_sys: state.vitals.bp_sys ?? Number.NaN,
      bp_dia: state.vitals.bp_dia ?? Number.NaN,
      spo2: state.vitals.spo2 ?? Number.NaN,
    },
    state.active,
  )
}

/**
 * A channel prints its value when it is on and `--` when it is off, but only if
 * it was on at some point in the attempt. A channel nobody ever used is absent
 * rather than a column of dashes -- an arrest should read `VF -- · SpO2 --`,
 * not a wall of them.
 */
function buildContext(
  state: NormalizedState,
  everActive: ReadonlySet<NumericVitalField>,
): TimelineStateContext {
  const alarms = alarmsFor(state)
  const alarmed = new Set(alarms)
  const vitals: TimelineVital[] = []

  const show = (field: NumericVitalField) => everActive.has(field)
  const read = (field: NumericVitalField) => {
    const value = state.vitals[field]
    return state.active[field] && value !== null ? String(value) : '--'
  }

  if (show('bp_sys') || show('bp_dia')) {
    const systolic = read('bp_sys')
    const diastolic = read('bp_dia')
    vitals.push({
      label: VITAL_LABELS.bp_sys,
      value: `${systolic}/${diastolic}`,
      alarm: alarmed.has('bp'),
    })
  }
  if (show('spo2')) {
    vitals.push({ label: VITAL_LABELS.spo2, value: read('spo2'), alarm: alarmed.has('spo2') })
  }
  if (show('etco2')) {
    // No agreed EtCO2 threshold, so it is reported and never flagged.
    vitals.push({ label: VITAL_LABELS.etco2, value: read('etco2'), alarm: false })
  }

  const heartRate = read('hr')
  const rhythm =
    state.cprMode === 'off'
      ? `${RHYTHM_LABELS[state.rhythm]} ${heartRate}`
      : `${RHYTHM_LABELS[state.rhythm]} ${heartRate} (CPR)`

  return { kind: 'state', rhythm, vitals, alarms }
}

// ─────────────────────────────────────────────────────────────────────────────
// The payload column
// ─────────────────────────────────────────────────────────────────────────────

function formatPayloadValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value) ?? ''
}

/**
 * What made this action this action, and nothing else.
 *
 * `state` is dropped from charge and shock: it is the defib state machine's
 * own bookkeeping, not something the evaluator judges. Null entries are
 * dropped too -- a manual NIBP reads `{mode: manual}`, not
 * `{mode: manual, intervalMinutes: null}`.
 */
export function formatEventDetail(event: Pick<StudentEvent, 'kind' | 'label' | 'payload'>): string {
  // The drug name is the label, and the payload only repeats the timestamp
  // already in the offset column.
  if (event.kind === 'medication') return `"${event.label}"`

  if (!isRecord(event.payload)) return ''
  const parts = Object.entries(event.payload)
    .filter(([key, value]) => key !== 'state' && value !== null && value !== undefined)
    .map(([key, value]) => `${key}: ${formatPayloadValue(value)}`)

  return parts.length > 0 ? `{${parts.join(', ')}}` : ''
}

// ─────────────────────────────────────────────────────────────────────────────
// The instructor's changes
// ─────────────────────────────────────────────────────────────────────────────

const CHANGE_LABELS: Record<NumericVitalField, string> = {
  hr: 'HR',
  bp_sys: 'BP sys',
  bp_dia: 'BP dia',
  spo2: 'SpO2',
  etco2: 'EtCO2',
}

// The console's own wording, so a debrief and the panel that drove it agree.
const CPR_LABELS: Record<CprMode, string> = {
  off: 'off',
  regular: 'Regular',
  weak: 'Weak',
}

/** What changed between two sent states, in the evaluator's words. */
export function diffStates(
  previous: NormalizedState,
  next: NormalizedState,
): string[] {
  const changes: string[] = []

  if (previous.rhythm !== next.rhythm) {
    changes.push(`rhythm ${RHYTHM_LABELS[previous.rhythm]} → ${RHYTHM_LABELS[next.rhythm]}`)
  }

  for (const field of NUMERIC_FIELDS) {
    const wasOn = previous.active[field]
    const isOn = next.active[field]
    if (wasOn !== isOn) {
      changes.push(`${CHANGE_LABELS[field]} ${isOn ? 'on' : 'off'}`)
      // A channel that just came on has no previous value worth diffing, and
      // one that just went off has no new value. The toggle is the change.
      continue
    }
    if (!isOn) continue
    const before = previous.vitals[field]
    const after = next.vitals[field]
    if (before !== after && after !== null) {
      changes.push(`${CHANGE_LABELS[field]} ${before ?? '--'} → ${after}`)
    }
  }

  if (previous.scenarioTitle !== next.scenarioTitle) {
    changes.push(
      next.scenarioTitle
        ? `scenario "${previous.scenarioTitle || 'untitled'}" → "${next.scenarioTitle}"`
        : 'scenario name cleared',
    )
  }

  if (previous.cprMode !== next.cprMode) {
    changes.push(`CPR ${CPR_LABELS[previous.cprMode]} → ${CPR_LABELS[next.cprMode]}`)
  }

  if (
    previous.monitorResetVersion !== null &&
    next.monitorResetVersion !== null &&
    previous.monitorResetVersion !== next.monitorResetVersion
  ) {
    changes.push('monitor reset')
  }

  return changes
}

// ─────────────────────────────────────────────────────────────────────────────
// Offsets
// ─────────────────────────────────────────────────────────────────────────────

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * When an action happened, on the server's clock.
 *
 * The trainee's own stamp plus the offset the monitor measured recovers the
 * moment of the press, which is the honest time for an action that waited
 * out an outage. Without an offset the client clock is on its own timeline
 * and cannot be mixed with the instructor's rows, so it falls back to the
 * server's insert time, as rows predating the columns always do.
 */
export function eventTimeMs(
  event: Pick<StudentEvent, 'occurred_at' | 'occurred_at_client' | 'clock_offset_ms'>,
): { at: number; clientTimed: boolean } | null {
  const client = parseTime(event.occurred_at_client)
  if (client !== null && typeof event.clock_offset_ms === 'number') {
    return { at: client + event.clock_offset_ms, clientTimed: true }
  }
  const server = parseTime(event.occurred_at)
  return server === null ? null : { at: server, clientTimed: false }
}

export function formatOffset(offsetMs: number): string {
  const sign = offsetMs < 0 ? '-' : '+'
  const total = Math.floor(Math.abs(offsetMs) / 1000)
  const seconds = total % 60
  const minutes = Math.floor(total / 60) % 60
  const hours = Math.floor(total / 3600)
  const pad = (value: number) => String(value).padStart(2, '0')

  return hours > 0
    ? `t${sign}${hours}:${pad(minutes)}:${pad(seconds)}`
    : `t${sign}${minutes}:${pad(seconds)}`
}

// ─────────────────────────────────────────────────────────────────────────────

export function buildEvaluationTimeline(
  input: EvaluationTimelineInput,
): EvaluationTimeline {
  const { attemptVersion } = input
  const events = input.events
    .filter((event) => event.attempt_version === attemptVersion)
    .map((event) => ({ event, time: eventTimeMs(event) }))
    .filter(
      (entry): entry is { event: StudentEvent; time: { at: number; clientTimed: boolean } } =>
        entry.time !== null,
    )
    .map(({ event, time }) => ({ event, at: time.at, clientTimed: time.clientTimed }))

  const history = input.stateHistory
    .filter((entry) => entry.attempt_version === attemptVersion)
    .map((entry) => ({ entry, at: parseTime(entry.applied_at) }))
    .filter(
      (item): item is { entry: SessionStateHistoryEntry; at: number } => item.at !== null,
    )
    .sort((a, b) => a.entry.version - b.entry.version)

  const names = new Map(input.participants.map((one) => [one.id, one.nickname]))

  // The attempt's own start is the honest zero. Attempts predating the
  // `started_at` write fall back to the first thing that happened, so a legacy
  // run still reads as relative time rather than not at all.
  const attemptStart = input.attempts
    .filter((attempt) => attempt.attempt_version === attemptVersion)
    .map((attempt) => parseTime(attempt.started_at))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)[0]

  const firstRecorded = [
    ...events.map((entry) => entry.at),
    ...history.map((item) => item.at),
  ].sort((a, b) => a - b)[0]

  const baselineMs = attemptStart ?? firstRecorded ?? null

  const states = new Map<number, NormalizedState>()
  for (const item of history) {
    states.set(item.entry.version, normalizeHistoryState(item.entry.state))
  }

  // Which channels this run ever used, so the context column can leave out the
  // ones nobody touched.
  const everActive = new Set<NumericVitalField>()
  for (const state of states.values()) {
    for (const field of NUMERIC_FIELDS) {
      if (state.active[field]) everActive.add(field)
    }
  }
  // HR is the run's spine -- it prints even in an attempt that never sent one.
  everActive.add('hr')

  const contextFor = (stateVersion: number | null): TimelineContext => {
    if (stateVersion === null) return { kind: 'dispatch' }
    const state = states.get(stateVersion)
    return state ? buildContext(state, everActive) : { kind: 'missing' }
  }

  // The version the instructor had sent by a given moment, so an action can
  // be checked against what it should have been looking at.
  const latestVersionBefore = (at: number): number | null => {
    let latest: number | null = null
    for (const item of history) {
      if (item.at <= at) latest = item.entry.version
      else break
    }
    return latest
  }

  const rows: TimelineRow[] = []

  for (const { event, at, clientTimed } of events) {
    const context = contextFor(event.state_version)
    const shouldHaveSeen = latestVersionBefore(at)
    const behindBy =
      event.state_version !== null && shouldHaveSeen !== null
        ? Math.max(0, shouldHaveSeen - event.state_version)
        : 0
    rows.push({
      kind: 'action',
      id: event.id,
      offsetMs: baselineMs === null ? 0 : at - baselineMs,
      offset: formatOffset(baselineMs === null ? 0 : at - baselineMs),
      occurredAt: event.occurred_at,
      context,
      inAlarm: context.kind === 'state' && context.alarms.length > 0,
      eventKind: event.kind,
      label: event.label,
      detail: formatEventDetail(event),
      participantId: event.participant_id,
      participantName: names.get(event.participant_id) ?? 'Unknown',
      behindBy,
      clientTimed,
    })
  }

  history.forEach((item, index) => {
    const state = states.get(item.entry.version)
    if (!state) return
    const previousEntry = index > 0 ? history[index - 1] : null
    const previous = previousEntry ? states.get(previousEntry.entry.version) : undefined
    const context = buildContext(state, everActive)
    const offsetMs = baselineMs === null ? 0 : item.at - baselineMs

    rows.push({
      kind: 'instructor',
      id: `state-${item.entry.version}`,
      offsetMs,
      offset: formatOffset(offsetMs),
      occurredAt: item.entry.applied_at,
      context,
      inAlarm: context.alarms.length > 0,
      version: item.entry.version,
      changes: previous ? diffStates(previous, state) : [],
      opening: previous === undefined,
      scenarioTitle: state.scenarioTitle,
    })
  })

  const sequenceOf = new Map<string, number>()
  for (const { event } of events) {
    if (typeof event.capture_sequence === 'number') sequenceOf.set(event.id, event.capture_sequence)
  }

  rows.sort((a, b) => {
    if (a.offsetMs !== b.offsetMs) return a.offsetMs - b.offsetMs
    // A state change and an action landing in the same millisecond read
    // correctly only one way round: the patient changed, then the trainee acted
    // against what changed.
    if (a.kind !== b.kind) return a.kind === 'instructor' ? -1 : 1
    // Two presses in one millisecond keep the order the monitor counted them.
    const sa = sequenceOf.get(a.id)
    const sb = sequenceOf.get(b.id)
    if (sa !== undefined && sb !== undefined) return sa - sb
    return 0
  })

  const lastOffset = rows.length > 0 ? rows[rows.length - 1].offsetMs : 0

  return {
    rows,
    baselineMs,
    durationMs: Math.max(0, lastOffset),
    participantNames: [...new Set(events.map(({ event }) => names.get(event.participant_id) ?? 'Unknown'))],
  }
}
