import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMonitorClock } from '../useMonitorClock'
import { EMPTY_MONITOR_CLOCK } from '@/lib/monitorClock'

describe('useMonitorClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts empty and populates after the first tick', () => {
    const { result } = renderHook(() => useMonitorClock())
    expect(result.current.time).toBe(EMPTY_MONITOR_CLOCK.time)

    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current.time).not.toBe(EMPTY_MONITOR_CLOCK.time)
    expect(result.current.date).not.toBe(EMPTY_MONITOR_CLOCK.date)
  })

  it('keeps ticking on the interval', () => {
    const { result } = renderHook(() => useMonitorClock())
    act(() => {
      vi.advanceTimersByTime(0)
    })
    const first = result.current.time
    expect(first).not.toBe(EMPTY_MONITOR_CLOCK.time)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    // Still a valid HH:MM:SS string after the interval fires.
    expect(result.current.time).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})
