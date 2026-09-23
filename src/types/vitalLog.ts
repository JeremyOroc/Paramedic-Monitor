export const VITAL_LOG_INTERVALS = [1, 3, 5, 10, 15, 30] as const

export type VitalLogInterval = (typeof VITAL_LOG_INTERVALS)[number]

export const DEFAULT_VITAL_LOG_INTERVAL: VitalLogInterval = 5

export function isVitalLogInterval(value: unknown): value is VitalLogInterval {
  return typeof value === 'number' && VITAL_LOG_INTERVALS.includes(value as VitalLogInterval)
}
