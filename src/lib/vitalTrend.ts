import type { NumericVitalField } from '@/types/vitals'
import {
  EMPTY_VITAL_TREND_CONFIGURATION,
  EMPTY_VITAL_TREND_TARGETS,
  type ActiveVitalTrend,
  type VitalTrendConfiguration,
  type VitalTrendParticipant,
  type VitalTrendTargets,
} from '@/types/vitalTrend'

export const VITAL_TREND_FIELDS: readonly NumericVitalField[] = [
  'hr',
  'spo2',
  'bp_sys',
  'bp_dia',
  'etco2',
]

export const VITAL_TREND_RANGES: Record<
  NumericVitalField,
  { min: number; max: number }
> = {
  hr: { min: 0, max: 300 },
  spo2: { min: 0, max: 100 },
  bp_sys: { min: 0, max: 300 },
  bp_dia: { min: 0, max: 300 },
  etco2: { min: 0, max: 150 },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function createEmptyVitalTrendConfiguration(): VitalTrendConfiguration {
  return {
    targets: { ...EMPTY_VITAL_TREND_TARGETS },
    durationSeconds: EMPTY_VITAL_TREND_CONFIGURATION.durationSeconds,
  }
}

export function normalizeVitalTrendConfiguration(
  value: unknown,
): VitalTrendConfiguration {
  if (!isRecord(value)) return createEmptyVitalTrendConfiguration()
  const rawTargets = isRecord(value.targets) ? value.targets : {}
  const targets = { ...EMPTY_VITAL_TREND_TARGETS }
  for (const field of VITAL_TREND_FIELDS) {
    const candidate = rawTargets[field]
    const range = VITAL_TREND_RANGES[field]
    targets[field] =
      candidate === null || candidate === undefined
        ? null
        : typeof candidate === 'number' &&
            Number.isInteger(candidate) &&
            candidate >= range.min &&
            candidate <= range.max
          ? candidate
          : null
  }
  return {
    targets,
    durationSeconds:
      typeof value.durationSeconds === 'number' &&
      Number.isInteger(value.durationSeconds) &&
      value.durationSeconds >= 0
        ? value.durationSeconds
        : 0,
  }
}

export function vitalTrendConfigurationsEqual(
  left: VitalTrendConfiguration,
  right: VitalTrendConfiguration,
): boolean {
  return (
    left.durationSeconds === right.durationSeconds &&
    VITAL_TREND_FIELDS.every((field) => left.targets[field] === right.targets[field])
  )
}

export function isValidVitalTrendTarget(
  field: NumericVitalField,
  value: number | null,
): boolean {
  if (value === null) return true
  const range = VITAL_TREND_RANGES[field]
  return Number.isInteger(value) && value >= range.min && value <= range.max
}

export function isValidVitalTrendConfiguration(
  configuration: VitalTrendConfiguration,
): boolean {
  return (
    Number.isInteger(configuration.durationSeconds) &&
    configuration.durationSeconds >= 0 &&
    VITAL_TREND_FIELDS.every((field) =>
      isValidVitalTrendTarget(field, configuration.targets[field]),
    )
  )
}

export function buildVitalTrendParticipants(
  targets: VitalTrendTargets,
  starts: Record<NumericVitalField, number>,
  excluded: ReadonlySet<NumericVitalField> = new Set(),
): Partial<Record<NumericVitalField, VitalTrendParticipant>> {
  const participants: Partial<Record<NumericVitalField, VitalTrendParticipant>> = {}
  for (const field of VITAL_TREND_FIELDS) {
    const target = targets[field]
    const start = starts[field]
    if (excluded.has(field) || target === null || target === start) continue
    participants[field] = { start, target }
  }
  return participants
}

export function deriveVitalTrendValues(
  trend: ActiveVitalTrend,
  now: number,
): Partial<Record<NumericVitalField, number>> {
  const durationMs = Math.max(0, trend.endsAt - trend.startsAt)
  const elapsedMs = Math.max(0, Math.min(durationMs, now - trend.startsAt))
  const steppedElapsedMs =
    now >= trend.endsAt ? durationMs : Math.floor(elapsedMs / 1000) * 1000
  const progress = durationMs === 0 ? 1 : steppedElapsedMs / durationMs
  const values: Partial<Record<NumericVitalField, number>> = {}

  for (const field of VITAL_TREND_FIELDS) {
    const participant = trend.participants[field]
    if (!participant) continue
    values[field] =
      progress >= 1
        ? participant.target
        : Math.round(
            participant.start + (participant.target - participant.start) * progress,
          )
  }
  return values
}

export function vitalTrendSecondsLeft(
  trend: ActiveVitalTrend | null,
  now: number,
): number {
  if (!trend || trend.status !== 'running') return 0
  return Math.max(0, Math.ceil((trend.endsAt - now) / 1000))
}

export function normalizeActiveVitalTrend(value: unknown): ActiveVitalTrend | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'string' ||
    typeof value.startsAt !== 'number' ||
    typeof value.endsAt !== 'number' ||
    !Number.isFinite(value.startsAt) ||
    !Number.isFinite(value.endsAt) ||
    !isRecord(value.participants)
  ) {
    return null
  }
  const status =
    value.status === 'complete' || value.status === 'cancelled'
      ? value.status
      : 'running'
  const participants: ActiveVitalTrend['participants'] = {}
  for (const field of VITAL_TREND_FIELDS) {
    const raw = value.participants[field]
    if (!isRecord(raw)) continue
    if (
      typeof raw.start !== 'number' ||
      !Number.isFinite(raw.start) ||
      !isValidVitalTrendTarget(field, raw.target as number | null)
    ) {
      continue
    }
    if (typeof raw.target !== 'number') continue
    participants[field] = { start: raw.start, target: raw.target }
  }
  if (Object.keys(participants).length === 0 && status === 'running') return null
  return {
    id: value.id,
    participants,
    startsAt: value.startsAt,
    endsAt: Math.max(value.startsAt, value.endsAt),
    status,
    completedAt:
      typeof value.completedAt === 'number' && Number.isFinite(value.completedAt)
        ? value.completedAt
        : null,
    completionPublished: value.completionPublished === true,
  }
}
