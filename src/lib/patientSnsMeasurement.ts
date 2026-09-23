import type {
  PatientPhysicalFindings,
  PatientPhysicalIconFindingId,
} from '@/lib/patientPhysicalAutoSort'
import type { PatientSnsMeasurementGroupId } from '@/types/patientPhysical'

const GROUP_FINDING_IDS: Record<
  PatientSnsMeasurementGroupId,
  ReadonlyArray<PatientPhysicalIconFindingId>
> = {
  pulse: ['pulse-rate', 'pulse-rhythm', 'pulse-strength', 'pulse-speed'],
  respiratory: [
    'respiratory-rate',
    'respiratory-rhythm',
    'respiratory-strength',
    'respiratory-speed',
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

const PULSE_SPEED_FINDING_ID: PatientPhysicalIconFindingId = 'pulse-speed'
const RESPIRATORY_SPEED_FINDING_ID: PatientPhysicalIconFindingId = 'respiratory-speed'

const RATE_PATTERN = /\d+(?:\.\d+)?/
const PULSE_SPEED_PATTERN = /\b(?:fast|normal|slow|rapid|tachycardic|bradycardic)\b/i

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

function getRateMatch(value: string | undefined): RegExpMatchArray | null {
  if (!value) return null
  return value.match(RATE_PATTERN)
}

function cleanPrefixedValue(value: string, labels: ReadonlyArray<string>): string {
  const prefix = new RegExp(`^(?:${labels.join('|')})\\s*:\\s*`, 'i')
  return value.trim().replace(prefix, '').trim()
}

function cleanRateFallback(value: string): string {
  return cleanPrefixedValue(value, ['rate', 'respiratory', 'respiration'])
    .replace(/\s*\(\s*(?:15|30)\s*sec\b.*$/i, '')
    .trim()
}

function normalizeDescriptor(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  return trimmed.toLocaleLowerCase()
}

function descriptorParts(value: string | undefined, labels: ReadonlyArray<string>): string[] {
  if (!value) return []
  return cleanPrefixedValue(value, labels)
    .split(/[,\n]/)
    .map(normalizeDescriptor)
    .filter(Boolean)
}

function uniqueDescriptors(parts: ReadonlyArray<string>): string[] {
  const seen = new Set<string>()
  return parts.filter((part) => {
    const key = part.toLocaleLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function joinDescriptors(parts: ReadonlyArray<string>): string | null {
  if (parts.length === 0) return null
  const joined = parts.join(', ')
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}`
}

function getDescriptorLine(
  group: PatientSnsMeasurementGroupId,
  rhythmValue: string | undefined,
  qualityValue: string | undefined,
  speedValue: string | undefined,
): string | null {
  const rhythm = descriptorParts(rhythmValue, ['rhythm'])
  const quality = descriptorParts(
    qualityValue,
    group === 'pulse' ? ['strength'] : ['effort', 'strength', 'depth'],
  )

  if (group === 'respiratory') {
    const speed = descriptorParts(speedValue, ['speed'])
    const descriptors = uniqueDescriptors([...quality, ...rhythm, ...speed])
    return joinDescriptors(descriptors)
  }

  const strength: string[] = []
  const embeddedSpeed: string[] = []
  for (const descriptor of quality) {
    if (PULSE_SPEED_PATTERN.test(descriptor)) embeddedSpeed.push(descriptor)
    else strength.push(descriptor)
  }
  const speed = descriptorParts(speedValue, ['speed'])
  const descriptors = uniqueDescriptors([...strength, ...rhythm, ...speed, ...embeddedSpeed])
  return joinDescriptors(descriptors)
}

export function getPatientSnsMeasurementResult(
  group: PatientSnsMeasurementGroupId,
  snapshot: PatientPhysicalFindings,
): PatientSnsMeasurementResult {
  const rateValue = snapshot[RATE_FINDING_IDS[group]]
  const rhythmValue = snapshot[RHYTHM_FINDING_IDS[group]]
  const qualityValue = snapshot[QUALITY_FINDING_IDS[group]]
  const speedValue =
    group === 'pulse'
      ? snapshot[PULSE_SPEED_FINDING_ID]
      : snapshot[RESPIRATORY_SPEED_FINDING_ID]
  const rateMatch = getRateMatch(rateValue)
  const numericRate = rateMatch ? Number(rateMatch[0]) : null
  const lines: string[] = []

  if (rateValue) {
    const displayRate = rateMatch
      ? group === 'pulse'
        ? `${rateMatch[0]}bpm`
        : `${rateMatch[0]} breaths/min`
      : cleanRateFallback(rateValue)
    lines.push(`Rate: ${displayRate}`)
  }
  if (numericRate !== null && Number.isFinite(numericRate)) {
    lines.push(`15 sec = ${getPatientSnsObservedCount(numericRate, 15)}`)
    lines.push(`30 sec = ${getPatientSnsObservedCount(numericRate, 30)}`)
  }
  const descriptorLine = getDescriptorLine(group, rhythmValue, qualityValue, speedValue)
  if (descriptorLine) lines.push(descriptorLine)

  const missingLabels: string[] = []
  if (!rateValue) missingLabels.push('Rate')
  if (!rhythmValue) missingLabels.push('Rhythm')
  if (!qualityValue) missingLabels.push(group === 'pulse' ? 'Strength' : 'Effort')

  return { lines, missingLabels }
}
