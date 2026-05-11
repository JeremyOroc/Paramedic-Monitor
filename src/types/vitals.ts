export type Rhythm = 'nsr' | 'vf' | 'vt' | 'asystole' | 'pea'

export type Spo2Waveform = 'normal' | 'weak' | 'off'

export type Etco2Waveform = 'normal' | 'hypoventilation' | 'obstructed' | 'off'

export type PatientMode = 'adult' | 'pediatric' | 'neonate'

export type VitalsSnapshot = {
  hr: number
  bp_sys: number
  bp_dia: number
  etco2: number
  spo2: number
  rhythm: Rhythm
  spo2_waveform: Spo2Waveform
  etco2_waveform: Etco2Waveform
  patient_mode: PatientMode
  joules: number
  shock_count: number
  cpr_active: boolean
  etco2_mode: boolean
}

export const DEFAULT_VITALS: VitalsSnapshot = {
  hr: 80,
  bp_sys: 120,
  bp_dia: 80,
  etco2: 35,
  spo2: 98,
  rhythm: 'nsr',
  spo2_waveform: 'normal',
  etco2_waveform: 'normal',
  patient_mode: 'adult',
  joules: 120,
  shock_count: 0,
  cpr_active: false,
  etco2_mode: false,
}

export const JOULE_DEFAULTS: Record<PatientMode, number> = {
  adult: 120,
  pediatric: 50,
  neonate: 10,
}

export const ALARM_THRESHOLDS = {
  hr:     { low: 40,  high: 150 },
  bp_sys: { low: 90,  high: 200 },
} as const
