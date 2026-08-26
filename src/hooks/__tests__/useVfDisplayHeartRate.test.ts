import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { VITAL_ALARM_FLASH_MS } from '@/lib/automaticHeartRate'
import { useVfDisplayHeartRate } from '@/hooks/useVfDisplayHeartRate'

describe('useVfDisplayHeartRate', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('uses local inclusive random values once per flash cycle', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(1)
    const { result } = renderHook(() =>
      useVfDisplayHeartRate({ enabled: true, underlyingHeartRate: 190 }),
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
      useVfDisplayHeartRate({ enabled: true, underlyingHeartRate: 190, sync }),
    )
    const second = renderHook(() =>
      useVfDisplayHeartRate({ enabled: true, underlyingHeartRate: 190, sync }),
    )

    expect(first.result.current).toBe(second.result.current)
    act(() => vi.advanceTimersByTime(VITAL_ALARM_FLASH_MS))
    expect(first.result.current).toBe(second.result.current)
  })

  it('returns the underlying override while VF randomization is disabled', () => {
    const { result } = renderHook(() =>
      useVfDisplayHeartRate({ enabled: false, underlyingHeartRate: 120 }),
    )
    expect(result.current).toBe(120)
  })
})
