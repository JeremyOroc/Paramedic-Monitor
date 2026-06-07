export type Rhythm = 'off' | 'nsr' | 'vf' | 'vt' | 'torsades' | 'asystole'

export type Spo2Waveform = 'normal' | 'weak' | 'off'

export type Etco2Waveform = 'normal' | 'hypoventilation' | 'obstructed' | 'off'

export type PatientMode = 'adult' | 'pediatric' | 'neonate'

export type NumericVitalField = 'hr' | 'bp_sys' | 'bp_dia' | 'etco2' | 'spo2'

export type VitalActiveState = Record<NumericVitalField, boolean>

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
  hr:     { low: 40,  high: 140 },
  bp_sys: { low: 90,  high: 200 },
  bp_dia: { low: 25,  high: 225 },
  spo2:   { low: 90 },
} as const

export type AlarmChannel = 'hr' | 'bp' | 'spo2'

type AlarmVitals = Pick<VitalsSnapshot, 'hr' | 'bp_sys' | 'bp_dia' | 'spo2'>

function isBelow(value: number, low: number): boolean {
  return Number.isFinite(value) && value < low
}

function isAbove(value: number, high: number): boolean {
  return Number.isFinite(value) && value > high
}

export function getActiveAlarms(
  vitals: AlarmVitals,
  active: Partial<VitalActiveState> = {
    hr: true,
    bp_sys: true,
    bp_dia: true,
    spo2: true,
  },
): AlarmChannel[] {
  const alarms: AlarmChannel[] = []

  if (
    active.hr !== false &&
    (
      isBelow(vitals.hr, ALARM_THRESHOLDS.hr.low) ||
      isAbove(vitals.hr, ALARM_THRESHOLDS.hr.high)
    )
  ) {
    alarms.push('hr')
  }

  if (
    (
      active.bp_sys !== false &&
      (
        isBelow(vitals.bp_sys, ALARM_THRESHOLDS.bp_sys.low) ||
        isAbove(vitals.bp_sys, ALARM_THRESHOLDS.bp_sys.high)
      )
    ) ||
    (
      active.bp_dia !== false &&
      (
        isBelow(vitals.bp_dia, ALARM_THRESHOLDS.bp_dia.low) ||
        isAbove(vitals.bp_dia, ALARM_THRESHOLDS.bp_dia.high)
      )
    )
  ) {
    alarms.push('bp')
  }

  if (active.spo2 !== false && isBelow(vitals.spo2, ALARM_THRESHOLDS.spo2.low)) {
    alarms.push('spo2')
  }

  return alarms
}
