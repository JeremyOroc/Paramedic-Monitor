import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useCountdown } from '../useCountdown'

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 00:00 and not-done when endsAt is null', () => {
    const { result } = renderHook(() => useCountdown(null))
    expect(result.current.formatted).toBe('00:00')
    expect(result.current.isDone).toBe(false)
  })

  it('counts down from an absolute end timestamp, including > 9 minutes', () => {
    const { result } = renderHook(() => useCountdown(10 * 60_000)) // 10:00 from t=0
    expect(result.current.formatted).toBe('10:00')
    expect(result.current.isDone).toBe(false)

    act(() => {
      vi.advanceTimersByTime(61_000)
    })
    expect(result.current.formatted).toBe('08:59')
  })

  it('is immediately done when endsAt is already in the past', () => {
    vi.setSystemTime(60_000)
    const { result } = renderHook(() => useCountdown(0))
    expect(result.current.formatted).toBe('00:00')
    expect(result.current.isDone).toBe(true)
  })

  it('resumes from real remaining time when re-mounted with the same endsAt (refresh)', () => {
    const endsAt = 5 * 60_000
    const first = renderHook(() => useCountdown(endsAt))
    expect(first.result.current.formatted).toBe('05:00')

    // Simulate time passing then a page refresh (fresh mount, same endsAt).
    act(() => {
      vi.advanceTimersByTime(90_000)
    })
    first.unmount()

    const second = renderHook(() => useCountdown(endsAt))
    expect(second.result.current.formatted).toBe('03:30')
  })
})
