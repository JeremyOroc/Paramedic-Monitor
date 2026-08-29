import type {
  PatientPhysicalFindings,
  PatientPhysicalIconFindingId,
} from '@/lib/patientPhysicalAutoSort'
import type { PatientSnsMeasurementGroupId } from '@/types/patientPhysical'

const GROUP_FINDING_IDS: Record<
  PatientSnsMeasurementGroupId,
  ReadonlyArray<PatientPhysicalIconFindingId>
> = {
  pulse: ['pulse-rate', 'pulse-rhythm', 'pulse-strength'],
  respiratory: [
    'respiratory-rate',
    'respiratory-rhythm',
    'respiratory-strength',
  ],
}

const RATE_FINDING_IDS: Record<PatientSnsMeasurementGroupId, PatientPhysicalIconFindingId> = {
  pulse: 'pulse-rate',
  respiratory: 'respiratory-rate',
}

const RHYTHM_FINDING_IDS: Record<PatientSnsMeasurementGroupId, PatientPhysicalIconFindingId> = {
  pulse: 'pulse-rhythm',
  respiratory: 'respiratory-rhythm',
}

const QUALITY_FINDING_IDS: Record<PatientSnsMeasurementGroupId, PatientPhysicalIconFindingId> = {
  pulse: 'pulse-strength',
  respiratory: 'respiratory-strength',
}

const RATE_PATTERN = /\d+(?:\.\d+)?/

export type PatientSnsMeasurementResult = {
  lines: ReadonlyArray<string>
  missingLabels: ReadonlyArray<string>
}

export function createPatientSnsFindingSnapshot(
  group: PatientSnsMeasurementGroupId,
  findings: PatientPhysicalFindings,
): PatientPhysicalFindings {
  const snapshot: PatientPhysicalFindings = {}
  for (const findingId of GROUP_FINDING_IDS[group]) {
    const value = findings[findingId]
    if (value) snapshot[findingId] = value
  }
  return snapshot
}

export function getPatientSnsObservedCount(
  rate: number,
  durationSeconds: 15 | 30,
): number {
  return Math.round((rate * durationSeconds) / 60)
}

function getNumericRate(value: string | undefined): number | null {
  if (!value) return null
  const match = value.match(RATE_PATTERN)
  if (!match) return null
  const rate = Number(match[0])
  return Number.isFinite(rate) ? rate : null
}

export function getPatientSnsMeasurementResult(
  group: PatientSnsMeasurementGroupId,
  snapshot: PatientPhysicalFindings,
): PatientSnsMeasurementResult {
  const rateValue = snapshot[RATE_FINDING_IDS[group]]
  const rhythmValue = snapshot[RHYTHM_FINDING_IDS[group]]
  const qualityValue = snapshot[QUALITY_FINDING_IDS[group]]
  const numericRate = getNumericRate(rateValue)
  const lines: string[] = []

  if (rateValue) {
    lines.push(group === 'pulse' ? `Rate: ${rateValue}` : `Respiratory: ${rateValue}`)
  }
  if (numericRate !== null) {
    const unit = group === 'pulse' ? 'beats' : 'breaths'
    lines.push(`15 sec = ${getPatientSnsObservedCount(numericRate, 15)} ${unit}`)
    lines.push(`30 sec = ${getPatientSnsObservedCount(numericRate, 30)} ${unit}`)
  }
  if (rhythmValue) {
    lines.push(group === 'pulse' ? `Rhythm: ${rhythmValue}` : rhythmValue)
  }
  if (qualityValue) {
    lines.push(group === 'pulse' ? `Strength: ${qualityValue}` : qualityValue)
  }

  const missingLabels: string[] = []
  if (!rateValue) missingLabels.push('Rate')
  if (!rhythmValue) missingLabels.push('Rhythm')
  if (!qualityValue) missingLabels.push(group === 'pulse' ? 'Strength' : 'Effort')

  return { lines, missingLabels }
}
