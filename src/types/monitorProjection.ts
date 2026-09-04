import type { EventLogEntry } from '@/components/monitor/EventLogModal'
import type { CallerInfoVariant } from '@/components/monitor/CallerInfoModal'
import type { PowerState } from '@/components/monitor/DeviceShell'
import type { MonitorControllerState } from '@/hooks/useMonitorController'
import type { DefibState } from '@/hooks/useDefibSequence'
import type { NibpPhase } from '@/hooks/useNibpReading'
import type { VitalLogEntry } from '@/hooks/useVitalLog'
import type { CallerInfo } from '@/types/callerInfo'
import type { DefibrillatorModel } from '@/types/defibrillator'
import type { DispatchRoute } from '@/types/dispatchRoute'
import type { PatientInfo, PatientSex } from '@/types/patientInfo'
import type { MonitorSelection } from '@/types/monitorSelection'
import type { AlarmChannel, VitalActiveState } from '@/types/vitals'
import type { DispatchState, Vitals } from '@/store/monitorStore'

export const MONITOR_PROJECTION_VERSION = 1 as const

/**
 * A latest-state, semantic projection of one trainee monitor. It contains only
 * render inputs: no auth token, callbacks, browser state, or pointer position.
 */
export type MonitorProjection = {
  version: typeof MONITOR_PROJECTION_VERSION
  capturedAt: string
  model: DefibrillatorModel
  surface: 'dispatch' | 'monitor'
  powerState: PowerState
  date: string
  time: string
  sessionTimer: string
  responseTimer: string
  countdownFormatted: string
  countdownDone: boolean
  gateSatisfied: boolean
  callerInfoVariant: CallerInfoVariant
  callerInfo: CallerInfo
  dispatchRoute: DispatchRoute
  dispatch: DispatchState
  patientInfo: PatientInfo
  confirmed: Vitals
  confirmedVitalActive: VitalActiveState
  acceptedBp: Pick<Vitals, 'bp_sys' | 'bp_dia'>
  acceptedBpActive: Pick<VitalActiveState, 'bp_sys' | 'bp_dia'>
  controller: MonitorControllerState
  activeSelectedControl: MonitorSelection
  displayAge: number
  displaySex: PatientSex
  displayedHr: number
  displayedHrActive: boolean
  vfDisplayedHr: number
  displayedEtco2: number | null
  cprOverrideActive: boolean
  etco2Loading: boolean
  etco2Loaded: boolean
  nibp: {
    enabled: boolean
    phase: NibpPhase
    displayValue: string | number
  }
  alarms: AlarmChannel[]
  defib: {
    state: DefibState
    energy: number
    shockCount: number
    progress: number
    phaseStartedAt: number | null
    phaseEndsAt: number | null
    cprStartTime: number | null
    lastDeliveredJoules: number | null
    canAnalyse: boolean
    canCharge: boolean
    canShock: boolean
    canAdjustEnergy: boolean
  }
  mergedEventLog: EventLogEntry[]
  vitalLog: VitalLogEntry[]
}

export type MonitorProjectionEnvelope = {
  streamId: string
  clientSequence: number
  attemptVersion: number
  updatedAt: string
  projection: MonitorProjection
}
