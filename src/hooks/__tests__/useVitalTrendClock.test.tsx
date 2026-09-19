import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useVitalTrendClock } from '@/hooks/useVitalTrendClock'
import { useMonitorStore } from '@/store/monitorStore'

describe('useVitalTrendClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-19T12:00:00.000Z'))
    useMonitorStore.getState().reset()
    const store = useMonitorStore.getState()
    store.setDraft('hr', 120)
    store.save()
    store.send()
    store.setVitalTrendTarget('hr', 150)
    store.setVitalTrendSeconds(30)
    store.save()
    store.send()
  })

  afterEach(() => vi.useRealTimers())

  it('advances from absolute time and reaches the exact target', () => {
    renderHook(() => useVitalTrendClock())

    act(() => vi.advanceTimersByTime(15_000))
    expect(useMonitorStore.getState().confirmed.hr).toBe(135)

    act(() => vi.advanceTimersByTime(15_000))
    expect(useMonitorStore.getState().confirmed.hr).toBe(150)
    expect(useMonitorStore.getState().activeVitalTrend?.status).toBe('complete')
  })
})
