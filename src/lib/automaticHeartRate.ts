import type { Rhythm } from '@/types/vitals'

export const VF_HEART_RATE_MIN = 190
export const VF_HEART_RATE_MAX = 220
export const VF_UNDERLYING_HEART_RATE = VF_HEART_RATE_MIN
export const VT_HEART_RATE = 220
export const VITAL_ALARM_FLASH_MS = 1900

export type AutomaticHeartRateRhythm = Extract<Rhythm, 'vf' | 'vt'>

export type VfDisplaySync = {
  seed: number
  epochMs: number
  serverOffsetMs: number
}

export function isAutomaticHeartRateRhythm(
  rhythm: Rhythm,
): rhythm is AutomaticHeartRateRhythm {
  return rhythm === 'vf' || rhythm === 'vt'
}

export function getAutomaticHeartRate(rhythm: Rhythm): number | null {
  if (rhythm === 'vf') return VF_UNDERLYING_HEART_RATE
  if (rhythm === 'vt') return VT_HEART_RATE
  return null
}

export function randomVfHeartRate(random: () => number = Math.random): number {
  const range = VF_HEART_RATE_MAX - VF_HEART_RATE_MIN + 1
  const sample = Math.min(1 - Number.EPSILON, Math.max(0, random()))
  return VF_HEART_RATE_MIN + Math.floor(sample * range)
}

export function deterministicVfHeartRate(seed: number, flashIndex: number): number {
  let value = (seed ^ Math.imul(Math.max(0, flashIndex) + 1, 0x9e3779b1)) >>> 0
  value ^= value >>> 16
  value = Math.imul(value, 0x85ebca6b) >>> 0
  value ^= value >>> 13
  value = Math.imul(value, 0xc2b2ae35) >>> 0
  value ^= value >>> 16
  return VF_HEART_RATE_MIN + (value % (VF_HEART_RATE_MAX - VF_HEART_RATE_MIN + 1))
}

export function getVfFlashIndex(sync: VfDisplaySync, clientNowMs: number): number {
  const serverNowMs = clientNowMs + sync.serverOffsetMs
  return Math.max(0, Math.floor((serverNowMs - sync.epochMs) / VITAL_ALARM_FLASH_MS))
}
