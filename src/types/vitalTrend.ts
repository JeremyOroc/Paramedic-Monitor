import type { NumericVitalField } from '@/types/vitals'

export type VitalTrendTargets = Record<NumericVitalField, number | null>

export type VitalTrendConfiguration = {
  targets: VitalTrendTargets
  durationSeconds: number
}

export type VitalTrendParticipant = {
  start: number
  target: number
}

export type VitalTrendStatus = 'running' | 'complete' | 'cancelled'

export type ActiveVitalTrend = {
  id: string
  participants: Partial<Record<NumericVitalField, VitalTrendParticipant>>
  startsAt: number
  endsAt: number
  status: VitalTrendStatus
  completedAt: number | null
  completionPublished: boolean
}

export const EMPTY_VITAL_TREND_TARGETS: VitalTrendTargets = {
  hr: null,
  bp_sys: null,
  bp_dia: null,
  etco2: null,
  spo2: null,
}

export const EMPTY_VITAL_TREND_CONFIGURATION: VitalTrendConfiguration = {
  targets: EMPTY_VITAL_TREND_TARGETS,
  durationSeconds: 0,
}
