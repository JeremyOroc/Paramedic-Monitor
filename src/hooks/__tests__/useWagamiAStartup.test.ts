import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PowerState } from '@/components/monitor/DeviceShell'
import {
  WAGAMI_A_STARTUP_MS,
  useProjectedWagamiAPowerState,
  useWagamiAStartup,
} from '../useWagamiAStartup'

describe('useWagamiAStartup', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('becomes ready at exactly three seconds and records readiness once', () => {
    const onReady = vi.fn()
    const { result } = renderHook(() => {
      const [powerState, setPowerState] = useState<PowerState>('off')
      const startup = useWagamiAStartup({ powerState, setPowerState, onReady })
      return { powerState, ...startup }
    })

    act(() => result.current.start())
    expect(result.current.powerState).toBe('booting')
    expect(result.current.startupEndsAt).toBe(Date.now() + WAGAMI_A_STARTUP_MS)
    act(() => vi.advanceTimersByTime(2999))
    expect(result.current.powerState).toBe('booting')
    expect(onReady).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.powerState).toBe('on')
    expect(result.current.startupEndsAt).toBeNull()
    expect(onReady).toHaveBeenCalledOnce()
  })

  it('cancels without readiness and starts a fresh deadline on the next press', () => {
    const onReady = vi.fn()
    const { result } = renderHook(() => {
      const [powerState, setPowerState] = useState<PowerState>('off')
      const startup = useWagamiAStartup({ powerState, setPowerState, onReady })
      return { powerState, ...startup }
    })

    act(() => result.current.start())
    act(() => vi.advanceTimersByTime(1200))
    act(() => result.current.cancel())
    expect(result.current.powerState).toBe('off')
    expect(result.current.startupEndsAt).toBeNull()
    act(() => vi.advanceTimersByTime(5000))
    expect(onReady).not.toHaveBeenCalled()

    act(() => result.current.start())
    act(() => vi.advanceTimersByTime(WAGAMI_A_STARTUP_MS))
    expect(result.current.powerState).toBe('on')
    expect(onReady).toHaveBeenCalledOnce()
  })

  it('does not invoke readiness after unmount', () => {
    const onReady = vi.fn()
    const { result, unmount } = renderHook(() => {
      const [powerState, setPowerState] = useState<PowerState>('off')
      return useWagamiAStartup({ powerState, setPowerState, onReady })
    })
    act(() => result.current.start())
    unmount()
    act(() => vi.advanceTimersByTime(WAGAMI_A_STARTUP_MS))
    expect(onReady).not.toHaveBeenCalled()
  })
})

describe('useProjectedWagamiAPowerState', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('joins an active startup at its absolute deadline instead of restarting it', () => {
    const deadline = Date.now() + 1250
    const { result } = renderHook(() => useProjectedWagamiAPowerState('booting', deadline))
    expect(result.current).toBe('booting')
    act(() => vi.advanceTimersByTime(1249))
    expect(result.current).toBe('booting')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('on')
  })

  it('immediately catches up an expired projected startup', () => {
    const { result } = renderHook(() => useProjectedWagamiAPowerState('booting', Date.now() - 1))
    act(() => vi.advanceTimersByTime(0))
    expect(result.current).toBe('on')
  })
})
