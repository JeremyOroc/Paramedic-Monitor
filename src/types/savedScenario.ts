import type { PatientInformationTextState } from '@/lib/patientInformationAutoSort'
import type { PatientPhysicalFindings } from '@/lib/patientPhysicalAutoSort'
import type { CallerInfo } from '@/types/callerInfo'
import type {
  Etco2Waveform,
  Rhythm,
  Spo2Waveform,
  VitalActiveState,
} from '@/types/vitals'

export type ScenarioVitalsDraft = {
  hr: number
  bp_sys: number
  bp_dia: number
  etco2: number
  spo2: number
  rhythm: Rhythm
  spo2_waveform: Spo2Waveform
  etco2_waveform: Etco2Waveform
}

export type ScenarioSnapshotV1 = {
  version: 1
  autoSortText: string
  monitor: {
    draft: ScenarioVitalsDraft
    draftVitalActive: VitalActiveState
    lastRhythm: Exclude<Rhythm, 'off'>
  }
  callerInfo: CallerInfo
  dispatch: {
    minutes: number
    seconds: number
    originAddress: string
  }
  patientInformation: {
    selected: {
      sample: string[]
      opqrst: string[]
    }
    values: PatientInformationTextState
  }
  patientPhysical: {
    selected: string[]
    findings: PatientPhysicalFindings
  }
}

export type ScenarioFolder = {
  id: string
  name: string
  scenario_count: number
  created_at: string
  updated_at: string
}

export type SavedScenarioSummary = {
  id: string
  folder_id: string
  scenario_number: number
  title: string
  position: number
  created_at: string
  updated_at: string
}

export type SavedScenario = SavedScenarioSummary & {
  snapshot: ScenarioSnapshotV1
}

export type ScenarioFolderListResponse = {
  folders: ScenarioFolder[]
}

export type SavedScenarioListResponse = {
  scenarios: SavedScenarioSummary[]
}
