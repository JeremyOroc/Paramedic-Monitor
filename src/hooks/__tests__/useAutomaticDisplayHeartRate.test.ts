import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  deterministicTorsadesHeartRate,
  getTorsadesPacketDurationMs,
  VITAL_ALARM_FLASH_MS,
} from '@/lib/automaticHeartRate'
import { useAutomaticDisplayHeartRate } from '@/hooks/useAutomaticDisplayHeartRate'

describe('useAutomaticDisplayHeartRate', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('uses local inclusive random values once per flash cycle', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(1)
    const { result } = renderHook(() =>
      useAutomaticDisplayHeartRate({
        enabled: true,
        rhythm: 'vf',
        underlyingHeartRate: 190,
      }),
    )

    expect(result.current).toBe(190)
    act(() => vi.advanceTimersByTime(VITAL_ALARM_FLASH_MS))
    expect(result.current).toBe(220)
  })

  it('keeps two clients on the same server-timestamped sequence', () => {
    vi.useFakeTimers()
    vi.setSystemTime(12_500)
    const sync = { seed: 42, epochMs: 10_000, serverOffsetMs: 0 }
    const first = renderHook(() =>
      useAutomaticDisplayHeartRate({
        enabled: true,
        rhythm: 'vf',
        underlyingHeartRate: 190,
        sync,
      }),
    )
    const second = renderHook(() =>
      useAutomaticDisplayHeartRate({
        enabled: true,
        rhythm: 'vf',
        underlyingHeartRate: 190,
        sync,
      }),
    )

    expect(first.result.current).toBe(second.result.current)
    act(() => vi.advanceTimersByTime(VITAL_ALARM_FLASH_MS))
    expect(first.result.current).toBe(second.result.current)
  })

  it('returns the underlying override while VF randomization is disabled', () => {
    const { result } = renderHook(() =>
      useAutomaticDisplayHeartRate({
        enabled: false,
        rhythm: 'vf',
        underlyingHeartRate: 120,
      }),
    )
    expect(result.current).toBe(120)
  })

  it('holds one synchronized Torsades value until its packet ends', () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const sync = { seed: 42, epochMs: 10_000, serverOffsetMs: 0 }
    const firstRate = deterministicTorsadesHeartRate(sync.seed, 0)
    const secondRate = deterministicTorsadesHeartRate(sync.seed, 1)
    const { result } = renderHook(() =>
      useAutomaticDisplayHeartRate({
        enabled: true,
        rhythm: 'torsades',
        underlyingHeartRate: 150,
        sync,
      }),
    )

    act(() => vi.advanceTimersByTime(0))
    expect(result.current).toBe(firstRate)
    act(() => vi.advanceTimersByTime(getTorsadesPacketDurationMs(firstRate) - 1))
    expect(result.current).toBe(firstRate)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(secondRate)
  })

  it('uses the locked underlying value for non-dynamic automatic rhythms', () => {
    const { result } = renderHook(() =>
      useAutomaticDisplayHeartRate({
        enabled: true,
        rhythm: 'third-degree',
        underlyingHeartRate: 60,
      }),
    )
    expect(result.current).toBe(60)
  })
})
