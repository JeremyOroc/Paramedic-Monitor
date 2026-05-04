import type { Rhythm, PatientMode } from './vitals'

export type ScenarioState = {
  name: string
  hr: number
  bp_sys: number
  bp_dia: number
  etco2: number
  spo2: number
  rhythm: Rhythm
  patient_mode: PatientMode
  duration_s?: number
}

export type Scenario = {
  id: string
  session_id: string
  name: string
  timing_mode: 'manual' | 'timed'
  states: ScenarioState[]
  created_at: string
}
