import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useElapsedTimer } from '../useElapsedTimer'

describe('useElapsedTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 00:00 when not started', () => {
    const { result } = renderHook(() => useElapsedTimer(null))
    expect(result.current.formatted).toBe('00:00')
    expect(result.current.secondsElapsed).toBe(0)
  })

  it('counts up from an absolute start timestamp', () => {
    const { result } = renderHook(() => useElapsedTimer(0))
    expect(result.current.formatted).toBe('00:00')

    act(() => {
      vi.advanceTimersByTime(61_000)
    })

    expect(result.current.formatted).toBe('01:01')
    expect(result.current.secondsElapsed).toBe(61)
  })

  it('resumes from real elapsed time when re-mounted with the same start', () => {
    const first = renderHook(() => useElapsedTimer(0))
    expect(first.result.current.formatted).toBe('00:00')

    act(() => {
      vi.advanceTimersByTime(90_000)
    })
    first.unmount()

    const second = renderHook(() => useElapsedTimer(0))
    expect(second.result.current.formatted).toBe('01:30')
  })
})
