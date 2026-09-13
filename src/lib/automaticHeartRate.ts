import type { Rhythm } from '@/types/vitals'

export const VF_HEART_RATE_MIN = 190
export const VF_HEART_RATE_MAX = 220
export const VF_UNDERLYING_HEART_RATE = VF_HEART_RATE_MIN
export const VT_HEART_RATE = 220
export const TORSADES_HEART_RATE_MIN = 150
export const TORSADES_HEART_RATE_MAX = 250
export const TORSADES_UNDERLYING_HEART_RATE = TORSADES_HEART_RATE_MIN
export const TORSADES_COMPLEXES_PER_PACKET = 15
export const ASYSTOLE_HEART_RATE = 0
export const SECOND_DEGREE_TYPE_2_HEART_RATE = 80
export const THIRD_DEGREE_HEART_RATE = 60
export const VITAL_ALARM_FLASH_MS = 1900

export type AutomaticHeartRateRhythm = Extract<
  Rhythm,
  'vf' | 'vt' | 'torsades' | 'asystole' | 'second-degree-type-2' | 'third-degree'
>

export type HeartRateDisplaySync = {
  seed: number
  epochMs: number
  serverOffsetMs: number
}

export type TorsadesPacketState = {
  packetIndex: number
  heartRate: number
  startedAtMs: number
  endsAtMs: number
}

export function isAutomaticHeartRateRhythm(
  rhythm: Rhythm,
): rhythm is AutomaticHeartRateRhythm {
  return (
    rhythm === 'vf' ||
    rhythm === 'vt' ||
    rhythm === 'torsades' ||
    rhythm === 'asystole' ||
    rhythm === 'second-degree-type-2' ||
    rhythm === 'third-degree'
  )
}

export function getAutomaticHeartRate(rhythm: Rhythm): number | null {
  if (rhythm === 'vf') return VF_UNDERLYING_HEART_RATE
  if (rhythm === 'vt') return VT_HEART_RATE
  if (rhythm === 'torsades') return TORSADES_UNDERLYING_HEART_RATE
  if (rhythm === 'asystole') return ASYSTOLE_HEART_RATE
  if (rhythm === 'second-degree-type-2') return SECOND_DEGREE_TYPE_2_HEART_RATE
  if (rhythm === 'third-degree') return THIRD_DEGREE_HEART_RATE
  return null
}

export function isHeartRateToggleLockedRhythm(rhythm: Rhythm): boolean {
  return (
    rhythm === 'torsades' ||
    rhythm === 'asystole' ||
    rhythm === 'second-degree-type-2' ||
    rhythm === 'third-degree'
  )
}

export function randomVfHeartRate(random: () => number = Math.random): number {
  return randomHeartRateInRange(VF_HEART_RATE_MIN, VF_HEART_RATE_MAX, random)
}

export function deterministicVfHeartRate(seed: number, flashIndex: number): number {
  return deterministicHeartRateInRange(VF_HEART_RATE_MIN, VF_HEART_RATE_MAX, seed, flashIndex)
}

export function randomTorsadesHeartRate(random: () => number = Math.random): number {
  return randomHeartRateInRange(TORSADES_HEART_RATE_MIN, TORSADES_HEART_RATE_MAX, random)
}

export function deterministicTorsadesHeartRate(seed: number, packetIndex: number): number {
  return deterministicHeartRateInRange(
    TORSADES_HEART_RATE_MIN,
    TORSADES_HEART_RATE_MAX,
    seed,
    packetIndex,
  )
}

export function getTorsadesPacketDurationMs(heartRate: number): number {
  const boundedHeartRate = Math.min(
    TORSADES_HEART_RATE_MAX,
    Math.max(TORSADES_HEART_RATE_MIN, heartRate),
  )
  return Math.round((TORSADES_COMPLEXES_PER_PACKET * 60_000) / boundedHeartRate)
}

export function getTorsadesPacketState(
  sync: HeartRateDisplaySync,
  clientNowMs: number,
): TorsadesPacketState {
  const serverNowMs = clientNowMs + sync.serverOffsetMs
  let packetIndex = 0
  let startedAtMs = sync.epochMs

  while (true) {
    const heartRate = deterministicTorsadesHeartRate(sync.seed, packetIndex)
    const endsAtMs = startedAtMs + getTorsadesPacketDurationMs(heartRate)
    if (serverNowMs < endsAtMs) {
      return { packetIndex, heartRate, startedAtMs, endsAtMs }
    }
    packetIndex += 1
    startedAtMs = endsAtMs
  }
}

function randomHeartRateInRange(
  min: number,
  max: number,
  random: () => number,
): number {
  const range = max - min + 1
  const sample = Math.min(1 - Number.EPSILON, Math.max(0, random()))
  return min + Math.floor(sample * range)
}

function deterministicHeartRateInRange(
  min: number,
  max: number,
  seed: number,
  index: number,
): number {
  let value = (seed ^ Math.imul(Math.max(0, index) + 1, 0x9e3779b1)) >>> 0
  value ^= value >>> 16
  value = Math.imul(value, 0x85ebca6b) >>> 0
  value ^= value >>> 13
  value = Math.imul(value, 0xc2b2ae35) >>> 0
  value ^= value >>> 16
  return min + (value % (max - min + 1))
}

export function getVfFlashIndex(sync: HeartRateDisplaySync, clientNowMs: number): number {
  const serverNowMs = clientNowMs + sync.serverOffsetMs
  return Math.max(0, Math.floor((serverNowMs - sync.epochMs) / VITAL_ALARM_FLASH_MS))
}
