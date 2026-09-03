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
import { dispatchCountdownSeconds } from '@/store/fieldState'
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

// Dispatch / startup-gate state. The admin "Send" arms this (lock + countdown);
// the trainee must Acknowledge, wait out the countdown, then mark Arrival before
// the monitor power button works. Persisted so a refresh resumes the drill.
export type DispatchState = {
  runId: string
  armed: boolean
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
  const startedAt = typeof dispatch?.startedAt === 'number' ? dispatch.startedAt : null
  const countdownEndsAt =
    typeof dispatch?.countdownEndsAt === 'number' ? dispatch.countdownEndsAt : null
  const legacyStartedAt =
    countdownEndsAt !== null ? countdownEndsAt - fallbackDurationMs : Date.now()

  return {
    runId: runId || (armed ? `legacy-${countdownEndsAt ?? 'active'}` : ''),
    armed,
    startedAt: startedAt ?? (armed ? legacyStartedAt : null),
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
  draftVitalsActive: boolean
  savedVitalsActive: boolean
  confirmedVitalsActive: boolean
  draftVitalActive: VitalActiveState
  savedVitalActive: VitalActiveState
  confirmedVitalActive: VitalActiveState
  /** Last rhythm chosen while ECG was on; restored when it is switched back on. */
  lastRhythm: ActiveRhythm
  /** Runtime-only FC restored after leaving an automatic rhythm; hydration/scenario loading clears it. */
  manualHrBeforeAuto: number | null
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
  setDraft: <K extends keyof Vitals>(field: K, value: Vitals[K]) => void
  setDefibrillatorModelDraft: (model: DefibrillatorModel) => void
  setTimedDraftVitals: (vitals: TimedDraftVitals) => void
  setDraftVitalValues: (vitals: DraftVitalValues) => void
  setDraftVitalActive: (field: NumericVitalField, active: boolean) => void
  setCallerInfoDraft: (field: CallerInfoField, value: string) => void
  setDispatchRouteDraft: (route: DispatchRoute) => void
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
      draftVitalsActive: false,
      savedVitalsActive: false,
      confirmedVitalsActive: false,
      draftVitalActive: inactiveVitals,
      savedVitalActive: inactiveVitals,
      confirmedVitalActive: inactiveVitals,
      lastRhythm: DEFAULT_ACTIVE_RHYTHM,
      manualHrBeforeAuto: null,
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
      setDefibrillatorModelDraft: (model) =>
        set({ defibrillatorModelDraft: normalizeDefibrillatorModel(model) }),
      setDraft: (field, value) =>
        set((s) => {
          if (field === 'hr' && isAutomaticHeartRateRhythm(s.draft.rhythm)) return s

          const previousRhythm = s.draft.rhythm
          const nextRhythm = field === 'rhythm' ? (value as Rhythm) : previousRhythm
          const wasAutomatic = isAutomaticHeartRateRhythm(previousRhythm)
          const isAutomatic = isAutomaticHeartRateRhythm(nextRhythm)
          let manualHrBeforeAuto = s.manualHrBeforeAuto
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
      setCallerInfoDraft: (field, value) =>
        set((s) => ({ callerInfoDraft: { ...s.callerInfoDraft, [field]: value } })),
      setDispatchRouteDraft: (route) =>
        set({ dispatchRouteDraft: normalizeDispatchRoute(route) }),
      setPatientAge: (age) =>
        set((s) => ({ patientInfo: { ...s.patientInfo, age: clampAge(age) } })),
      setPatientSex: (sex) =>
        set((s) => ({ patientInfo: { ...s.patientInfo, sex } })),
      setDispatchMinutes: (minutes) =>
        set({ dispatchMinutes: Math.max(0, Math.floor(minutes) || 0) }),
      setDispatchSeconds: (seconds) =>
        set({ dispatchSeconds: Math.min(59, Math.max(0, Math.floor(seconds) || 0)) }),
      applyScenarioDraft: (snapshot) =>
        set(() => {
          const draft = normalizeVitals(snapshot.monitor.draft)
          const draftVitalActive = normalizeVitalActive(
            snapshot.monitor.draftVitalActive,
            undefined,
          )
          if (isAutomaticHeartRateRhythm(draft.rhythm)) draftVitalActive.hr = true
          const originAddress = snapshot.dispatch.originAddress.trim() || JOHN_ABBOTT_ADDRESS

          return {
            defibrillatorModelDraft: normalizeDefibrillatorModel(
              snapshot.defibrillatorModel,
            ),
            draft,
            draftVitalActive,
            draftVitalsActive: anyVitalActive(draftVitalActive),
            lastRhythm: normalizeActiveRhythm(snapshot.monitor.lastRhythm),
            manualHrBeforeAuto: null,
            callerInfoDraft: normalizeCallerInfo(snapshot.callerInfo),
            dispatchMinutes: Math.max(0, Math.floor(snapshot.dispatch.minutes) || 0),
            dispatchSeconds: Math.min(
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
      resetMonitorVitals: () =>
        set((s) => ({
          draft: initial,
          saved: initial,
          confirmed: initial,
          draftVitalsActive: false,
          savedVitalsActive: false,
          confirmedVitalsActive: false,
          draftVitalActive: inactiveVitals,
          savedVitalActive: inactiveVitals,
          confirmedVitalActive: inactiveVitals,
          manualHrBeforeAuto: null,
          monitorResetVersion: s.monitorResetVersion + 1,
          etco2CalibrationStatus: 'idle',
          cprMode: 'off',
          acceptedBp: initialBpDisplay,
          acceptedBpActive: inactiveBpActive,
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
        set((s) => ({
          defibrillatorModelSaved: s.defibrillatorModelDraft,
          saved: { ...s.draft },
          savedVitalActive: { ...s.draftVitalActive },
          savedVitalsActive: anyVitalActive(s.draftVitalActive),
          callerInfoSaved: { ...s.callerInfoDraft },
          dispatchRouteSaved: { ...s.dispatchRouteDraft },
          dispatchSavedSeconds: dispatchCountdownSeconds(
            s.dispatchMinutes,
            s.dispatchSeconds,
          ),
        })),
      // Re-stamp the dispatch clock at the moment the room opens.
      //
      // Send arms the gate and stamps the countdown as a side effect, but with
      // Start gated behind a Send the instructor stages the call first and may
      // take minutes settling the room before opening it. Left alone, trainees
      // would arrive with travel time already burned off — or expired. Both the
      // travel countdown and the response timer should measure from when the
      // call actually reaches them.
      startDispatchClock: () =>
        set((s) => {
          if (!s.dispatch.armed) return s
          const now = Date.now()
          return {
            dispatch: {
              ...s.dispatch,
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
          // A new dispatch countdown (saved value differs from the one already
          // confirmed) makes this Send a re-dispatch: the timing restarts and the
          // trainee must Acknowledge/Arrive again. The first Send is always one.
          const countdownChanged = s.dispatchSavedSeconds !== s.dispatchConfirmedSeconds
          const redispatch = !s.dispatch.armed || countdownChanged

          const dispatchDurationSeconds = s.dispatchSavedSeconds
          const routeReady = s.dispatchRouteSaved.status === 'ready'
          const routeStartedAt = redispatch ? now : s.dispatch.startedAt
          const dispatchRouteConfirmed: DispatchRoute = {
            ...s.dispatchRouteSaved,
            startedAt: routeReady ? routeStartedAt : s.dispatchRouteSaved.startedAt,
            durationSeconds: routeReady
              ? dispatchDurationSeconds
              : s.dispatchRouteSaved.durationSeconds,
          }
          const base = {
            defibrillatorModelConfirmed: s.defibrillatorModelSaved,
            confirmed: { ...s.saved },
            confirmedVitalActive: { ...s.savedVitalActive },
            confirmedVitalsActive: anyVitalActive(s.savedVitalActive),
            callerInfoConfirmed: { ...s.callerInfoSaved },
            dispatchRouteConfirmed,
            dispatchConfirmedSeconds: s.dispatchSavedSeconds,
          }
          // Later Sends that keep the same countdown only push updated content —
          // the armed gate, its countdown, and any Acknowledge/Arrival are left
          // intact and the route ETA keeps ticking from its original start.
          if (!redispatch) return base

          // First arm reads the not-yet-saved draft countdown; a re-dispatch uses
          // the saved countdown (the change that triggered the restart), so the
          // gate and the map ETA stay on the same clock.
          const durationMs = s.dispatch.armed
            ? dispatchDurationSeconds * 1000
            : (s.dispatchMinutes * 60 + s.dispatchSeconds) * 1000
          return {
            ...base,
            dispatch: {
              ...s.dispatch,
              runId: nanoid(),
              armed: true,
              startedAt: now,
              countdownEndsAt: now + durationMs,
              acknowledgedAt: null,
              arrivedAt: null,
            },
          }
        }),
      getSharedState: (): SharedMonitorState => {
        const s = get()
        return {
          defibrillatorModelConfirmed: s.defibrillatorModelConfirmed,
          confirmed: { ...s.confirmed },
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
        }
      },
      applySharedState: (shared) =>
        set((s) => {
          const confirmed = normalizeVitals(shared.confirmed)
          const confirmedVitalActive = normalizeVitalActive(
            shared.confirmedVitalActive,
            undefined,
          )

          // Dispatch timing/content is instructor-authoritative, but the gate
          // progress belongs to this trainee. Same run keeps their progress; a
          // new armed run clears Ack/Arrival (same contract as a local
          // re-dispatch Send); a disarmed gate is a full drill reset.
          const incoming = normalizeDispatch(
            shared.dispatch,
            s.dispatchConfirmedSeconds * 1000,
          )
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
              transportedAt: s.dispatch.transportedAt,
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
            confirmedVitalActive,
            confirmedVitalsActive: anyVitalActive(confirmedVitalActive),
            callerInfoConfirmed: normalizeCallerInfo(shared.callerInfoConfirmed),
            dispatchRouteConfirmed: normalizeDispatchRoute(shared.dispatchRouteConfirmed),
            dispatch,
            dispatchConfirmedSeconds:
              typeof shared.dispatchConfirmedSeconds === 'number'
                ? shared.dispatchConfirmedSeconds
                : s.dispatchConfirmedSeconds,
            cprMode: normalizeCprMode(shared.cprMode, shared.cprOverrideActive),
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
            draftVitalsActive: false,
            savedVitalsActive: false,
            confirmedVitalsActive: false,
            draftVitalActive: inactiveVitals,
            savedVitalActive: inactiveVitals,
            confirmedVitalActive: inactiveVitals,
            lastRhythm: DEFAULT_ACTIVE_RHYTHM,
            manualHrBeforeAuto: null,
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
          draftVitalsActive: false,
          savedVitalsActive: false,
          confirmedVitalsActive: false,
          draftVitalActive: inactiveVitals,
          savedVitalActive: inactiveVitals,
          confirmedVitalActive: inactiveVitals,
          lastRhythm: DEFAULT_ACTIVE_RHYTHM,
          manualHrBeforeAuto: null,
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
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 10,
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
        const draft = normalizeVitals(persistedState?.draft)
        const saved = normalizeVitals(persistedState?.saved)
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
          draftVitalActive,
          savedVitalActive,
          confirmedVitalActive,
          draftVitalsActive: anyVitalActive(draftVitalActive),
          savedVitalsActive: anyVitalActive(savedVitalActive),
          confirmedVitalsActive: anyVitalActive(confirmedVitalActive),
          lastRhythm: normalizeActiveRhythm(persistedState?.lastRhythm),
          manualHrBeforeAuto: null,
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
