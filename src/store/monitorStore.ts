'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import {
  DEFAULT_VITALS,
  type CprMode,
  type Etco2Waveform,
  type NumericVitalField,
  type Rhythm,
  type Spo2Waveform,
  type VitalActiveState,
} from '@/types/vitals'
import {
  DEFAULT_CALLER_INFO,
  normalizeCallerInfo,
  type CallerInfo,
  type CallerInfoField,
} from '@/types/callerInfo'
import {
  DEFAULT_PATIENT_INFO,
  clampAge,
  type PatientInfo,
  type PatientSex,
} from '@/types/patientInfo'
import {
  DEFAULT_DISPATCH_ROUTE,
  JOHN_ABBOTT_ADDRESS,
  JOHN_ABBOTT_COORDINATES,
  normalizeDispatchRoute,
  type DispatchRoute,
} from '@/types/dispatchRoute'
import { dispatchCountdownSeconds, normalizeDispatchAddress } from '@/store/fieldState'
import { buildEventLogEntry } from '@/lib/eventLog'
import {
  getAutomaticHeartRate,
  isAutomaticHeartRateRhythm,
  isHeartRateToggleLockedRhythm,
} from '@/lib/automaticHeartRate'
import type { EventLogEntry } from '@/components/monitor/EventLogModal'
import type { EventLogStamp } from '@/types/eventLog'
import type { ScenarioSnapshotV1 } from '@/types/savedScenario'
import {
  DEFAULT_DEFIBRILLATOR_MODEL,
  normalizeDefibrillatorModel,
  type DefibrillatorModel,
} from '@/types/defibrillator'
import {
  buildVitalTrendParticipants,
  createEmptyVitalTrendConfiguration,
  deriveVitalTrendValues,
  fusedVitalTrendConfiguration,
  isValidFusedVitalValues,
  isValidVitalTrendConfiguration,
  normalizeActiveVitalTrend,
  normalizeVitalTrendConfiguration,
  projectLegacyVitalTrendTargets,
  vitalTrendTargetsFromValues,
  VITAL_TREND_FIELDS,
} from '@/lib/vitalTrend'
import type {
  ActiveVitalTrend,
  VitalTrendConfiguration,
} from '@/types/vitalTrend'

export type Vitals = {
  hr: number
  bp_sys: number
  bp_dia: number
  etco2: number
  spo2: number
  rhythm: Rhythm
  spo2_waveform: Spo2Waveform
  etco2_waveform: Etco2Waveform
}

export type TimedDraftVitals = Partial<Record<NumericVitalField, number>>
export type DraftVitalValues = Partial<Record<NumericVitalField, number>>

const initial: Vitals = {
  hr: 0,
  bp_sys: 0,
  bp_dia: 0,
  etco2: 0,
  spo2: 0,
  rhythm: 'off',
  spo2_waveform: 'off',
  etco2_waveform: 'off',
}

// The ECG on/off switch has no flag of its own — 'off' is a member of Rhythm,
// so switching ECG off overwrites the chosen rhythm. `lastRhythm` remembers the
// selection so switching back on restores it instead of snapping to a default.
// Numeric vitals don't need this: their value and their on/off flag are already
// separate (`draft` vs `draftVitalActive`).
export type ActiveRhythm = Exclude<Rhythm, 'off'>

const DEFAULT_ACTIVE_RHYTHM: ActiveRhythm = 'nsr'

function normalizeActiveRhythm(value: unknown): ActiveRhythm {
  if (typeof value !== 'string') return DEFAULT_ACTIVE_RHYTHM
  if (value === 'off' || !VALID_RHYTHMS.has(value as Rhythm)) {
    return DEFAULT_ACTIVE_RHYTHM
  }
  return value as ActiveRhythm
}

const inactiveVitals: VitalActiveState = {
  hr: false,
  bp_sys: false,
  bp_dia: false,
  etco2: false,
  spo2: false,
}

const activeVitals: VitalActiveState = {
  hr: true,
  bp_sys: true,
  bp_dia: true,
  etco2: true,
  spo2: true,
}

type BpDisplay = Pick<Vitals, 'bp_sys' | 'bp_dia'>
type BpActiveState = Pick<VitalActiveState, 'bp_sys' | 'bp_dia'>
export type Etco2CalibrationStatus = 'idle' | 'calibrating' | 'calibrated'

function normalizeCprMode(value: unknown, legacyActive?: unknown): CprMode {
  if (value === 'regular' || value === 'weak') return value
  if (value === 'off') return 'off'
  return legacyActive === true ? 'regular' : 'off'
}

// Instructor-authoritative state pushed to session monitors. Student-local
// progress (patient info edits, dispatch Acknowledge/Arrival/Transport, EtCO2
// calibration, and the accepted-BP reading layer) is intentionally excluded so
// applying a shared snapshot never wipes what a trainee has done on their own
// monitor. `monitorResetVersion` propagates instructor resets: monitors clear
// their local progress when it changes.
export type SharedMonitorState = {
  defibrillatorModelConfirmed: DefibrillatorModel
  confirmed: Vitals
  confirmedVitalActive: VitalActiveState
  callerInfoConfirmed: CallerInfo
  dispatchRouteConfirmed: DispatchRoute
  dispatch: DispatchState
  dispatchConfirmedSeconds: number
  cprMode?: CprMode
  /** Legacy compatibility for clients that predate the three-state CPR mode. */
  cprOverrideActive: boolean
  monitorResetVersion: number
  activeVitalTrend?: ActiveVitalTrend | null
  /**
   * The scenario the instructor is running, by name. The monitor ignores it;
   * it travels so the evaluation record can say which scenario an attempt was,
   * which nothing else in the sent state reveals. Set at the send site, where
   * the console's title field lives.
   */
  scenarioTitleConfirmed?: string
}

const initialBpDisplay: BpDisplay = {
  bp_sys: initial.bp_sys,
  bp_dia: initial.bp_dia,
}

const inactiveBpActive: BpActiveState = {
  bp_sys: inactiveVitals.bp_sys,
  bp_dia: inactiveVitals.bp_dia,
}

const VALID_RHYTHMS: ReadonlySet<Rhythm> = new Set([
  'off',
  'nsr',
  'vf',
  'vt',
  'torsades',
  'asystole',
  'first-degree',
  'second-degree-type-1',
  'second-degree-type-2',
  'third-degree',
  'anterior-mi',
  'inferior-mi',
])

function normalizeRhythm(value: unknown): Rhythm {
  if (typeof value !== 'string') return DEFAULT_VITALS.rhythm
  return VALID_RHYTHMS.has(value as Rhythm) ? (value as Rhythm) : DEFAULT_VITALS.rhythm
}

function normalizeVitals(vitals: Partial<Vitals> | undefined): Vitals {
  const normalized = {
    ...initial,
    ...vitals,
    rhythm: normalizeRhythm(vitals?.rhythm),
  }
  const automaticHeartRate = getAutomaticHeartRate(normalized.rhythm)
  return automaticHeartRate === null
    ? normalized
    : { ...normalized, hr: automaticHeartRate }
}

function normalizeBpDisplay(
  bp: Partial<BpDisplay> | undefined,
  fallback: Vitals,
): BpDisplay {
  return {
    bp_sys: typeof bp?.bp_sys === 'number' ? bp.bp_sys : fallback.bp_sys,
    bp_dia: typeof bp?.bp_dia === 'number' ? bp.bp_dia : fallback.bp_dia,
  }
}

function normalizeBpActive(
  active: Partial<BpActiveState> | undefined,
  fallback: VitalActiveState,
): BpActiveState {
  return {
    bp_sys: typeof active?.bp_sys === 'boolean' ? active.bp_sys : fallback.bp_sys,
    bp_dia: typeof active?.bp_dia === 'boolean' ? active.bp_dia : fallback.bp_dia,
  }
}

function anyVitalActive(active: VitalActiveState): boolean {
  return Object.values(active).some(Boolean)
}

function normalizeVitalActive(
  active: Partial<VitalActiveState> | undefined,
  legacyActive: boolean | undefined,
): VitalActiveState {
  if (!active) return legacyActive === true ? activeVitals : inactiveVitals
  return {
    hr: active.hr === true,
    bp_sys: active.bp_sys === true,
    bp_dia: active.bp_dia === true,
    etco2: active.etco2 === true,
    spo2: active.spo2 === true,
  }
}

// Dispatch / startup-gate state. Send stages the call; Start locks and stamps
// the countdown. The trainee must Acknowledge, wait it out, then mark Arrival
// before the monitor power button works. Persisted so refresh resumes the drill.
export type DispatchState = {
  runId: string
  armed: boolean
  countdownLocked: boolean
  startedAt: number | null // absolute ms epoch; response timer counts up from here
  countdownEndsAt: number | null // absolute ms epoch; survives refresh
  acknowledgedAt: string | null // EST HH:MM:SS
  arrivedAt: string | null
  transportedAt: string | null
  callerEvents: EventLogEntry[]
}

export const DEFAULT_DISPATCH: DispatchState = {
  runId: '',
  armed: false,
  countdownLocked: false,
  startedAt: null,
  countdownEndsAt: null,
  acknowledgedAt: null,
  arrivedAt: null,
  transportedAt: null,
  callerEvents: [],
}

const CALLER_EVENT_LABELS = {
  acknowledge: 'Acknowledge',
  arrival: 'Arrival',
  transport: 'Transport',
} as const

function normalizeDispatch(
  dispatch: Partial<DispatchState> | undefined,
  fallbackDurationMs = 0,
): DispatchState {
  const runId = typeof dispatch?.runId === 'string' ? dispatch.runId : ''
  const armed = dispatch?.armed === true
  const hasExplicitStartedAt = dispatch !== undefined && 'startedAt' in dispatch
  const startedAt = typeof dispatch?.startedAt === 'number' ? dispatch.startedAt : null
  const countdownEndsAt =
    typeof dispatch?.countdownEndsAt === 'number' ? dispatch.countdownEndsAt : null
  const legacyStartedAt =
    countdownEndsAt !== null ? countdownEndsAt - fallbackDurationMs : Date.now()
  const normalizedStartedAt =
    startedAt ?? (armed && !hasExplicitStartedAt ? legacyStartedAt : null)
  const countdownLocked =
    typeof dispatch?.countdownLocked === 'boolean'
      ? dispatch.countdownLocked
      : armed && normalizedStartedAt !== null

  return {
    runId: runId || (armed ? `legacy-${countdownEndsAt ?? 'active'}` : ''),
    armed,
    countdownLocked,
    startedAt: normalizedStartedAt,
    countdownEndsAt,
    acknowledgedAt: typeof dispatch?.acknowledgedAt === 'string' ? dispatch.acknowledgedAt : null,
    arrivedAt: typeof dispatch?.arrivedAt === 'string' ? dispatch.arrivedAt : null,
    transportedAt: typeof dispatch?.transportedAt === 'string' ? dispatch.transportedAt : null,
    callerEvents: Array.isArray(dispatch?.callerEvents) ? dispatch.callerEvents : [],
  }
}

export type MonitorState = {
  defibrillatorModelDraft: DefibrillatorModel
  defibrillatorModelSaved: DefibrillatorModel
  defibrillatorModelConfirmed: DefibrillatorModel
  draft: Vitals
  saved: Vitals
  confirmed: Vitals
  /** Last fused numeric targets/non-waveform values sent, separate from live Trend values. */
  confirmedAuthored: Vitals
  draftVitalsActive: boolean
  savedVitalsActive: boolean
  confirmedVitalsActive: boolean
  draftVitalActive: VitalActiveState
  savedVitalActive: VitalActiveState
  confirmedVitalActive: VitalActiveState
  /** Last rhythm chosen while ECG was on; restored when it is switched back on. */
  lastRhythm: ActiveRhythm
  /** FC value restored after leaving an automatic rhythm group. */
  manualHrBeforeAuto: number | null
  /** FC channel state restored after leaving a rhythm-owned Automatic FC lock. */
  manualHrActiveBeforeLock: boolean | null
  callerInfoDraft: CallerInfo
  callerInfoSaved: CallerInfo
  callerInfoConfirmed: CallerInfo
  dispatchRouteDraft: DispatchRoute
  dispatchRouteSaved: DispatchRoute
  dispatchRouteConfirmed: DispatchRoute
  patientInfo: PatientInfo
  dispatch: DispatchState
  dispatchMinutes: number
  dispatchSeconds: number
  dispatchSavedSeconds: number
  dispatchConfirmedSeconds: number
  monitorResetVersion: number
  etco2CalibrationStatus: Etco2CalibrationStatus
  cprMode: CprMode
  acceptedBp: BpDisplay
  acceptedBpActive: BpActiveState
  vitalTrendDraft: VitalTrendConfiguration
  vitalTrendSaved: VitalTrendConfiguration
  vitalTrendDraftRevision: number
  vitalTrendSavedRevision: number
  vitalTrendConsumedRevision: number
  activeVitalTrend: ActiveVitalTrend | null
  setDraft: <K extends keyof Vitals>(field: K, value: Vitals[K]) => void
  setDefibrillatorModelDraft: (model: DefibrillatorModel) => void
  setTimedDraftVitals: (vitals: TimedDraftVitals) => void
  setDraftVitalValues: (vitals: DraftVitalValues) => void
  setDraftVitalActive: (field: NumericVitalField, active: boolean) => void
  setVitalTrendMinutes: (minutes: number) => void
  setVitalTrendSeconds: (seconds: number) => void
  setCallerInfoDraft: (field: CallerInfoField, value: string) => void
  setDispatchRouteDraft: (route: DispatchRoute) => void
  applyDispatchRouteResolution: (route: DispatchRoute) => void
  setPatientAge: (age: number) => void
  setPatientSex: (sex: PatientSex) => void
  setDispatchMinutes: (minutes: number) => void
  setDispatchSeconds: (seconds: number) => void
  applyScenarioDraft: (snapshot: ScenarioSnapshotV1) => void
  acknowledgeCall: (stamp: EventLogStamp | string) => void
  arriveCall: (stamp: EventLogStamp | string) => void
  transportCall: (stamp: EventLogStamp | string) => void
  startEtco2Calibration: () => void
  cancelEtco2Calibration: () => void
  completeEtco2Calibration: () => void
  setCprMode: (mode: CprMode) => void
  acceptBpReading: (bp: BpDisplay, active: BpActiveState) => void
  advanceVitalTrend: (now?: number) => void
  markVitalTrendCompletionPublished: (id: string, published?: boolean) => void
  resetMonitorVitals: () => void
  resetVitalsToNormal: () => void
  save: () => void
  send: () => void
  startDispatchClock: () => void
  getSharedState: () => SharedMonitorState
  applySharedState: (shared: Partial<SharedMonitorState>) => void
  resetForNewAttempt: () => void
  reset: () => void
}

export const STORAGE_KEY = 'paramedic-monitor.v1'

export const useMonitorStore = create<MonitorState>()(
  persist(
    (set, get) => ({
      defibrillatorModelDraft: DEFAULT_DEFIBRILLATOR_MODEL,
      defibrillatorModelSaved: DEFAULT_DEFIBRILLATOR_MODEL,
      defibrillatorModelConfirmed: DEFAULT_DEFIBRILLATOR_MODEL,
      draft: initial,
      saved: initial,
      confirmed: initial,
      confirmedAuthored: initial,
      draftVitalsActive: false,
      savedVitalsActive: false,
      confirmedVitalsActive: false,
      draftVitalActive: inactiveVitals,
      savedVitalActive: inactiveVitals,
      confirmedVitalActive: inactiveVitals,
      lastRhythm: DEFAULT_ACTIVE_RHYTHM,
      manualHrBeforeAuto: null,
      manualHrActiveBeforeLock: null,
      callerInfoDraft: DEFAULT_CALLER_INFO,
      callerInfoSaved: DEFAULT_CALLER_INFO,
      callerInfoConfirmed: DEFAULT_CALLER_INFO,
      dispatchRouteDraft: DEFAULT_DISPATCH_ROUTE,
      dispatchRouteSaved: DEFAULT_DISPATCH_ROUTE,
      dispatchRouteConfirmed: DEFAULT_DISPATCH_ROUTE,
      patientInfo: DEFAULT_PATIENT_INFO,
      dispatch: DEFAULT_DISPATCH,
      dispatchMinutes: 0,
      dispatchSeconds: 0,
      dispatchSavedSeconds: 0,
      dispatchConfirmedSeconds: 0,
      monitorResetVersion: 0,
      etco2CalibrationStatus: 'idle',
      cprMode: 'off',
      acceptedBp: initialBpDisplay,
      acceptedBpActive: inactiveBpActive,
      vitalTrendDraft: createEmptyVitalTrendConfiguration(),
      vitalTrendSaved: createEmptyVitalTrendConfiguration(),
      vitalTrendDraftRevision: 0,
      vitalTrendSavedRevision: 0,
      vitalTrendConsumedRevision: 0,
      activeVitalTrend: null,
      setDefibrillatorModelDraft: (model) =>
        set({ defibrillatorModelDraft: normalizeDefibrillatorModel(model) }),
      setDraft: (field, value) =>
        set((s) => {
          if (field === 'hr' && isAutomaticHeartRateRhythm(s.draft.rhythm)) return s

          const previousRhythm = s.draft.rhythm
          const nextRhythm = field === 'rhythm' ? (value as Rhythm) : previousRhythm
          const wasAutomatic = isAutomaticHeartRateRhythm(previousRhythm)
          const isAutomatic = isAutomaticHeartRateRhythm(nextRhythm)
          const wasToggleLocked = isHeartRateToggleLockedRhythm(previousRhythm)
          const isToggleLocked = isHeartRateToggleLockedRhythm(nextRhythm)
          let manualHrBeforeAuto = s.manualHrBeforeAuto
          let manualHrActiveBeforeLock = s.manualHrActiveBeforeLock
          let draftVitalActive = s.draftVitalActive
          const draft: Vitals = { ...s.draft, [field]: value }

          if (field === 'rhythm') {
            if (isAutomatic) {
              if (!wasAutomatic) manualHrBeforeAuto = s.draft.hr
              draft.hr = getAutomaticHeartRate(nextRhythm) ?? draft.hr
              draftVitalActive = { ...s.draftVitalActive, hr: true }
            } else if (wasAutomatic) {
              draft.hr = manualHrBeforeAuto ?? DEFAULT_VITALS.hr
              manualHrBeforeAuto = null
            }

            if (isToggleLocked) {
              if (!wasToggleLocked) manualHrActiveBeforeLock = s.draftVitalActive.hr
              draftVitalActive = { ...draftVitalActive, hr: true }
            } else if (wasToggleLocked) {
              draftVitalActive = {
                ...draftVitalActive,
                hr: manualHrActiveBeforeLock ?? s.draftVitalActive.hr,
              }
              manualHrActiveBeforeLock = null
            }
          }
          if (field === 'spo2') {
            draft.spo2_waveform = s.draftVitalActive.spo2 ? 'normal' : 'off'
          }
          if (field === 'etco2') {
            draft.etco2_waveform = s.draftVitalActive.etco2 ? 'normal' : 'off'
          }
          // Switching ECG off writes rhythm 'off' over the selection, so only a
          // real rhythm updates the memory.
          const lastRhythm =
            field === 'rhythm' && value !== 'off'
              ? normalizeActiveRhythm(value)
              : s.lastRhythm
          return {
            draft,
            draftVitalActive,
            draftVitalsActive: anyVitalActive(draftVitalActive),
            lastRhythm,
            manualHrBeforeAuto,
            manualHrActiveBeforeLock,
          }
        }),
      setTimedDraftVitals: (vitals) =>
        set((s) => {
          const draft: Vitals = { ...s.draft, ...vitals }
          const automaticHeartRate = getAutomaticHeartRate(s.draft.rhythm)
          if (automaticHeartRate !== null) draft.hr = automaticHeartRate
          if (vitals.spo2 !== undefined) {
            draft.spo2_waveform = s.draftVitalActive.spo2 ? 'normal' : 'off'
          }
          if (vitals.etco2 !== undefined) {
            draft.etco2_waveform = s.draftVitalActive.etco2 ? 'normal' : 'off'
          }
          return {
            draft,
            draftVitalsActive: anyVitalActive(s.draftVitalActive),
          }
        }),
      setDraftVitalValues: (vitals) =>
        set((s) => {
          const draft: Vitals = { ...s.draft, ...vitals }
          const automaticHeartRate = getAutomaticHeartRate(s.draft.rhythm)
          if (automaticHeartRate !== null) draft.hr = automaticHeartRate
          if (vitals.spo2 !== undefined) {
            draft.spo2_waveform = s.draftVitalActive.spo2 ? 'normal' : 'off'
          }
          if (vitals.etco2 !== undefined) {
            draft.etco2_waveform = s.draftVitalActive.etco2 ? 'normal' : 'off'
          }
          return {
            draft,
            draftVitalsActive: anyVitalActive(s.draftVitalActive),
          }
        }),
      setDraftVitalActive: (field, active) =>
        set((s) => {
          if (field === 'hr' && isHeartRateToggleLockedRhythm(s.draft.rhythm)) return s

          const draftVitalActive = { ...s.draftVitalActive, [field]: active }
          const draft = { ...s.draft }
          if (field === 'spo2') draft.spo2_waveform = active ? 'normal' : 'off'
          if (field === 'etco2') draft.etco2_waveform = active ? 'normal' : 'off'
          return {
            draft,
            draftVitalActive,
            draftVitalsActive: anyVitalActive(draftVitalActive),
          }
        }),
      setVitalTrendMinutes: (minutes) =>
        set((s) => {
          const normalized = Math.max(0, Math.floor(minutes) || 0)
          const seconds = s.vitalTrendDraft.durationSeconds % 60
          const durationSeconds = normalized * 60 + seconds
          if (durationSeconds === s.vitalTrendDraft.durationSeconds) return s
          return {
            vitalTrendDraft: { ...s.vitalTrendDraft, durationSeconds },
            vitalTrendDraftRevision: s.vitalTrendDraftRevision + 1,
            activeVitalTrend:
              s.activeVitalTrend?.status === 'running' ? s.activeVitalTrend : null,
          }
        }),
      setVitalTrendSeconds: (seconds) =>
        set((s) => {
          const normalized = Math.min(59, Math.max(0, Math.floor(seconds) || 0))
          const minutes = Math.floor(s.vitalTrendDraft.durationSeconds / 60)
          const durationSeconds = minutes * 60 + normalized
          if (durationSeconds === s.vitalTrendDraft.durationSeconds) return s
          return {
            vitalTrendDraft: { ...s.vitalTrendDraft, durationSeconds },
            vitalTrendDraftRevision: s.vitalTrendDraftRevision + 1,
            activeVitalTrend:
              s.activeVitalTrend?.status === 'running' ? s.activeVitalTrend : null,
          }
        }),
      setCallerInfoDraft: (field, value) =>
        set((s) => ({ callerInfoDraft: { ...s.callerInfoDraft, [field]: value } })),
      setDispatchRouteDraft: (route) =>
        set({ dispatchRouteDraft: normalizeDispatchRoute(route) }),
      applyDispatchRouteResolution: (route) =>
        set((s) => {
          const resolved = normalizeDispatchRoute(route)
          const originKey = normalizeDispatchAddress(resolved.originAddress)
          const destinationKey = normalizeDispatchAddress(resolved.destinationAddress)
          const matches = (candidate: DispatchRoute, destinationAddress: string) =>
            normalizeDispatchAddress(candidate.originAddress) === originKey &&
            normalizeDispatchAddress(destinationAddress) === destinationKey
          const result: Partial<MonitorState> = {}

          if (matches(s.dispatchRouteDraft, s.callerInfoDraft.address)) {
            result.dispatchRouteDraft = resolved
          }
          if (matches(s.dispatchRouteSaved, s.callerInfoSaved.address)) {
            result.dispatchRouteSaved = resolved
          }
          if (matches(s.dispatchRouteConfirmed, s.callerInfoConfirmed.address)) {
            result.dispatchRouteConfirmed = {
              ...resolved,
              startedAt: resolved.status === 'ready' ? s.dispatch.startedAt : null,
              durationSeconds:
                resolved.status === 'ready'
                  ? s.dispatchConfirmedSeconds
                  : resolved.durationSeconds,
            }
          }

          return result
        }),
      setPatientAge: (age) =>
        set((s) => ({ patientInfo: { ...s.patientInfo, age: clampAge(age) } })),
      setPatientSex: (sex) =>
        set((s) => ({ patientInfo: { ...s.patientInfo, sex } })),
      setDispatchMinutes: (minutes) =>
        set((s) =>
          s.dispatch.countdownLocked
            ? s
            : { dispatchMinutes: Math.max(0, Math.floor(minutes) || 0) },
        ),
      setDispatchSeconds: (seconds) =>
        set((s) =>
          s.dispatch.countdownLocked
            ? s
            : {
                dispatchSeconds: Math.min(59, Math.max(0, Math.floor(seconds) || 0)),
              },
        ),
      applyScenarioDraft: (snapshot) =>
        set((s) => {
          const legacyVitalTrend = normalizeVitalTrendConfiguration(snapshot.trend)
          const draft = normalizeVitals(
            projectLegacyVitalTrendTargets(
              snapshot.monitor.draft,
              legacyVitalTrend,
            ),
          )
          const draftVitalActive = normalizeVitalActive(
            snapshot.monitor.draftVitalActive,
            undefined,
          )
          const isAutomatic = isAutomaticHeartRateRhythm(draft.rhythm)
          const isToggleLocked = isHeartRateToggleLockedRhythm(draft.rhythm)
          const wasAutomatic = isAutomaticHeartRateRhythm(s.draft.rhythm)
          const wasToggleLocked = isHeartRateToggleLockedRhythm(s.draft.rhythm)
          if (isAutomatic) draftVitalActive.hr = true
          const originAddress = snapshot.dispatch.originAddress.trim() || JOHN_ABBOTT_ADDRESS
          const vitalTrendDraft = fusedVitalTrendConfiguration(legacyVitalTrend)

          return {
            defibrillatorModelDraft: normalizeDefibrillatorModel(
              snapshot.defibrillatorModel,
            ),
            draft,
            draftVitalActive,
            draftVitalsActive: anyVitalActive(draftVitalActive),
            lastRhythm: normalizeActiveRhythm(snapshot.monitor.lastRhythm),
            manualHrBeforeAuto: isAutomatic
              ? wasAutomatic
                ? (s.manualHrBeforeAuto ?? s.draft.hr)
                : s.draft.hr
              : null,
            manualHrActiveBeforeLock: isToggleLocked
              ? wasToggleLocked
                ? (s.manualHrActiveBeforeLock ?? s.draftVitalActive.hr)
                : s.draftVitalActive.hr
              : null,
            callerInfoDraft: normalizeCallerInfo(snapshot.callerInfo),
            dispatchMinutes: s.dispatch.countdownLocked
              ? s.dispatchMinutes
              : Math.max(0, Math.floor(snapshot.dispatch.minutes) || 0),
            dispatchSeconds: s.dispatch.countdownLocked
              ? s.dispatchSeconds
              : Math.min(
                  59,
                  Math.max(0, Math.floor(snapshot.dispatch.seconds) || 0),
                ),
            dispatchRouteDraft: {
              ...DEFAULT_DISPATCH_ROUTE,
              originAddress,
              origin:
                originAddress === JOHN_ABBOTT_ADDRESS
                  ? JOHN_ABBOTT_COORDINATES
                  : null,
              destinationAddress: snapshot.callerInfo.address,
            },
            vitalTrendDraft,
            vitalTrendDraftRevision: s.vitalTrendDraftRevision + 1,
            activeVitalTrend:
              s.activeVitalTrend?.status === 'running' ? s.activeVitalTrend : null,
          }
        }),
      acknowledgeCall: (stamp) =>
        set((s) => {
          if (s.dispatch.acknowledgedAt) return s
          const entry = buildEventLogEntry(`Call - ${CALLER_EVENT_LABELS.acknowledge}`, stamp)
          return {
            dispatch: {
              ...s.dispatch,
              acknowledgedAt: entry.time,
              callerEvents: [
                ...s.dispatch.callerEvents,
                entry,
              ],
            },
          }
        }),
      arriveCall: (stamp) =>
        set((s) => {
          if (s.dispatch.arrivedAt) return s
          const entry = buildEventLogEntry(`Call - ${CALLER_EVENT_LABELS.arrival}`, stamp)
          return {
            dispatch: {
              ...s.dispatch,
              arrivedAt: entry.time,
              callerEvents: [
                ...s.dispatch.callerEvents,
                entry,
              ],
            },
          }
        }),
      transportCall: (stamp) =>
        set((s) => {
          if (s.dispatch.transportedAt) return s
          const entry = buildEventLogEntry(`Call - ${CALLER_EVENT_LABELS.transport}`, stamp)
          return {
            dispatch: {
              ...s.dispatch,
              transportedAt: entry.time,
              callerEvents: [
                ...s.dispatch.callerEvents,
                entry,
              ],
            },
          }
        }),
      startEtco2Calibration: () =>
        set((s) =>
          s.etco2CalibrationStatus === 'calibrated'
            ? s
            : { etco2CalibrationStatus: 'calibrating' },
        ),
      cancelEtco2Calibration: () =>
        set((s) =>
          s.etco2CalibrationStatus === 'calibrating'
            ? { etco2CalibrationStatus: 'idle' }
            : s,
        ),
      completeEtco2Calibration: () =>
        set((s) =>
          s.etco2CalibrationStatus === 'calibrating'
            ? { etco2CalibrationStatus: 'calibrated' }
            : s,
        ),
      setCprMode: (mode) =>
        set({ cprMode: normalizeCprMode(mode) }),
      acceptBpReading: (bp, active) =>
        set({
          acceptedBp: { bp_sys: bp.bp_sys, bp_dia: bp.bp_dia },
          acceptedBpActive: { bp_sys: active.bp_sys, bp_dia: active.bp_dia },
        }),
      advanceVitalTrend: (now = Date.now()) =>
        set((s) => {
          const trend = s.activeVitalTrend
          if (!trend || trend.status !== 'running') return s
          const values = deriveVitalTrendValues(trend, now)
          const confirmed = { ...s.confirmed, ...values }
          if (now < trend.endsAt) {
            const changed = VITAL_TREND_FIELDS.some(
              (field) => values[field] !== undefined && values[field] !== s.confirmed[field],
            )
            return changed ? { confirmed } : s
          }

          const disarmedRevision =
            Math.max(
              s.vitalTrendDraftRevision,
              s.vitalTrendSavedRevision,
              s.vitalTrendConsumedRevision,
            ) + 1
          const disarmedTrend = createEmptyVitalTrendConfiguration()
          return {
            confirmed,
            vitalTrendDraft: disarmedTrend,
            vitalTrendSaved: createEmptyVitalTrendConfiguration(),
            vitalTrendDraftRevision: disarmedRevision,
            vitalTrendSavedRevision: disarmedRevision,
            vitalTrendConsumedRevision: disarmedRevision,
            activeVitalTrend: {
              ...trend,
              status: 'complete',
              completedAt: trend.endsAt,
              completionPublished: false,
            },
          }
        }),
      markVitalTrendCompletionPublished: (id, published = true) =>
        set((s) =>
          s.activeVitalTrend?.id === id &&
          s.activeVitalTrend.status === 'complete' &&
          s.activeVitalTrend.completionPublished !== published
            ? {
                activeVitalTrend: {
                  ...s.activeVitalTrend,
                  completionPublished: published,
                },
              }
            : s,
        ),
      resetMonitorVitals: () =>
        set((s) => ({
          draft: initial,
          saved: initial,
          confirmed: initial,
          confirmedAuthored: initial,
          draftVitalsActive: false,
          savedVitalsActive: false,
          confirmedVitalsActive: false,
          draftVitalActive: inactiveVitals,
          savedVitalActive: inactiveVitals,
          confirmedVitalActive: inactiveVitals,
          manualHrBeforeAuto: null,
          manualHrActiveBeforeLock: null,
          monitorResetVersion: s.monitorResetVersion + 1,
          etco2CalibrationStatus: 'idle',
          cprMode: 'off',
          acceptedBp: initialBpDisplay,
          acceptedBpActive: inactiveBpActive,
          vitalTrendDraft: createEmptyVitalTrendConfiguration(),
          vitalTrendSaved: createEmptyVitalTrendConfiguration(),
          vitalTrendDraftRevision: s.vitalTrendDraftRevision + 1,
          vitalTrendSavedRevision: s.vitalTrendDraftRevision + 1,
          vitalTrendConsumedRevision: s.vitalTrendDraftRevision + 1,
          activeVitalTrend: null,
        })),
      resetVitalsToNormal: () =>
        set((s) => {
          const automaticHeartRate = getAutomaticHeartRate(s.draft.rhythm)
          return {
            draft: {
              ...s.draft,
              hr: automaticHeartRate ?? DEFAULT_VITALS.hr,
              bp_sys: DEFAULT_VITALS.bp_sys,
              bp_dia: DEFAULT_VITALS.bp_dia,
              etco2: DEFAULT_VITALS.etco2,
              spo2: DEFAULT_VITALS.spo2,
              etco2_waveform: 'normal',
              spo2_waveform: 'normal',
            },
            draftVitalActive: activeVitals,
            draftVitalsActive: true,
          }
        }),
      save: () =>
        set((s) =>
          !isValidVitalTrendConfiguration(s.vitalTrendDraft) ||
          !isValidFusedVitalValues(s.draft)
            ? s
            : {
                defibrillatorModelSaved: s.defibrillatorModelDraft,
                saved: { ...s.draft },
                savedVitalActive: { ...s.draftVitalActive },
                savedVitalsActive: anyVitalActive(s.draftVitalActive),
                callerInfoSaved: { ...s.callerInfoDraft },
                dispatchRouteSaved: { ...s.dispatchRouteDraft },
                dispatchSavedSeconds: s.dispatch.countdownLocked
                  ? s.dispatchConfirmedSeconds
                  : dispatchCountdownSeconds(s.dispatchMinutes, s.dispatchSeconds),
                vitalTrendSaved: fusedVitalTrendConfiguration(s.vitalTrendDraft),
                vitalTrendSavedRevision: s.vitalTrendDraftRevision,
              },
        ),
      // Start is the immutable countdown boundary. Send only stages the call;
      // the response timer and route movement begin when the room opens.
      startDispatchClock: () =>
        set((s) => {
          if (!s.dispatch.armed || s.dispatch.countdownLocked) return s
          const now = Date.now()
          const lockedMinutes = Math.floor(s.dispatchConfirmedSeconds / 60)
          const lockedSeconds = s.dispatchConfirmedSeconds % 60
          return {
            dispatchMinutes: lockedMinutes,
            dispatchSeconds: lockedSeconds,
            dispatchSavedSeconds: s.dispatchConfirmedSeconds,
            dispatchRouteConfirmed: {
              ...s.dispatchRouteConfirmed,
              startedAt: s.dispatchRouteConfirmed.status === 'ready' ? now : null,
              durationSeconds:
                s.dispatchRouteConfirmed.status === 'ready'
                  ? s.dispatchConfirmedSeconds
                  : s.dispatchRouteConfirmed.durationSeconds,
            },
            dispatch: {
              ...s.dispatch,
              countdownLocked: true,
              startedAt: now,
              countdownEndsAt: now + s.dispatchConfirmedSeconds * 1000,
              // Nobody has been able to act yet; this is the start of the run.
              acknowledgedAt: null,
              arrivedAt: null,
            },
          }
        }),
      send: () =>
        set((s) => {
          const now = Date.now()
          const currentConfirmed: Vitals = {
            ...s.confirmed,
            ...(s.activeVitalTrend?.status === 'running'
              ? deriveVitalTrendValues(s.activeVitalTrend, now)
              : {}),
          }
          const rhythmChanged = s.saved.rhythm !== s.confirmedAuthored.rhythm
          const automaticHeartRateTransition =
            rhythmChanged &&
            (isAutomaticHeartRateRhythm(s.saved.rhythm) ||
              isAutomaticHeartRateRhythm(s.confirmedAuthored.rhythm))
          const nextRhythmOwnsHeartRate = isAutomaticHeartRateRhythm(s.saved.rhythm)
          const changedFusedVitalFields = VITAL_TREND_FIELDS.filter(
            (field) =>
              s.saved[field] !== s.confirmedAuthored[field] &&
              !(field === 'hr' && automaticHeartRateTransition),
          )
          const hasNewTimerCommand =
            s.vitalTrendSavedRevision !== s.vitalTrendConsumedRevision
          const hasNewFusedVitalCommand =
            changedFusedVitalFields.length > 0 || hasNewTimerCommand
          const sendsImmediately =
            hasNewFusedVitalCommand && s.vitalTrendSaved.durationSeconds === 0
          const directVitalFields = new Set<NumericVitalField>()
          if (sendsImmediately) {
            for (const field of VITAL_TREND_FIELDS) directVitalFields.add(field)
          }
          if (automaticHeartRateTransition || nextRhythmOwnsHeartRate) {
            directVitalFields.add('hr')
          }

          let confirmed: Vitals = {
            ...currentConfirmed,
            rhythm: s.saved.rhythm,
            spo2_waveform: s.saved.spo2_waveform,
            etco2_waveform: s.saved.etco2_waveform,
          }
          for (const field of directVitalFields) confirmed[field] = s.saved[field]
          confirmed = normalizeVitals(confirmed)

          const confirmedAuthored: Vitals = {
            ...s.confirmedAuthored,
            rhythm: s.saved.rhythm,
            spo2_waveform: s.saved.spo2_waveform,
            etco2_waveform: s.saved.etco2_waveform,
          }
          let manualHrBeforeAuto = s.manualHrBeforeAuto
          if (
            nextRhythmOwnsHeartRate &&
            s.activeVitalTrend?.status === 'running' &&
            s.activeVitalTrend.participants.hr
          ) {
            manualHrBeforeAuto = currentConfirmed.hr
          }
          for (const field of directVitalFields) confirmedAuthored[field] = confirmed[field]

          let activeVitalTrend = s.activeVitalTrend
          let vitalTrendDraft = s.vitalTrendDraft
          let vitalTrendSaved = s.vitalTrendSaved
          let vitalTrendDraftRevision = s.vitalTrendDraftRevision
          let vitalTrendSavedRevision = s.vitalTrendSavedRevision
          let vitalTrendConsumedRevision = hasNewTimerCommand
            ? s.vitalTrendSavedRevision
            : s.vitalTrendConsumedRevision

          if (hasNewFusedVitalCommand) {
            for (const field of VITAL_TREND_FIELDS) {
              confirmedAuthored[field] =
                field === 'hr' && nextRhythmOwnsHeartRate
                  ? confirmed.hr
                  : s.saved[field]
            }

            if (sendsImmediately) {
              activeVitalTrend = {
                id: nanoid(),
                participants: {},
                startsAt: now,
                endsAt: now,
                status: 'immediate',
                completedAt: now,
                completionPublished: true,
              }
            } else {
              const excluded = nextRhythmOwnsHeartRate
                ? new Set<NumericVitalField>(['hr'])
                : new Set<NumericVitalField>()
              const participants = buildVitalTrendParticipants(
                vitalTrendTargetsFromValues(s.saved),
                {
                  hr: currentConfirmed.hr,
                  spo2: currentConfirmed.spo2,
                  bp_sys: currentConfirmed.bp_sys,
                  bp_dia: currentConfirmed.bp_dia,
                  etco2: currentConfirmed.etco2,
                },
                excluded,
              )
              if (Object.keys(participants).length > 0) {
                activeVitalTrend = {
                  id: nanoid(),
                  participants,
                  startsAt: now,
                  endsAt: now + s.vitalTrendSaved.durationSeconds * 1000,
                  status: 'running',
                  completedAt: null,
                  completionPublished: false,
                }
              } else {
                const disarmedRevision =
                  Math.max(
                    s.vitalTrendDraftRevision,
                    s.vitalTrendSavedRevision,
                    s.vitalTrendConsumedRevision,
                  ) + 1
                activeVitalTrend = null
                vitalTrendDraft = createEmptyVitalTrendConfiguration()
                vitalTrendSaved = createEmptyVitalTrendConfiguration()
                vitalTrendDraftRevision = disarmedRevision
                vitalTrendSavedRevision = disarmedRevision
                vitalTrendConsumedRevision = disarmedRevision
              }
            }
          } else if (
            s.activeVitalTrend?.status === 'running' &&
            (automaticHeartRateTransition || nextRhythmOwnsHeartRate)
          ) {
            const participants = { ...s.activeVitalTrend.participants }
            delete participants.hr
            const remaining = Object.keys(participants).length
            activeVitalTrend =
              remaining > 0
                ? { ...s.activeVitalTrend, participants }
                : {
                    ...s.activeVitalTrend,
                    participants: {},
                    status: 'cancelled',
                    completedAt: now,
                    completionPublished: true,
                  }
          }

          // Before Start, a changed countdown or Incident scene restages the
          // pending run. Once Start locks the timer, every later Send is a
          // same-run content/route update.
          const countdownChanged = s.dispatchSavedSeconds !== s.dispatchConfirmedSeconds
          const incidentChanged =
            normalizeDispatchAddress(s.callerInfoSaved.address) !==
            normalizeDispatchAddress(s.callerInfoConfirmed.address)
          const redispatch =
            !s.dispatch.armed ||
            (!s.dispatch.countdownLocked && (countdownChanged || incidentChanged))

          const dispatchDurationSeconds = s.dispatch.countdownLocked
            ? s.dispatchConfirmedSeconds
            : s.dispatchSavedSeconds
          const routeReady = s.dispatchRouteSaved.status === 'ready'
          const routeStartedAt = s.dispatch.countdownLocked
            ? s.dispatch.startedAt
            : null
          const dispatchRouteConfirmed: DispatchRoute = {
            ...s.dispatchRouteSaved,
            startedAt: routeReady ? routeStartedAt : s.dispatchRouteSaved.startedAt,
            durationSeconds: routeReady
              ? dispatchDurationSeconds
              : s.dispatchRouteSaved.durationSeconds,
          }
          const base = {
            defibrillatorModelConfirmed: s.defibrillatorModelSaved,
            confirmed,
            confirmedAuthored,
            manualHrBeforeAuto,
            draft: s.draft,
            saved: s.saved,
            confirmedVitalActive: { ...s.savedVitalActive },
            confirmedVitalsActive: anyVitalActive(s.savedVitalActive),
            callerInfoConfirmed: { ...s.callerInfoSaved },
            dispatchRouteConfirmed,
            dispatchConfirmedSeconds: dispatchDurationSeconds,
            activeVitalTrend,
            vitalTrendDraft,
            vitalTrendSaved,
            vitalTrendDraftRevision,
            vitalTrendSavedRevision,
            vitalTrendConsumedRevision,
            ...(s.dispatch.countdownLocked
              ? {
                  dispatchMinutes: Math.floor(dispatchDurationSeconds / 60),
                  dispatchSeconds: dispatchDurationSeconds % 60,
                  dispatchSavedSeconds: dispatchDurationSeconds,
                }
              : {}),
          }
          // Same-run Sends push updated content while preserving the gate,
          // absolute clock, run identity, and trainee milestones.
          if (!redispatch) return base

          return {
            ...base,
            dispatch: {
              ...s.dispatch,
              runId: nanoid(),
              armed: true,
              countdownLocked: false,
              startedAt: null,
              countdownEndsAt: null,
              acknowledgedAt: null,
              arrivedAt: null,
              transportedAt: null,
            },
          }
        }),
      getSharedState: (): SharedMonitorState => {
        const s = get()
        const confirmed = {
          ...s.confirmed,
          ...(s.activeVitalTrend?.status === 'running'
            ? deriveVitalTrendValues(s.activeVitalTrend, Date.now())
            : {}),
        }
        return {
          defibrillatorModelConfirmed: s.defibrillatorModelConfirmed,
          confirmed,
          confirmedVitalActive: { ...s.confirmedVitalActive },
          callerInfoConfirmed: { ...s.callerInfoConfirmed },
          dispatchRouteConfirmed: { ...s.dispatchRouteConfirmed },
          dispatch: {
            ...s.dispatch,
            callerEvents: [...s.dispatch.callerEvents],
          },
          dispatchConfirmedSeconds: s.dispatchConfirmedSeconds,
          cprMode: s.cprMode,
          cprOverrideActive: s.cprMode !== 'off',
          monitorResetVersion: s.monitorResetVersion,
          activeVitalTrend: s.activeVitalTrend
            ? {
                ...s.activeVitalTrend,
                participants: { ...s.activeVitalTrend.participants },
              }
            : null,
        }
      },
      applySharedState: (shared) =>
        set((s) => {
          const activeVitalTrend = normalizeActiveVitalTrend(shared.activeVitalTrend)
          const confirmed = normalizeVitals({
            ...shared.confirmed,
            ...(activeVitalTrend?.status === 'running'
              ? deriveVitalTrendValues(activeVitalTrend, Date.now())
              : {}),
          })
          const confirmedVitalActive = normalizeVitalActive(
            shared.confirmedVitalActive,
            undefined,
          )
          if (isHeartRateToggleLockedRhythm(confirmed.rhythm)) confirmedVitalActive.hr = true

          // Dispatch timing/content is instructor-authoritative, but the gate
          // progress belongs to this trainee. Same run keeps their progress; a
          // new armed run clears Ack/Arrival; a disarmed gate is a full drill
          // reset. Same-run content and route updates preserve local progress.
          const incoming = normalizeDispatch(
            shared.dispatch,
            s.dispatchConfirmedSeconds * 1000,
          )
          const incomingRoute = normalizeDispatchRoute(shared.dispatchRouteConfirmed)
          let dispatch: DispatchState
          if (incoming.runId === s.dispatch.runId) {
            dispatch = {
              ...incoming,
              acknowledgedAt: s.dispatch.acknowledgedAt,
              arrivedAt: s.dispatch.arrivedAt,
              transportedAt: s.dispatch.transportedAt,
              callerEvents: s.dispatch.callerEvents,
            }
          } else if (incoming.armed) {
            dispatch = {
              ...incoming,
              acknowledgedAt: null,
              arrivedAt: null,
              transportedAt: null,
              callerEvents: s.dispatch.callerEvents,
            }
          } else {
            dispatch = { ...DEFAULT_DISPATCH }
          }

          // An instructor reset clears the trainee-local reading/calibration
          // layers; otherwise those stay untouched by shared snapshots.
          const sharedResetVersion =
            typeof shared.monitorResetVersion === 'number'
              ? shared.monitorResetVersion
              : null
          const resetSideEffects =
            sharedResetVersion !== null && sharedResetVersion !== s.monitorResetVersion
              ? {
                  monitorResetVersion: sharedResetVersion,
                  etco2CalibrationStatus: 'idle' as Etco2CalibrationStatus,
                  acceptedBp: initialBpDisplay,
                  acceptedBpActive: inactiveBpActive,
                }
              : {}

          return {
            defibrillatorModelConfirmed: normalizeDefibrillatorModel(
              shared.defibrillatorModelConfirmed,
            ),
            confirmed,
            confirmedAuthored: confirmed,
            confirmedVitalActive,
            confirmedVitalsActive: anyVitalActive(confirmedVitalActive),
            callerInfoConfirmed: normalizeCallerInfo(shared.callerInfoConfirmed),
            dispatchRouteConfirmed: incomingRoute,
            dispatch,
            dispatchConfirmedSeconds:
              typeof shared.dispatchConfirmedSeconds === 'number'
                ? shared.dispatchConfirmedSeconds
                : s.dispatchConfirmedSeconds,
            cprMode: normalizeCprMode(shared.cprMode, shared.cprOverrideActive),
            activeVitalTrend,
            ...resetSideEffects,
          }
        }),
      resetForNewAttempt: () =>
        set((s) => {
          const model = normalizeDefibrillatorModel(s.defibrillatorModelConfirmed)
          return {
            defibrillatorModelDraft: model,
            defibrillatorModelSaved: model,
            defibrillatorModelConfirmed: model,
            draft: initial,
            saved: initial,
            confirmed: initial,
            confirmedAuthored: initial,
            draftVitalsActive: false,
            savedVitalsActive: false,
            confirmedVitalsActive: false,
            draftVitalActive: inactiveVitals,
            savedVitalActive: inactiveVitals,
            confirmedVitalActive: inactiveVitals,
            lastRhythm: DEFAULT_ACTIVE_RHYTHM,
            manualHrBeforeAuto: null,
            manualHrActiveBeforeLock: null,
            callerInfoDraft: DEFAULT_CALLER_INFO,
            callerInfoSaved: DEFAULT_CALLER_INFO,
            callerInfoConfirmed: DEFAULT_CALLER_INFO,
            dispatchRouteDraft: DEFAULT_DISPATCH_ROUTE,
            dispatchRouteSaved: DEFAULT_DISPATCH_ROUTE,
            dispatchRouteConfirmed: DEFAULT_DISPATCH_ROUTE,
            patientInfo: DEFAULT_PATIENT_INFO,
            dispatch: DEFAULT_DISPATCH,
            dispatchMinutes: 0,
            dispatchSeconds: 0,
            dispatchSavedSeconds: 0,
            dispatchConfirmedSeconds: 0,
            monitorResetVersion: s.monitorResetVersion + 1,
            etco2CalibrationStatus: 'idle' as Etco2CalibrationStatus,
            cprMode: 'off' as CprMode,
            acceptedBp: initialBpDisplay,
            acceptedBpActive: inactiveBpActive,
            vitalTrendDraft: createEmptyVitalTrendConfiguration(),
            vitalTrendSaved: createEmptyVitalTrendConfiguration(),
            vitalTrendDraftRevision: 0,
            vitalTrendSavedRevision: 0,
            vitalTrendConsumedRevision: 0,
            activeVitalTrend: null,
          }
        }),
      reset: () =>
        set((s) => ({
          defibrillatorModelDraft: DEFAULT_DEFIBRILLATOR_MODEL,
          defibrillatorModelSaved: DEFAULT_DEFIBRILLATOR_MODEL,
          defibrillatorModelConfirmed: DEFAULT_DEFIBRILLATOR_MODEL,
          draft: initial,
          saved: initial,
          confirmed: initial,
          confirmedAuthored: initial,
          draftVitalsActive: false,
          savedVitalsActive: false,
          confirmedVitalsActive: false,
          draftVitalActive: inactiveVitals,
          savedVitalActive: inactiveVitals,
          confirmedVitalActive: inactiveVitals,
          lastRhythm: DEFAULT_ACTIVE_RHYTHM,
          manualHrBeforeAuto: null,
          manualHrActiveBeforeLock: null,
          callerInfoDraft: DEFAULT_CALLER_INFO,
          callerInfoSaved: DEFAULT_CALLER_INFO,
          callerInfoConfirmed: DEFAULT_CALLER_INFO,
          dispatchRouteDraft: DEFAULT_DISPATCH_ROUTE,
          dispatchRouteSaved: DEFAULT_DISPATCH_ROUTE,
          dispatchRouteConfirmed: DEFAULT_DISPATCH_ROUTE,
          patientInfo: DEFAULT_PATIENT_INFO,
          dispatch: DEFAULT_DISPATCH,
          dispatchMinutes: 0,
          dispatchSeconds: 0,
          dispatchSavedSeconds: 0,
          dispatchConfirmedSeconds: 0,
          monitorResetVersion: s.monitorResetVersion + 1,
          etco2CalibrationStatus: 'idle',
          cprMode: 'off',
          acceptedBp: initialBpDisplay,
          acceptedBpActive: inactiveBpActive,
          vitalTrendDraft: createEmptyVitalTrendConfiguration(),
          vitalTrendSaved: createEmptyVitalTrendConfiguration(),
          vitalTrendDraftRevision: 0,
          vitalTrendSavedRevision: 0,
          vitalTrendConsumedRevision: 0,
          activeVitalTrend: null,
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 14,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // A migrate fn must exist for older persisted versions, otherwise persist
      // logs "couldn't be migrated" (surfaced as a Next dev error overlay).
      // Passthrough is enough — `merge` below fills/normalizes new fields.
      migrate: (persistedState) => persistedState as MonitorState,
      merge: (persisted, current) => {
        const persistedState = persisted as
          | (Partial<MonitorState> & { cprOverrideActive?: unknown })
          | undefined
        const {
          cprOverrideActive: legacyCprOverrideActive,
          ...persistedWithoutLegacyCpr
        } = persistedState ?? {}
        const legacyVitalTrendDraft = normalizeVitalTrendConfiguration(
          persistedState?.vitalTrendDraft,
        )
        const legacyVitalTrendSaved = normalizeVitalTrendConfiguration(
          persistedState?.vitalTrendSaved ?? persistedState?.vitalTrendDraft,
        )
        const draft = normalizeVitals(
          projectLegacyVitalTrendTargets(
            normalizeVitals(persistedState?.draft),
            legacyVitalTrendDraft,
          ),
        )
        const saved = normalizeVitals(
          projectLegacyVitalTrendTargets(
            normalizeVitals(persistedState?.saved),
            legacyVitalTrendSaved,
          ),
        )
        const draftVitalActive = normalizeVitalActive(
          persistedState?.draftVitalActive,
          persistedState?.draftVitalsActive,
        )
        const savedVitalActive = normalizeVitalActive(
          persistedState?.savedVitalActive,
          persistedState?.savedVitalsActive,
        )
        const confirmedVitalActive = normalizeVitalActive(
          persistedState?.confirmedVitalActive,
          persistedState?.confirmedVitalsActive,
        )
        const confirmed = normalizeVitals(persistedState?.confirmed)
        let confirmedAuthored = normalizeVitals(
          persistedState?.confirmedAuthored ?? persistedState?.confirmed,
        )
        let vitalTrendDraft = fusedVitalTrendConfiguration(legacyVitalTrendDraft)
        let vitalTrendSaved = fusedVitalTrendConfiguration(legacyVitalTrendSaved)
        let vitalTrendDraftRevision =
          typeof persistedState?.vitalTrendDraftRevision === 'number'
            ? persistedState.vitalTrendDraftRevision
            : 0
        let vitalTrendSavedRevision =
          typeof persistedState?.vitalTrendSavedRevision === 'number'
            ? persistedState.vitalTrendSavedRevision
            : 0
        let vitalTrendConsumedRevision =
          typeof persistedState?.vitalTrendConsumedRevision === 'number'
            ? persistedState.vitalTrendConsumedRevision
            : 0
        if (vitalTrendSavedRevision === vitalTrendConsumedRevision) {
          confirmedAuthored = normalizeVitals(
            projectLegacyVitalTrendTargets(
              confirmedAuthored,
              legacyVitalTrendSaved,
            ),
          )
        }
        const activeVitalTrend = normalizeActiveVitalTrend(
          persistedState?.activeVitalTrend,
        )
        if (activeVitalTrend?.status === 'complete') {
          const disarmedRevision =
            Math.max(
              vitalTrendDraftRevision,
              vitalTrendSavedRevision,
              vitalTrendConsumedRevision,
            ) + 1
          vitalTrendDraft = createEmptyVitalTrendConfiguration()
          vitalTrendSaved = createEmptyVitalTrendConfiguration()
          vitalTrendDraftRevision = disarmedRevision
          vitalTrendSavedRevision = disarmedRevision
          vitalTrendConsumedRevision = disarmedRevision
        }
        if (isHeartRateToggleLockedRhythm(draft.rhythm)) draftVitalActive.hr = true
        if (isHeartRateToggleLockedRhythm(saved.rhythm)) savedVitalActive.hr = true
        if (isHeartRateToggleLockedRhythm(confirmed.rhythm)) confirmedVitalActive.hr = true
        const dispatchMinutes =
          typeof persistedState?.dispatchMinutes === 'number'
            ? persistedState.dispatchMinutes
            : 0
        const dispatchSeconds =
          typeof persistedState?.dispatchSeconds === 'number'
            ? persistedState.dispatchSeconds
            : 0
        const dispatchSavedSeconds =
          typeof persistedState?.dispatchSavedSeconds === 'number'
            ? persistedState.dispatchSavedSeconds
            : dispatchCountdownSeconds(dispatchMinutes, dispatchSeconds)
        const dispatchConfirmedSeconds =
          typeof persistedState?.dispatchConfirmedSeconds === 'number'
            ? persistedState.dispatchConfirmedSeconds
            : dispatchSavedSeconds

        return {
          ...current,
          ...persistedWithoutLegacyCpr,
          defibrillatorModelDraft: normalizeDefibrillatorModel(
            persistedState?.defibrillatorModelDraft,
          ),
          defibrillatorModelSaved: normalizeDefibrillatorModel(
            persistedState?.defibrillatorModelSaved,
          ),
          defibrillatorModelConfirmed: normalizeDefibrillatorModel(
            persistedState?.defibrillatorModelConfirmed,
          ),
          draft,
          saved,
          confirmed,
          confirmedAuthored,
          draftVitalActive,
          savedVitalActive,
          confirmedVitalActive,
          draftVitalsActive: anyVitalActive(draftVitalActive),
          savedVitalsActive: anyVitalActive(savedVitalActive),
          confirmedVitalsActive: anyVitalActive(confirmedVitalActive),
          lastRhythm: normalizeActiveRhythm(persistedState?.lastRhythm),
          manualHrBeforeAuto:
            isAutomaticHeartRateRhythm(draft.rhythm) &&
            typeof persistedState?.manualHrBeforeAuto === 'number'
              ? persistedState.manualHrBeforeAuto
              : null,
          manualHrActiveBeforeLock:
            isHeartRateToggleLockedRhythm(draft.rhythm) &&
            typeof persistedState?.manualHrActiveBeforeLock === 'boolean'
              ? persistedState.manualHrActiveBeforeLock
              : null,
          callerInfoDraft: normalizeCallerInfo(persistedState?.callerInfoDraft),
          callerInfoSaved: normalizeCallerInfo(persistedState?.callerInfoSaved),
          callerInfoConfirmed: normalizeCallerInfo(persistedState?.callerInfoConfirmed),
          dispatchRouteDraft: normalizeDispatchRoute(persistedState?.dispatchRouteDraft),
          dispatchRouteSaved: normalizeDispatchRoute(persistedState?.dispatchRouteSaved),
          dispatchRouteConfirmed: normalizeDispatchRoute(
            persistedState?.dispatchRouteConfirmed,
          ),
          patientInfo: {
            ...DEFAULT_PATIENT_INFO,
            ...persistedState?.patientInfo,
          },
          dispatch: normalizeDispatch(
            persistedState?.dispatch,
            (dispatchMinutes * 60 + dispatchSeconds) * 1000,
          ),
          dispatchMinutes,
          dispatchSeconds,
          dispatchSavedSeconds,
          dispatchConfirmedSeconds,
          monitorResetVersion:
            typeof persistedState?.monitorResetVersion === 'number'
              ? persistedState.monitorResetVersion
              : 0,
          etco2CalibrationStatus:
            persistedState?.etco2CalibrationStatus === 'calibrating' ||
            persistedState?.etco2CalibrationStatus === 'calibrated'
              ? persistedState.etco2CalibrationStatus
              : 'idle',
          cprMode: normalizeCprMode(
            persistedState?.cprMode,
            legacyCprOverrideActive,
          ),
          acceptedBp: normalizeBpDisplay(persistedState?.acceptedBp, confirmed),
          acceptedBpActive: normalizeBpActive(
            persistedState?.acceptedBpActive,
            confirmedVitalActive,
          ),
          vitalTrendDraft,
          vitalTrendSaved,
          vitalTrendDraftRevision,
          vitalTrendSavedRevision,
          vitalTrendConsumedRevision,
          activeVitalTrend,
        }
      },
    },
  ),
)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      void useMonitorStore.persist.rehydrate()
    }
  })
}
