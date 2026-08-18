import {
  EMPTY_PATIENT_INFORMATION_TEXT,
  type PatientInformationTextState,
} from '@/lib/patientInformationAutoSort'
import type { PatientPhysicalFindings } from '@/lib/patientPhysicalAutoSort'
import { DEFAULT_CALLER_INFO, normalizeCallerInfo } from '@/types/callerInfo'
import { JOHN_ABBOTT_ADDRESS } from '@/types/dispatchRoute'
import type {
  ScenarioSnapshotV1,
  ScenarioVitalsDraft,
} from '@/types/savedScenario'
import type { Rhythm, VitalActiveState } from '@/types/vitals'

const VALID_RHYTHMS = new Set<Rhythm>([
  'off',
  'nsr',
  'vf',
  'vt',
  'torsades',
  'asystole',
  'first-degree',
  'second-degree-type-1',
  'second-degree-type-2',
  'third-degree',
  'anterior-mi',
  'inferior-mi',
])
const VALID_ACTIVE_RHYTHMS = new Set<Exclude<Rhythm, 'off'>>(
  Array.from(VALID_RHYTHMS).filter((rhythm): rhythm is Exclude<Rhythm, 'off'> => rhythm !== 'off'),
)
const VALID_SPO2_WAVEFORMS = new Set(['normal', 'weak', 'off'] as const)
const VALID_ETCO2_WAVEFORMS = new Set([
  'normal',
  'hypoventilation',
  'obstructed',
  'off',
] as const)

const EMPTY_VITALS: ScenarioVitalsDraft = {
  hr: 0,
  bp_sys: 0,
  bp_dia: 0,
  etco2: 0,
  spo2: 0,
  rhythm: 'off',
  spo2_waveform: 'off',
  etco2_waveform: 'off',
}

const INACTIVE_VITALS: VitalActiveState = {
  hr: false,
  bp_sys: false,
  bp_dia: false,
  etco2: false,
  spo2: false,
}

type ScenarioSnapshotInput = {
  autoSortText: string
  monitor: ScenarioSnapshotV1['monitor']
  callerInfo: ScenarioSnapshotV1['callerInfo']
  dispatch: ScenarioSnapshotV1['dispatch']
  patientInformation: {
    selected: {
      sample: ReadonlySet<string> | readonly string[]
      opqrst: ReadonlySet<string> | readonly string[]
    }
    values: PatientInformationTextState
  }
  patientPhysical: {
    selected: ReadonlySet<string> | readonly string[]
    findings: PatientPhysicalFindings
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string'))).sort()
}

function normalizeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizePatientInformation(value: unknown): PatientInformationTextState {
  const defaults = EMPTY_PATIENT_INFORMATION_TEXT()
  if (!isRecord(value)) return defaults
  return {
    sample: { ...defaults.sample, ...normalizeStringRecord(value.sample) },
    opqrst: { ...defaults.opqrst, ...normalizeStringRecord(value.opqrst) },
  }
}

export function createEmptyScenarioSnapshot(): ScenarioSnapshotV1 {
  return {
    version: 1,
    autoSortText: '',
    monitor: {
      draft: { ...EMPTY_VITALS },
      draftVitalActive: { ...INACTIVE_VITALS },
      lastRhythm: 'nsr',
    },
    callerInfo: { ...DEFAULT_CALLER_INFO },
    dispatch: {
      minutes: 0,
      seconds: 0,
      originAddress: JOHN_ABBOTT_ADDRESS,
    },
    patientInformation: {
      selected: { sample: [], opqrst: [] },
      values: EMPTY_PATIENT_INFORMATION_TEXT(),
    },
    patientPhysical: {
      selected: [],
      findings: {},
    },
  }
}

export function createScenarioSnapshot(input: ScenarioSnapshotInput): ScenarioSnapshotV1 {
  return {
    version: 1,
    autoSortText: input.autoSortText,
    monitor: {
      draft: { ...input.monitor.draft },
      draftVitalActive: { ...input.monitor.draftVitalActive },
      lastRhythm: input.monitor.lastRhythm,
    },
    callerInfo: { ...input.callerInfo },
    dispatch: { ...input.dispatch },
    patientInformation: {
      selected: {
        sample: Array.from(input.patientInformation.selected.sample).sort(),
        opqrst: Array.from(input.patientInformation.selected.opqrst).sort(),
      },
      values: {
        sample: { ...input.patientInformation.values.sample },
        opqrst: { ...input.patientInformation.values.opqrst },
      },
    },
    patientPhysical: {
      selected: Array.from(input.patientPhysical.selected).sort(),
      findings: { ...input.patientPhysical.findings },
    },
  }
}

export function normalizeScenarioSnapshot(value: unknown): ScenarioSnapshotV1 | null {
  if (!isRecord(value) || value.version !== 1) return null
  const monitor = value.monitor
  const draft = isRecord(monitor) ? monitor.draft : null
  const active = isRecord(monitor) ? monitor.draftVitalActive : null
  const callerInfo = value.callerInfo
  const dispatch = value.dispatch
  const patientInformation = value.patientInformation
  const patientPhysical = value.patientPhysical
  if (
    !isRecord(monitor) ||
    !isRecord(draft) ||
    !isRecord(active) ||
    !isRecord(callerInfo) ||
    !isRecord(dispatch) ||
    !isRecord(patientInformation) ||
    !isRecord(patientPhysical)
  ) {
    return null
  }

  const rhythm = VALID_RHYTHMS.has(draft.rhythm as Rhythm) ? (draft.rhythm as Rhythm) : 'off'
  const lastRhythm = VALID_ACTIVE_RHYTHMS.has(monitor.lastRhythm as Exclude<Rhythm, 'off'>)
    ? (monitor.lastRhythm as Exclude<Rhythm, 'off'>)
    : 'nsr'
  const spo2Waveform = VALID_SPO2_WAVEFORMS.has(
    draft.spo2_waveform as 'normal' | 'weak' | 'off',
  )
    ? (draft.spo2_waveform as 'normal' | 'weak' | 'off')
    : 'off'
  const etco2Waveform = VALID_ETCO2_WAVEFORMS.has(
    draft.etco2_waveform as 'normal' | 'hypoventilation' | 'obstructed' | 'off',
  )
    ? (draft.etco2_waveform as 'normal' | 'hypoventilation' | 'obstructed' | 'off')
    : 'off'
  const selected = isRecord(patientInformation.selected)
    ? patientInformation.selected
    : {}

  return createScenarioSnapshot({
    autoSortText: typeof value.autoSortText === 'string' ? value.autoSortText : '',
    monitor: {
      draft: {
        hr: normalizeNumber(draft.hr),
        bp_sys: normalizeNumber(draft.bp_sys),
        bp_dia: normalizeNumber(draft.bp_dia),
        etco2: normalizeNumber(draft.etco2),
        spo2: normalizeNumber(draft.spo2),
        rhythm,
        spo2_waveform: spo2Waveform,
        etco2_waveform: etco2Waveform,
      },
      draftVitalActive: {
        hr: active.hr === true,
        bp_sys: active.bp_sys === true,
        bp_dia: active.bp_dia === true,
        etco2: active.etco2 === true,
        spo2: active.spo2 === true,
      },
      lastRhythm,
    },
    callerInfo: normalizeCallerInfo(callerInfo),
    dispatch: {
      minutes: Math.max(0, Math.floor(normalizeNumber(dispatch.minutes))),
      seconds: Math.min(59, Math.max(0, Math.floor(normalizeNumber(dispatch.seconds)))),
      originAddress:
        typeof dispatch.originAddress === 'string'
          ? dispatch.originAddress
          : JOHN_ABBOTT_ADDRESS,
    },
    patientInformation: {
      selected: {
        sample: normalizeStringArray(selected.sample),
        opqrst: normalizeStringArray(selected.opqrst),
      },
      values: normalizePatientInformation(patientInformation.values),
    },
    patientPhysical: {
      selected: normalizeStringArray(patientPhysical.selected),
      findings: normalizeStringRecord(patientPhysical.findings),
    },
  })
}

export function scenarioSnapshotsEqual(
  left: ScenarioSnapshotV1,
  right: ScenarioSnapshotV1,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function hasMeaningfulScenarioContent(snapshot: ScenarioSnapshotV1): boolean {
  return !scenarioSnapshotsEqual(snapshot, createEmptyScenarioSnapshot())
}
