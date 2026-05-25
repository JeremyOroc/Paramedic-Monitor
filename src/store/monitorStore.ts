'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  DEFAULT_VITALS,
  type Etco2Waveform,
  type Rhythm,
  type Spo2Waveform,
} from '@/types/vitals'

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
  setDraft: <K extends keyof Vitals>(field: K, value: Vitals[K]) => void
  resetVitalsToNormal: () => void
  save: () => void
  send: () => void
  reset: () => void
}

const STORAGE_KEY = 'paramedic-monitor.v1'

export const useMonitorStore = create<MonitorState>()(
  persist(
    (set) => ({
      draft: initial,
      saved: initial,
      confirmed: initial,
      setDraft: (field, value) =>
        set((s) => ({ draft: { ...s.draft, [field]: value } })),
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
      save: () => set((s) => ({ saved: { ...s.draft } })),
      send: () => set((s) => ({ confirmed: { ...s.saved } })),
      reset: () => set({ draft: initial, saved: initial, confirmed: initial }),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
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
