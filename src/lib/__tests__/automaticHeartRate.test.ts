import { describe, expect, it } from 'vitest'

import {
  deterministicVfHeartRate,
  getAutomaticHeartRate,
  getVfFlashIndex,
  randomVfHeartRate,
  VITAL_ALARM_FLASH_MS,
} from '@/lib/automaticHeartRate'

describe('automatic heart rate', () => {
  it('maps VF and VT to their fixed underlying rates', () => {
    expect(getAutomaticHeartRate('vf')).toBe(190)
    expect(getAutomaticHeartRate('vt')).toBe(220)
    expect(getAutomaticHeartRate('nsr')).toBeNull()
  })

  it('generates inclusive whole-number VF endpoints', () => {
    expect(randomVfHeartRate(() => 0)).toBe(190)
    expect(randomVfHeartRate(() => 1)).toBe(220)
  })

  it('returns the same bounded deterministic value for the same room flash', () => {
    const first = deterministicVfHeartRate(7, 12)
    const second = deterministicVfHeartRate(7, 12)
    expect(second).toBe(first)
    expect(first).toBeGreaterThanOrEqual(190)
    expect(first).toBeLessThanOrEqual(220)
  })

  it('derives flash indexes from the server-adjusted 1.9-second clock', () => {
    const sync = { seed: 1, epochMs: 10_000, serverOffsetMs: 500 }
    expect(getVfFlashIndex(sync, 9_500)).toBe(0)
    expect(getVfFlashIndex(sync, 9_500 + VITAL_ALARM_FLASH_MS)).toBe(1)
  })
})
