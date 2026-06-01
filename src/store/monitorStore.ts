'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  DEFAULT_VITALS,
  type Etco2Waveform,
  type Rhythm,
  type Spo2Waveform,
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
  hr: DEFAULT_VITALS.hr,
  bp_sys: DEFAULT_VITALS.bp_sys,
  bp_dia: DEFAULT_VITALS.bp_dia,
  etco2: DEFAULT_VITALS.etco2,
  spo2: DEFAULT_VITALS.spo2,
  rhythm: DEFAULT_VITALS.rhythm,
  spo2_waveform: DEFAULT_VITALS.spo2_waveform,
  etco2_waveform: DEFAULT_VITALS.etco2_waveform,
}

const VALID_RHYTHMS: ReadonlySet<Rhythm> = new Set([
  'nsr',
  'vf',
  'vt',
  'torsades',
  'asystole',
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

function isNumericVitalField(field: keyof Vitals): boolean {
  return field === 'hr' ||
    field === 'bp_sys' ||
    field === 'bp_dia' ||
    field === 'etco2' ||
    field === 'spo2'
}

// Dispatch / startup-gate state. The admin "Send" arms this (lock + countdown);
// the trainee must Acknowledge, wait out the countdown, then mark Arrival before
// the monitor power button works. Persisted so a refresh resumes the drill.
export type DispatchState = {
  armed: boolean
  countdownEndsAt: number | null // absolute ms epoch; survives refresh
  acknowledgedAt: string | null // EST HH:MM:SS
  arrivedAt: string | null
  transportedAt: string | null
  callerEvents: EventLogEntry[]
}

export const DEFAULT_DISPATCH: DispatchState = {
  armed: false,
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

function normalizeDispatch(dispatch: Partial<DispatchState> | undefined): DispatchState {
  return {
    armed: dispatch?.armed === true,
    countdownEndsAt:
      typeof dispatch?.countdownEndsAt === 'number' ? dispatch.countdownEndsAt : null,
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
  callerInfoDraft: CallerInfo
  callerInfoSaved: CallerInfo
  callerInfoConfirmed: CallerInfo
  patientInfo: PatientInfo
  dispatch: DispatchState
  dispatchMinutes: number
  dispatchSeconds: number
  setDraft: <K extends keyof Vitals>(field: K, value: Vitals[K]) => void
  setCallerInfoDraft: (field: CallerInfoField, value: string) => void
  setPatientAge: (age: number) => void
  setPatientSex: (sex: PatientSex) => void
  setDispatchMinutes: (minutes: number) => void
  setDispatchSeconds: (seconds: number) => void
  acknowledgeCall: (estTime: string) => void
  arriveCall: (estTime: string) => void
  transportCall: (estTime: string) => void
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
      callerInfoDraft: DEFAULT_CALLER_INFO,
      callerInfoSaved: DEFAULT_CALLER_INFO,
      callerInfoConfirmed: DEFAULT_CALLER_INFO,
      patientInfo: DEFAULT_PATIENT_INFO,
      dispatch: DEFAULT_DISPATCH,
      dispatchMinutes: 0,
      dispatchSeconds: 0,
      setDraft: (field, value) =>
        set((s) => ({
          draft: { ...s.draft, [field]: value },
          draftVitalsActive: isNumericVitalField(field) ? true : s.draftVitalsActive,
        })),
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
      resetMonitorVitals: () =>
        set({
          draft: initial,
          saved: initial,
          confirmed: initial,
          draftVitalsActive: false,
          savedVitalsActive: false,
          confirmedVitalsActive: false,
        }),
      resetVitalsToNormal: () =>
        set((s) => ({
          draft: {
            ...s.draft,
            hr: DEFAULT_VITALS.hr,
            bp_sys: DEFAULT_VITALS.bp_sys,
            bp_dia: DEFAULT_VITALS.bp_dia,
            etco2: DEFAULT_VITALS.etco2,
            spo2: DEFAULT_VITALS.spo2,
          },
          draftVitalsActive: true,
        })),
      save: () =>
        set((s) => ({
          saved: { ...s.draft },
          savedVitalsActive: s.draftVitalsActive,
          callerInfoSaved: { ...s.callerInfoDraft },
        })),
      send: () =>
        set((s) => {
          const base = {
            confirmed: { ...s.saved },
            confirmedVitalsActive: s.savedVitalsActive,
            callerInfoConfirmed: { ...s.callerInfoSaved },
          }
          // The first Send arms the dispatch gate: lock + countdown. Later Sends
          // only push updated caller-info content and never re-arm or restart it.
          if (s.dispatch.armed) return base
          const durationMs = (s.dispatchMinutes * 60 + s.dispatchSeconds) * 1000
          return {
            ...base,
            dispatch: {
              ...s.dispatch,
              armed: true,
              countdownEndsAt: Date.now() + durationMs,
            },
          }
        }),
      reset: () =>
        set({
          draft: initial,
          saved: initial,
          confirmed: initial,
          draftVitalsActive: false,
          savedVitalsActive: false,
          confirmedVitalsActive: false,
          callerInfoDraft: DEFAULT_CALLER_INFO,
          callerInfoSaved: DEFAULT_CALLER_INFO,
          callerInfoConfirmed: DEFAULT_CALLER_INFO,
          patientInfo: DEFAULT_PATIENT_INFO,
          dispatch: DEFAULT_DISPATCH,
          dispatchMinutes: 0,
          dispatchSeconds: 0,
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 5,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // A migrate fn must exist for older persisted versions, otherwise persist
      // logs "couldn't be migrated" (surfaced as a Next dev error overlay).
      // Passthrough is enough — `merge` below fills/normalizes new fields.
      migrate: (persistedState) => persistedState as MonitorState,
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<MonitorState> | undefined

        return {
          ...current,
          ...persistedState,
          draft: normalizeVitals(persistedState?.draft),
          saved: normalizeVitals(persistedState?.saved),
          confirmed: normalizeVitals(persistedState?.confirmed),
          draftVitalsActive: persistedState?.draftVitalsActive === true,
          savedVitalsActive: persistedState?.savedVitalsActive === true,
          confirmedVitalsActive: persistedState?.confirmedVitalsActive === true,
          callerInfoDraft: normalizeCallerInfo(persistedState?.callerInfoDraft),
          callerInfoSaved: normalizeCallerInfo(persistedState?.callerInfoSaved),
          callerInfoConfirmed: normalizeCallerInfo(persistedState?.callerInfoConfirmed),
          patientInfo: {
            ...DEFAULT_PATIENT_INFO,
            ...persistedState?.patientInfo,
          },
          dispatch: normalizeDispatch(persistedState?.dispatch),
          dispatchMinutes:
            typeof persistedState?.dispatchMinutes === 'number'
              ? persistedState.dispatchMinutes
              : 0,
          dispatchSeconds:
            typeof persistedState?.dispatchSeconds === 'number'
              ? persistedState.dispatchSeconds
              : 0,
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
