import { RHYTHM_LABELS } from '@/lib/rhythmLabels'
import { CALLER_INFO_FIELDS, type CallerInfoField } from '@/types/callerInfo'
import type { DefibrillatorModel } from '@/types/defibrillator'
import {
  getActiveAlarms,
  type AlarmChannel,
  type CprMode,
  type Etco2Waveform,
  type NumericVitalField,
  type Rhythm,
  type Spo2Waveform,
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
  /**
   * The one-line summary: clinical changes named individually, the dispatch
   * card and route collapsed by group. Empty on a Send that changed nothing.
   */
  changes: string[]
  /** Every changed field with its before and after, for the expansion. */
  fieldChanges: FieldChange[]
  /** The attempt's first state: an opening position rather than a change. */
  opening: boolean
  /** The full sent state, grouped as the console groups it. Only the opening row shows it. */
  snapshot: StateFact[]
  /** The scenario running at this point, by name. Empty when unnamed. */
  scenarioTitle: string
}

/** Where a change belongs, which decides whether the summary names it or counts it. */
export type ChangeGroup = 'patient' | 'care' | 'scenario' | 'device' | 'timing' | 'dispatch' | 'route'

export type FieldChange = {
  group: ChangeGroup
  label: string
  before: string
  after: string
  /** The one-line form, e.g. `HR 88 → 112` or `SpO2 off`. */
  summary: string
}

export type StateFactGroup = 'Dispatch' | 'Patient' | 'Device'

export type StateFact = {
  group: StateFactGroup
  label: string
  value: string
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
  spo2Waveform: Spo2Waveform
  etco2Waveform: Etco2Waveform
  cprMode: CprMode
  monitorResetVersion: number | null
  /** The scenario's name, empty when the instructor never named one. */
  scenarioTitle: string
  defibrillatorModel: DefibrillatorModel | null
  /** Every field of the dispatch card, empty strings for the ones left blank. */
  callerInfo: Record<CallerInfoField, string>
  originAddress: string
  destinationAddress: string
  /** The confirmed response time, or null when none was set. */
  responseSeconds: number | null
}

const CALLER_FIELDS: readonly CallerInfoField[] = CALLER_INFO_FIELDS.map((entry) => entry.field)
const CALLER_LABELS: Record<CallerInfoField, string> = Object.fromEntries(
  CALLER_INFO_FIELDS.map((entry) => [entry.field, entry.label]),
) as Record<CallerInfoField, string>

const SPO2_WAVEFORM_LABELS: Record<Spo2Waveform, string> = { normal: 'Normal', weak: 'Weak', off: 'Off' }
const ETCO2_WAVEFORM_LABELS: Record<Etco2Waveform, string> = {
  normal: 'Normal',
  hypoventilation: 'Hypoventilation',
  obstructed: 'Obstructed',
  off: 'Off',
}
const DEFIB_LABELS: Record<DefibrillatorModel, string> = { wagamiX: 'Wagami X', wagamiZ: 'Wagami Z' }

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function spo2WaveformOrOff(value: unknown): Spo2Waveform {
  return value === 'normal' || value === 'weak' ? value : 'off'
}

function etco2WaveformOrOff(value: unknown): Etco2Waveform {
  return value === 'normal' || value === 'hypoventilation' || value === 'obstructed' ? value : 'off'
}

function defibOrNull(value: unknown): DefibrillatorModel | null {
  return value === 'wagamiX' || value === 'wagamiZ' ? value : null
}

/** `4:00`, for a response time or any other duration the instructor set. */
export function formatSeconds(total: number): string {
  const seconds = Math.max(0, Math.floor(total))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
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

  const callerRaw = isRecord(root.callerInfoConfirmed) ? root.callerInfoConfirmed : {}
  const callerInfo = {} as Record<CallerInfoField, string>
  for (const field of CALLER_FIELDS) callerInfo[field] = stringOrEmpty(callerRaw[field])

  // Only the addresses. The route also carries a polyline, coordinates, and a
  // loading status, none of which the instructor typed (docs/adr on 13f).
  const route = isRecord(root.dispatchRouteConfirmed) ? root.dispatchRouteConfirmed : {}

  return {
    rhythm: rhythmOrOff(confirmed.rhythm),
    vitals,
    active,
    spo2Waveform: spo2WaveformOrOff(confirmed.spo2_waveform),
    etco2Waveform: etco2WaveformOrOff(confirmed.etco2_waveform),
    cprMode: cprModeOrOff(root.cprMode),
    monitorResetVersion: numberOrNull(root.monitorResetVersion),
    scenarioTitle: stringOrEmpty(root.scenarioTitleConfirmed),
    defibrillatorModel: defibOrNull(root.defibrillatorModelConfirmed),
    callerInfo,
    originAddress: stringOrEmpty(route.originAddress),
    destinationAddress: stringOrEmpty(route.destinationAddress),
    responseSeconds: numberOrNull(root.dispatchConfirmedSeconds),
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

/**
 * The blood pressure on the trainee's screen, or null when there is none.
 *
 * NIBP is intermittent: the cuff reads only when the trainee starts it, so
 * the monitor shows `--/--` until then and holds the last reading afterwards.
 * The instructor's confirmed BP is what the cuff *will* report, not what is
 * displayed, and `acceptedBp` -- the value actually on screen -- is
 * trainee-local and never reaches the record. So the report reconstructs it
 * from the `nibp_result` events, which are emitted in the same callback that
 * puts the reading on screen.
 */
export type BpReading = { sys: number; dia: number } | null

function alarmsFor(state: NormalizedState, bp: BpReading): AlarmChannel[] {
  return getActiveAlarms(
    {
      hr: state.vitals.hr ?? Number.NaN,
      bp_sys: bp?.sys ?? Number.NaN,
      bp_dia: bp?.dia ?? Number.NaN,
      spo2: state.vitals.spo2 ?? Number.NaN,
    },
    // No reading means no BP alarm. A patient whose configured pressure is
    // 88/54 is not in a BP alarm state on a monitor that has never taken it.
    { ...state.active, bp_sys: bp !== null && state.active.bp_sys, bp_dia: bp !== null && state.active.bp_dia },
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
  bp: BpReading,
): TimelineStateContext {
  const alarms = alarmsFor(state, bp)
  const alarmed = new Set(alarms)
  const vitals: TimelineVital[] = []

  const show = (field: NumericVitalField) => everActive.has(field)
  const read = (field: NumericVitalField) => {
    const value = state.vitals[field]
    return state.active[field] && value !== null ? String(value) : '--'
  }

  if (show('bp_sys') || show('bp_dia')) {
    // What the cuff last reported, not what the instructor configured.
    const channelsOn = state.active.bp_sys && state.active.bp_dia
    vitals.push({
      label: VITAL_LABELS.bp_sys,
      value: bp === null || !channelsOn ? '--/--' : `${bp.sys}/${bp.dia}`,
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

/**
 * What changed between two sent states, one entry per field.
 *
 * Read by explicit allowlist. The stored state also carries the dispatch
 * clock's run id and deadlines, the route's polyline and status, the
 * trainee's acknowledged/arrived/transported stamps (already rows of their
 * own in the stream), and a legacy CPR mirror. None of that is something the
 * instructor set, so none of it is ever compared.
 */
export function diffStates(previous: NormalizedState, next: NormalizedState): FieldChange[] {
  const changes: FieldChange[] = []
  const push = (group: ChangeGroup, label: string, before: string, after: string, summary?: string) =>
    changes.push({ group, label, before, after, summary: summary ?? `${label} ${before} → ${after}` })

  if (previous.rhythm !== next.rhythm) {
    push('patient', 'rhythm', RHYTHM_LABELS[previous.rhythm], RHYTHM_LABELS[next.rhythm])
  }

  for (const field of NUMERIC_FIELDS) {
    const wasOn = previous.active[field]
    const isOn = next.active[field]
    if (wasOn !== isOn) {
      // A channel that just came on has no previous value worth diffing, and
      // one that just went off has no new value. The toggle is the change.
      push('patient', CHANGE_LABELS[field], wasOn ? 'on' : 'off', isOn ? 'on' : 'off',
        `${CHANGE_LABELS[field]} ${isOn ? 'on' : 'off'}`)
      continue
    }
    if (!isOn) continue
    const before = previous.vitals[field]
    const after = next.vitals[field]
    if (before !== after && after !== null) {
      push('patient', CHANGE_LABELS[field], String(before ?? '--'), String(after))
    }
  }

  if (previous.spo2Waveform !== next.spo2Waveform) {
    push('patient', 'SpO2 waveform', SPO2_WAVEFORM_LABELS[previous.spo2Waveform], SPO2_WAVEFORM_LABELS[next.spo2Waveform])
  }
  if (previous.etco2Waveform !== next.etco2Waveform) {
    push('patient', 'EtCO2 waveform', ETCO2_WAVEFORM_LABELS[previous.etco2Waveform], ETCO2_WAVEFORM_LABELS[next.etco2Waveform])
  }

  if (previous.scenarioTitle !== next.scenarioTitle) {
    push('scenario', 'scenario', previous.scenarioTitle || 'untitled', next.scenarioTitle || 'untitled',
      next.scenarioTitle
        ? `scenario "${previous.scenarioTitle || 'untitled'}" → "${next.scenarioTitle}"`
        : 'scenario name cleared')
  }

  if (previous.cprMode !== next.cprMode) {
    push('care', 'CPR', CPR_LABELS[previous.cprMode], CPR_LABELS[next.cprMode])
  }

  if (
    previous.monitorResetVersion !== null &&
    next.monitorResetVersion !== null &&
    previous.monitorResetVersion !== next.monitorResetVersion
  ) {
    // The counter behind this is bookkeeping; the change is that a reset happened.
    push('care', 'monitor', 'running', 'reset', 'monitor reset')
  }

  if (previous.defibrillatorModel !== next.defibrillatorModel && next.defibrillatorModel !== null) {
    push('device', 'defibrillator',
      previous.defibrillatorModel ? DEFIB_LABELS[previous.defibrillatorModel] : '--',
      DEFIB_LABELS[next.defibrillatorModel])
  }

  if (previous.responseSeconds !== next.responseSeconds && next.responseSeconds !== null) {
    push('timing', 'response time',
      previous.responseSeconds === null ? '--' : formatSeconds(previous.responseSeconds),
      formatSeconds(next.responseSeconds))
  }

  for (const field of CALLER_FIELDS) {
    const before = previous.callerInfo[field]
    const after = next.callerInfo[field]
    if (before === after) continue
    // An extra slot is only meaningful once it has a name.
    if (/^extra[123]$/.test(field)) {
      const labelField = `${field}Label` as CallerInfoField
      if (!previous.callerInfo[labelField] && !next.callerInfo[labelField]) continue
    }
    push('dispatch', CALLER_LABELS[field], before || '(empty)', after || '(empty)')
  }

  if (previous.originAddress !== next.originAddress) {
    push('route', 'origin', previous.originAddress || '(empty)', next.originAddress || '(empty)')
  }
  if (previous.destinationAddress !== next.destinationAddress) {
    push('route', 'destination', previous.destinationAddress || '(empty)', next.destinationAddress || '(empty)')
  }

  return changes
}

/** More clauses than this and the line ends in `+n more`. */
export const SUMMARY_CLAUSE_LIMIT = 6

/**
 * The one-line form. Clinical, care, scenario, device, and timing changes are
 * the ones read at a glance, so each is named. The dispatch card and the
 * route collapse to a count, since a Send that rewrites six card fields must
 * not become a six-clause row -- the expansion has the fields.
 */
export function summarizeChanges(changes: readonly FieldChange[]): string[] {
  const clauses: string[] = []
  const dispatch = changes.filter((change) => change.group === 'dispatch')
  const route = changes.filter((change) => change.group === 'route')

  for (const change of changes) {
    if (change.group === 'dispatch' || change.group === 'route') continue
    clauses.push(change.summary)
  }
  if (dispatch.length > 0) {
    clauses.push(`dispatch card · ${dispatch.length} field${dispatch.length === 1 ? '' : 's'}`)
  }
  if (route.length > 0) {
    clauses.push(`route · ${route.map((change) => change.label).join(', ')}`)
  }

  if (clauses.length > SUMMARY_CLAUSE_LIMIT) {
    const shown = clauses.slice(0, SUMMARY_CLAUSE_LIMIT - 1)
    return [...shown, `+${clauses.length - shown.length} more`]
  }
  return clauses
}

/**
 * The full sent state as facts, grouped the way the console groups its tabs.
 * Empty fields are absent rather than rendered blank: an unused extra slot
 * is not information. Only the opening instructor change shows this; every
 * later one shows its diff, since real room data put 79% of the dispatch
 * card as a repeat of the row above when every row rendered it.
 */
export function describeState(state: NormalizedState): StateFact[] {
  const facts: StateFact[] = []
  const fact = (group: StateFactGroup, label: string, value: string) => {
    if (value) facts.push({ group, label, value })
  }

  if (state.scenarioTitle) fact('Dispatch', 'Scenario', state.scenarioTitle)
  for (const field of CALLER_FIELDS) {
    if (/^extra[123]Label$/.test(field)) continue
    const match = /^extra([123])$/.exec(field)
    if (match) {
      const name = state.callerInfo[`extra${match[1]}Label` as CallerInfoField]
      if (name) fact('Dispatch', name, state.callerInfo[field])
      continue
    }
    fact('Dispatch', CALLER_LABELS[field], state.callerInfo[field])
  }
  fact('Dispatch', 'From', state.originAddress)
  if (state.destinationAddress && state.destinationAddress !== state.callerInfo.address) {
    fact('Dispatch', 'To', state.destinationAddress)
  }
  if (state.responseSeconds !== null) fact('Dispatch', 'Response time', formatSeconds(state.responseSeconds))

  const channel = (field: NumericVitalField) => {
    const value = state.vitals[field]
    return value === null ? '' : `${value}${state.active[field] ? '' : ' (off)'}`
  }
  fact('Patient', 'Rhythm', RHYTHM_LABELS[state.rhythm])
  fact('Patient', 'HR', channel('hr'))
  if (state.vitals.bp_sys !== null && state.vitals.bp_dia !== null) {
    const on = state.active.bp_sys && state.active.bp_dia
    fact('Patient', 'BP', `${state.vitals.bp_sys}/${state.vitals.bp_dia}${on ? '' : ' (off)'}`)
  }
  fact('Patient', 'SpO2', channel('spo2'))
  fact('Patient', 'SpO2 waveform', SPO2_WAVEFORM_LABELS[state.spo2Waveform])
  fact('Patient', 'EtCO2', channel('etco2'))
  fact('Patient', 'EtCO2 waveform', ETCO2_WAVEFORM_LABELS[state.etco2Waveform])
  fact('Patient', 'CPR', CPR_LABELS[state.cprMode])

  if (state.defibrillatorModel) fact('Device', 'Defibrillator', DEFIB_LABELS[state.defibrillatorModel])

  return facts
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

  // When a reading appeared on the trainee's screen, and when it was cleared.
  // A monitor reset clears the accepted reading, so the display goes back to
  // `--/--` until the trainee takes another one.
  const bpChanges: Array<{ at: number; bp: BpReading }> = []
  for (const { event, at } of events) {
    if (event.kind !== 'nibp_result' || !isRecord(event.payload)) continue
    const sys = numberOrNull(event.payload.bp_sys)
    const dia = numberOrNull(event.payload.bp_dia)
    if (sys !== null && dia !== null) bpChanges.push({ at, bp: { sys, dia } })
  }
  history.forEach((item, index) => {
    if (index === 0) return
    const before = states.get(history[index - 1].entry.version)
    const after = states.get(item.entry.version)
    if (!before || !after) return
    if (
      before.monitorResetVersion !== null &&
      after.monitorResetVersion !== null &&
      before.monitorResetVersion !== after.monitorResetVersion
    ) {
      bpChanges.push({ at: item.at, bp: null })
    }
  })
  bpChanges.sort((a, b) => a.at - b.at)

  const bpAt = (at: number): BpReading => {
    let current: BpReading = null
    for (const change of bpChanges) {
      if (change.at > at) break
      current = change.bp
    }
    return current
  }

  const contextFor = (stateVersion: number | null, at: number): TimelineContext => {
    if (stateVersion === null) return { kind: 'dispatch' }
    const state = states.get(stateVersion)
    return state ? buildContext(state, everActive, bpAt(at)) : { kind: 'missing' }
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
    const context = contextFor(event.state_version, at)
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
    const context = buildContext(state, everActive, bpAt(item.at))
    const offsetMs = baselineMs === null ? 0 : item.at - baselineMs

    const fieldChanges = previous ? diffStates(previous, state) : []
    const opening = previous === undefined
    rows.push({
      kind: 'instructor',
      id: `state-${item.entry.version}`,
      offsetMs,
      offset: formatOffset(offsetMs),
      occurredAt: item.entry.applied_at,
      context,
      inAlarm: context.alarms.length > 0,
      version: item.entry.version,
      changes: summarizeChanges(fieldChanges),
      fieldChanges,
      opening,
      snapshot: opening ? describeState(state) : [],
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
