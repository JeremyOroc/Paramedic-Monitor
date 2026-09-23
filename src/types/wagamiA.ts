import type { VitalLogEntry } from '@/hooks/useVitalLog'
import type { Etco2CalibrationStatus } from '@/store/monitorStore'
import type { PatientMode, Rhythm } from '@/types/vitals'
import type { NibpAutoInterval, NibpMode } from '@/types/nibp'
import {
  DEFAULT_VITAL_LOG_INTERVAL,
  type VitalLogInterval,
} from '@/types/vitalLog'

export type WagamiALocale = 'fr' | 'en'

export type WagamiAView =
  | 'monitor'
  | 'twelveLead'
  | 'etco2'
  | 'medications'
  | 'medicationLog'
  | 'callInfo'
  | 'vitalLog'
  | 'configure'
  | 'nibpSettings'

export type WagamiAPreferences = {
  locale: WagamiALocale
  shellAlarmLedEnabled: boolean
  vitalLogInterval: VitalLogInterval
}

export const DEFAULT_WAGAMI_A_PREFERENCES: WagamiAPreferences = {
  locale: 'fr',
  shellAlarmLedEnabled: true,
  vitalLogInterval: DEFAULT_VITAL_LOG_INTERVAL,
}

export type WagamiAMedicationEvent = {
  medication: string
  occurredAtMs: number
  time: string
}

export type WagamiATwelveLeadCapture = {
  rhythm: Rhythm
  hr: number
}

export type WagamiATwelveLeadState = {
  captureState: 'idle' | 'acquiring' | 'result'
  lastCapture: WagamiATwelveLeadCapture | null
  printOpen: boolean
  transmissionOpen: boolean
  sentDestination: string | null
  sentUntil: number | null
}

/** Semantic A-only render state carried by the version-1 Spectator projection. */
export type WagamiAProjectionState = {
  /** Instructor reset generation used to begin a fresh live sweep remotely. */
  waveformResetVersion?: number
  view: WagamiAView
  preferences: WagamiAPreferences
  etco2CalibrationStatus: Etco2CalibrationStatus
  patientMode: PatientMode
  nibpMode: NibpMode
  nibpAutoInterval: NibpAutoInterval
  medicationEvents: WagamiAMedicationEvent[]
  vitalLog: VitalLogEntry[]
  twelveLead: WagamiATwelveLeadState
}
