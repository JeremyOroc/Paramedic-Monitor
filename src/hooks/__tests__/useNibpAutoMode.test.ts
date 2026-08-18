import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNibpAutoMode } from '../useNibpAutoMode'

describe('useNibpAutoMode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits a full interval and then triggers recurring readings', () => {
    const onTrigger = vi.fn()
    renderHook(() =>
      useNibpAutoMode({
        enabled: true,
        intervalMinutes: 1,
        readingActive: false,
        onTrigger,
      }),
    )

    act(() => { vi.advanceTimersByTime(59_999) })
    expect(onTrigger).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(onTrigger).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(onTrigger).toHaveBeenCalledTimes(2)
  })

  it('manual trigger runs immediately and restarts the automatic deadline', () => {
    const onTrigger = vi.fn()
    const { result } = renderHook(() =>
      useNibpAutoMode({
        enabled: true,
        intervalMinutes: 1,
        readingActive: false,
        onTrigger,
      }),
    )

    act(() => { vi.advanceTimersByTime(30_000) })
    act(() => result.current.handleManualTrigger())
    expect(onTrigger).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(30_000) })
    expect(onTrigger).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(30_000) })
    expect(onTrigger).toHaveBeenCalledTimes(2)
  })

  it('changing the interval restarts the deadline with the new value', () => {
    const onTrigger = vi.fn()
    const { rerender } = renderHook(
      ({ intervalMinutes }: { intervalMinutes: 1 | 2 }) =>
        useNibpAutoMode({
          enabled: true,
          intervalMinutes,
          readingActive: false,
          onTrigger,
        }),
      { initialProps: { intervalMinutes: 1 as 1 | 2 } },
    )

    act(() => { vi.advanceTimersByTime(30_000) })
    rerender({ intervalMinutes: 2 })
    act(() => { vi.advanceTimersByTime(119_999) })
    expect(onTrigger).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('skips a busy reading without cancelling it and tries again next interval', () => {
    const onTrigger = vi.fn()
    const { rerender } = renderHook(
      ({ readingActive }: { readingActive: boolean }) =>
        useNibpAutoMode({
          enabled: true,
          intervalMinutes: 1,
          readingActive,
          onTrigger,
        }),
      { initialProps: { readingActive: true } },
    )

    act(() => { vi.advanceTimersByTime(60_000) })
    expect(onTrigger).not.toHaveBeenCalled()
    rerender({ readingActive: false })
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('stays dormant while disabled and starts a fresh interval when enabled', () => {
    const onTrigger = vi.fn()
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useNibpAutoMode({
          enabled,
          intervalMinutes: 1,
          readingActive: false,
          onTrigger,
        }),
      { initialProps: { enabled: false } },
    )

    act(() => { vi.advanceTimersByTime(180_000) })
    expect(onTrigger).not.toHaveBeenCalled()
    rerender({ enabled: true })
    act(() => { vi.advanceTimersByTime(59_999) })
    expect(onTrigger).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('clears scheduling when disabled or unmounted', () => {
    const onTrigger = vi.fn()
    const { rerender, unmount } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useNibpAutoMode({
          enabled,
          intervalMinutes: 1,
          readingActive: false,
          onTrigger,
        }),
      { initialProps: { enabled: true } },
    )

    rerender({ enabled: false })
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(onTrigger).not.toHaveBeenCalled()

    rerender({ enabled: true })
    unmount()
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(onTrigger).not.toHaveBeenCalled()
  })
})
