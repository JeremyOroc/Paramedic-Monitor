import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCPRTimer } from '../useCPRTimer'

describe('useCPRTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-10T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts down from 2:00 after one elapsed second', () => {
    const startedAt = Date.now()
    const { result } = renderHook(() => useCPRTimer(startedAt))

    expect(result.current).toEqual({ formatted: '2:00', isDone: false })

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toEqual({ formatted: '1:59', isDone: false })
  })

  it('catches up from its absolute start, completes, and resets when inactive', () => {
    const startedAt = Date.now() - 75_000
    const { result, rerender } = renderHook(
      ({ startTime }: { startTime: number | null }) => useCPRTimer(startTime),
      {
        initialProps: { startTime: startedAt } as { startTime: number | null },
      },
    )

    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toEqual({ formatted: '0:45', isDone: false })

    act(() => {
      vi.advanceTimersByTime(45_000)
    })
    expect(result.current).toEqual({ formatted: '0:00', isDone: true })

    rerender({ startTime: null })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toEqual({ formatted: '2:00', isDone: false })
  })
})
