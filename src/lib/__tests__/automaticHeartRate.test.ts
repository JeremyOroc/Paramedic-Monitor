import { describe, expect, it } from 'vitest'

import {
  deterministicTorsadesHeartRate,
  deterministicVfHeartRate,
  getAutomaticHeartRate,
  getTorsadesPacketDurationMs,
  getTorsadesPacketState,
  getVfFlashIndex,
  isHeartRateToggleLockedRhythm,
  randomTorsadesHeartRate,
  randomVfHeartRate,
  TORSADES_HEART_RATE_MAX,
  TORSADES_HEART_RATE_MIN,
  VITAL_ALARM_FLASH_MS,
} from '@/lib/automaticHeartRate'

describe('automatic heart rate', () => {
  it('maps automatic rhythms to their canonical stored rates', () => {
    expect(getAutomaticHeartRate('vf')).toBe(190)
    expect(getAutomaticHeartRate('vt')).toBe(220)
    expect(getAutomaticHeartRate('torsades')).toBe(150)
    expect(getAutomaticHeartRate('asystole')).toBe(0)
    expect(getAutomaticHeartRate('second-degree-type-2')).toBe(80)
    expect(getAutomaticHeartRate('third-degree')).toBe(60)
    expect(getAutomaticHeartRate('nsr')).toBeNull()
    expect(getAutomaticHeartRate('second-degree-type-1')).toBeNull()
  })

  it('locks the FC toggle for rhythm-owned FC locks without changing VF or VT', () => {
    expect(isHeartRateToggleLockedRhythm('asystole')).toBe(true)
    expect(isHeartRateToggleLockedRhythm('torsades')).toBe(true)
    expect(isHeartRateToggleLockedRhythm('second-degree-type-2')).toBe(true)
    expect(isHeartRateToggleLockedRhythm('third-degree')).toBe(true)
    expect(isHeartRateToggleLockedRhythm('vf')).toBe(false)
    expect(isHeartRateToggleLockedRhythm('vt')).toBe(false)
    expect(isHeartRateToggleLockedRhythm('second-degree-type-1')).toBe(false)
    expect(isHeartRateToggleLockedRhythm('off')).toBe(false)
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

  it('generates inclusive whole-number Torsades endpoints', () => {
    expect(randomTorsadesHeartRate(() => 0)).toBe(TORSADES_HEART_RATE_MIN)
    expect(randomTorsadesHeartRate(() => 1)).toBe(TORSADES_HEART_RATE_MAX)
  })

  it('keeps deterministic Torsades rates bounded and stable for each packet', () => {
    const first = deterministicTorsadesHeartRate(7, 12)
    const second = deterministicTorsadesHeartRate(7, 12)
    expect(second).toBe(first)
    expect(first).toBeGreaterThanOrEqual(TORSADES_HEART_RATE_MIN)
    expect(first).toBeLessThanOrEqual(TORSADES_HEART_RATE_MAX)
  })

  it('derives packet duration from 15 complexes at the selected Torsades FC', () => {
    expect(getTorsadesPacketDurationMs(150)).toBe(6000)
    expect(getTorsadesPacketDurationMs(250)).toBe(3600)
  })

  it('finds the synchronized variable-duration Torsades packet', () => {
    const sync = { seed: 17, epochMs: 10_000, serverOffsetMs: 500 }
    const firstRate = deterministicTorsadesHeartRate(sync.seed, 0)
    const firstDuration = getTorsadesPacketDurationMs(firstRate)

    expect(getTorsadesPacketState(sync, 9_500)).toMatchObject({
      packetIndex: 0,
      heartRate: firstRate,
      startedAtMs: 10_000,
      endsAtMs: 10_000 + firstDuration,
    })
    expect(getTorsadesPacketState(sync, 9_500 + firstDuration)).toMatchObject({
      packetIndex: 1,
      startedAtMs: 10_000 + firstDuration,
    })
  })

  it('derives flash indexes from the server-adjusted 1.9-second clock', () => {
    const sync = { seed: 1, epochMs: 10_000, serverOffsetMs: 500 }
    expect(getVfFlashIndex(sync, 9_500)).toBe(0)
    expect(getVfFlashIndex(sync, 9_500 + VITAL_ALARM_FLASH_MS)).toBe(1)
  })
})
