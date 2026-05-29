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

export type MonitorState = {
  draft: Vitals
  saved: Vitals
  confirmed: Vitals
  callerInfoDraft: CallerInfo
  callerInfoSaved: CallerInfo
  callerInfoConfirmed: CallerInfo
  patientInfo: PatientInfo
  setDraft: <K extends keyof Vitals>(field: K, value: Vitals[K]) => void
  setCallerInfoDraft: (field: CallerInfoField, value: string) => void
  setPatientAge: (age: number) => void
  setPatientSex: (sex: PatientSex) => void
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
      callerInfoDraft: DEFAULT_CALLER_INFO,
      callerInfoSaved: DEFAULT_CALLER_INFO,
      callerInfoConfirmed: DEFAULT_CALLER_INFO,
      patientInfo: DEFAULT_PATIENT_INFO,
      setDraft: (field, value) =>
        set((s) => ({ draft: { ...s.draft, [field]: value } })),
      setCallerInfoDraft: (field, value) =>
        set((s) => ({ callerInfoDraft: { ...s.callerInfoDraft, [field]: value } })),
      setPatientAge: (age) =>
        set((s) => ({ patientInfo: { ...s.patientInfo, age: clampAge(age) } })),
      setPatientSex: (sex) =>
        set((s) => ({ patientInfo: { ...s.patientInfo, sex } })),
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
        })),
      save: () =>
        set((s) => ({
          saved: { ...s.draft },
          callerInfoSaved: { ...s.callerInfoDraft },
        })),
      send: () =>
        set((s) => ({
          confirmed: { ...s.saved },
          callerInfoConfirmed: { ...s.callerInfoSaved },
        })),
      reset: () =>
        set({
          draft: initial,
          saved: initial,
          confirmed: initial,
          callerInfoDraft: DEFAULT_CALLER_INFO,
          callerInfoSaved: DEFAULT_CALLER_INFO,
          callerInfoConfirmed: DEFAULT_CALLER_INFO,
          patientInfo: DEFAULT_PATIENT_INFO,
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
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
          callerInfoDraft: normalizeCallerInfo(persistedState?.callerInfoDraft),
          callerInfoSaved: normalizeCallerInfo(persistedState?.callerInfoSaved),
          callerInfoConfirmed: normalizeCallerInfo(persistedState?.callerInfoConfirmed),
          patientInfo: {
            ...DEFAULT_PATIENT_INFO,
            ...persistedState?.patientInfo,
          },
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
