'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import {
  DEFAULT_VITALS,
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
import type { EventLogEntry } from '@/components/monitor/EventLogModal'

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
  'anterior-mi',
  'inferior-mi',
])

function normalizeRhythm(value: unknown): Rhythm {
  if (typeof value !== 'string') return DEFAULT_VITALS.rhythm
  return VALID_RHYTHMS.has(value as Rhythm) ? (value as Rhythm) : DEFAULT_VITALS.rhythm
}

function normalizeVitals(vitals: Partial<Vitals> | undefined): Vitals {
  return {
    ...initial,
    ...vitals,
    rhythm: normalizeRhythm(vitals?.rhythm),
  }
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

function isNumericVitalField(field: keyof Vitals): field is NumericVitalField {
  return field === 'hr' ||
    field === 'bp_sys' ||
    field === 'bp_dia' ||
    field === 'etco2' ||
    field === 'spo2'
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
  draft: Vitals
  saved: Vitals
  confirmed: Vitals
  draftVitalsActive: boolean
  savedVitalsActive: boolean
  confirmedVitalsActive: boolean
  draftVitalActive: VitalActiveState
  savedVitalActive: VitalActiveState
  confirmedVitalActive: VitalActiveState
  callerInfoDraft: CallerInfo
  callerInfoSaved: CallerInfo
  callerInfoConfirmed: CallerInfo
  patientInfo: PatientInfo
  dispatch: DispatchState
  dispatchMinutes: number
  dispatchSeconds: number
  monitorResetVersion: number
  etco2CalibrationStatus: Etco2CalibrationStatus
  cprOverrideActive: boolean
  acceptedBp: BpDisplay
  acceptedBpActive: BpActiveState
  setDraft: <K extends keyof Vitals>(field: K, value: Vitals[K]) => void
  setDraftVitalActive: (field: NumericVitalField, active: boolean) => void
  setCallerInfoDraft: (field: CallerInfoField, value: string) => void
  setPatientAge: (age: number) => void
  setPatientSex: (sex: PatientSex) => void
  setDispatchMinutes: (minutes: number) => void
  setDispatchSeconds: (seconds: number) => void
  acknowledgeCall: (estTime: string) => void
  arriveCall: (estTime: string) => void
  transportCall: (estTime: string) => void
  startEtco2Calibration: () => void
  cancelEtco2Calibration: () => void
  completeEtco2Calibration: () => void
  setCprOverrideActive: (active: boolean) => void
  acceptBpReading: (bp: BpDisplay, active: BpActiveState) => void
  resetMonitorVitals: () => void
  resetVitalsToNormal: () => void
  save: () => void
  send: () => void
  reset: () => void
}

export const STORAGE_KEY = 'paramedic-monitor.v1'

export const useMonitorStore = create<MonitorState>()(
  persist(
    (set) => ({
      draft: initial,
      saved: initial,
      confirmed: initial,
      draftVitalsActive: false,
      savedVitalsActive: false,
      confirmedVitalsActive: false,
      draftVitalActive: inactiveVitals,
      savedVitalActive: inactiveVitals,
      confirmedVitalActive: inactiveVitals,
      callerInfoDraft: DEFAULT_CALLER_INFO,
      callerInfoSaved: DEFAULT_CALLER_INFO,
      callerInfoConfirmed: DEFAULT_CALLER_INFO,
      patientInfo: DEFAULT_PATIENT_INFO,
      dispatch: DEFAULT_DISPATCH,
      dispatchMinutes: 0,
      dispatchSeconds: 0,
      monitorResetVersion: 0,
      etco2CalibrationStatus: 'idle',
      cprOverrideActive: false,
      acceptedBp: initialBpDisplay,
      acceptedBpActive: inactiveBpActive,
      setDraft: (field, value) =>
        set((s) => {
          const draft: Vitals = { ...s.draft, [field]: value }
          if (field === 'spo2') draft.spo2_waveform = 'normal'
          if (field === 'etco2') draft.etco2_waveform = 'normal'
          const draftVitalActive = isNumericVitalField(field)
            ? { ...s.draftVitalActive, [field]: true }
            : s.draftVitalActive
          return {
            draft,
            draftVitalActive,
            draftVitalsActive: anyVitalActive(draftVitalActive),
          }
        }),
      setDraftVitalActive: (field, active) =>
        set((s) => {
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
      setPatientAge: (age) =>
        set((s) => ({ patientInfo: { ...s.patientInfo, age: clampAge(age) } })),
      setPatientSex: (sex) =>
        set((s) => ({ patientInfo: { ...s.patientInfo, sex } })),
      setDispatchMinutes: (minutes) =>
        set({ dispatchMinutes: Math.max(0, Math.floor(minutes) || 0) }),
      setDispatchSeconds: (seconds) =>
        set({ dispatchSeconds: Math.min(59, Math.max(0, Math.floor(seconds) || 0)) }),
      acknowledgeCall: (estTime) =>
        set((s) => {
          if (s.dispatch.acknowledgedAt) return s
          return {
            dispatch: {
              ...s.dispatch,
              acknowledgedAt: estTime,
              callerEvents: [
                ...s.dispatch.callerEvents,
                { name: `Call - ${CALLER_EVENT_LABELS.acknowledge}`, time: estTime },
              ],
            },
          }
        }),
      arriveCall: (estTime) =>
        set((s) => {
          if (s.dispatch.arrivedAt) return s
          return {
            dispatch: {
              ...s.dispatch,
              arrivedAt: estTime,
              callerEvents: [
                ...s.dispatch.callerEvents,
                { name: `Call - ${CALLER_EVENT_LABELS.arrival}`, time: estTime },
              ],
            },
          }
        }),
      transportCall: (estTime) =>
        set((s) => {
          if (s.dispatch.transportedAt) return s
          return {
            dispatch: {
              ...s.dispatch,
              transportedAt: estTime,
              callerEvents: [
                ...s.dispatch.callerEvents,
                { name: `Call - ${CALLER_EVENT_LABELS.transport}`, time: estTime },
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
      setCprOverrideActive: (active) =>
        set({ cprOverrideActive: active }),
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
          monitorResetVersion: s.monitorResetVersion + 1,
          etco2CalibrationStatus: 'idle',
          cprOverrideActive: false,
          acceptedBp: initialBpDisplay,
          acceptedBpActive: inactiveBpActive,
        })),
      resetVitalsToNormal: () =>
        set((s) => ({
          draft: {
            ...s.draft,
            hr: DEFAULT_VITALS.hr,
            bp_sys: DEFAULT_VITALS.bp_sys,
            bp_dia: DEFAULT_VITALS.bp_dia,
            etco2: DEFAULT_VITALS.etco2,
            spo2: DEFAULT_VITALS.spo2,
            etco2_waveform: 'normal',
            spo2_waveform: 'normal',
          },
          draftVitalActive: activeVitals,
          draftVitalsActive: true,
        })),
      save: () =>
        set((s) => ({
          saved: { ...s.draft },
          savedVitalActive: { ...s.draftVitalActive },
          savedVitalsActive: anyVitalActive(s.draftVitalActive),
          callerInfoSaved: { ...s.callerInfoDraft },
        })),
      send: () =>
        set((s) => {
          const base = {
            confirmed: { ...s.saved },
            confirmedVitalActive: { ...s.savedVitalActive },
            confirmedVitalsActive: anyVitalActive(s.savedVitalActive),
            callerInfoConfirmed: { ...s.callerInfoSaved },
          }
          // The first Send arms the dispatch gate: lock + countdown. Later Sends
          // only push updated caller-info content and never re-arm or restart it.
          if (s.dispatch.armed) return base
          const durationMs = (s.dispatchMinutes * 60 + s.dispatchSeconds) * 1000
          const startedAt = Date.now()
          return {
            ...base,
            dispatch: {
              ...s.dispatch,
              runId: nanoid(),
              armed: true,
              startedAt,
              countdownEndsAt: startedAt + durationMs,
            },
          }
        }),
      reset: () =>
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
          callerInfoDraft: DEFAULT_CALLER_INFO,
          callerInfoSaved: DEFAULT_CALLER_INFO,
          callerInfoConfirmed: DEFAULT_CALLER_INFO,
          patientInfo: DEFAULT_PATIENT_INFO,
          dispatch: DEFAULT_DISPATCH,
          dispatchMinutes: 0,
          dispatchSeconds: 0,
          monitorResetVersion: s.monitorResetVersion + 1,
          etco2CalibrationStatus: 'idle',
          cprOverrideActive: false,
          acceptedBp: initialBpDisplay,
          acceptedBpActive: inactiveBpActive,
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 7,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // A migrate fn must exist for older persisted versions, otherwise persist
      // logs "couldn't be migrated" (surfaced as a Next dev error overlay).
      // Passthrough is enough — `merge` below fills/normalizes new fields.
      migrate: (persistedState) => persistedState as MonitorState,
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<MonitorState> | undefined
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
        const dispatchMinutes =
          typeof persistedState?.dispatchMinutes === 'number'
            ? persistedState.dispatchMinutes
            : 0
        const dispatchSeconds =
          typeof persistedState?.dispatchSeconds === 'number'
            ? persistedState.dispatchSeconds
            : 0

        return {
          ...current,
          ...persistedState,
          draft: normalizeVitals(persistedState?.draft),
          saved: normalizeVitals(persistedState?.saved),
          confirmed,
          draftVitalActive,
          savedVitalActive,
          confirmedVitalActive,
          draftVitalsActive: anyVitalActive(draftVitalActive),
          savedVitalsActive: anyVitalActive(savedVitalActive),
          confirmedVitalsActive: anyVitalActive(confirmedVitalActive),
          callerInfoDraft: normalizeCallerInfo(persistedState?.callerInfoDraft),
          callerInfoSaved: normalizeCallerInfo(persistedState?.callerInfoSaved),
          callerInfoConfirmed: normalizeCallerInfo(persistedState?.callerInfoConfirmed),
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
          monitorResetVersion:
            typeof persistedState?.monitorResetVersion === 'number'
              ? persistedState.monitorResetVersion
              : 0,
          etco2CalibrationStatus:
            persistedState?.etco2CalibrationStatus === 'calibrating' ||
            persistedState?.etco2CalibrationStatus === 'calibrated'
              ? persistedState.etco2CalibrationStatus
              : 'idle',
          cprOverrideActive: persistedState?.cprOverrideActive === true,
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
