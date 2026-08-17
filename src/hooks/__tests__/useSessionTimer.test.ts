import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionTimer } from '../useSessionTimer'

describe('useSessionTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exposes matching formatted and numeric elapsed time', () => {
    const { result } = renderHook(() => useSessionTimer(true))

    expect(result.current).toEqual({ formatted: '00:00:00', elapsedSeconds: 0 })

    act(() => {
      vi.advanceTimersByTime(300_000)
    })

    expect(result.current).toEqual({ formatted: '00:05:00', elapsedSeconds: 300 })
  })

  it('resets both timer representations when stopped', () => {
    const { result, rerender } = renderHook(
      ({ running }) => useSessionTimer(running),
      { initialProps: { running: true } },
    )

    act(() => {
      vi.advanceTimersByTime(301_000)
    })
    expect(result.current.elapsedSeconds).toBe(301)

    rerender({ running: false })

    expect(result.current).toEqual({ formatted: '00:00:00', elapsedSeconds: 0 })
  })
})
