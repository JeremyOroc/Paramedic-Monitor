import type { Vitals } from '@/store/monitorStore'
import { DEFAULT_VITALS, getActiveAlarms, type VitalActiveState } from '@/types/vitals'

export type WagamiADisplayState = {
  vitals: Vitals
  active: VitalActiveState
  simulated: boolean
  alarms: ReturnType<typeof getActiveAlarms>
}

const PREVIEW_VITALS: Vitals = {
  hr: DEFAULT_VITALS.hr,
  bp_sys: DEFAULT_VITALS.bp_sys,
  bp_dia: DEFAULT_VITALS.bp_dia,
  etco2: DEFAULT_VITALS.etco2,
  spo2: DEFAULT_VITALS.spo2,
  rhythm: DEFAULT_VITALS.rhythm,
  spo2_waveform: DEFAULT_VITALS.spo2_waveform,
  etco2_waveform: DEFAULT_VITALS.etco2_waveform,
}

const PREVIEW_ACTIVE: VitalActiveState = {
  hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true,
}

export function resolveWagamiAPreviewState(
  confirmed: Vitals,
  confirmedActive: VitalActiveState,
): WagamiADisplayState {
  const simulated = !Object.values(confirmedActive).some(Boolean)
  const vitals = simulated ? PREVIEW_VITALS : confirmed
  const active = simulated ? PREVIEW_ACTIVE : confirmedActive
  return {
    vitals,
    active,
    simulated,
    alarms: getActiveAlarms(vitals, active),
  }
}
