import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { pauseAlarm, playAlarm } from '@/lib/audio'

import { useAlarm } from '../useAlarm'

vi.mock('@/lib/audio', () => ({
  pauseAlarm: vi.fn(),
  playAlarm: vi.fn(),
}))

const healthyVitals = {
  hr: 80,
  bp_sys: 120,
  bp_dia: 80,
  spo2: 98,
}

describe('useAlarm', () => {
  beforeEach(() => {
    vi.mocked(playAlarm).mockClear()
    vi.mocked(pauseAlarm).mockClear()
  })

  it('plays one looping alarm while any vital is alarming', () => {
    const { result, rerender } = renderHook((vitals) => useAlarm(vitals), {
      initialProps: { ...healthyVitals, hr: 141 },
    })

    expect(result.current.activeAlarms).toEqual(['hr'])
    expect(result.current.isAlarming).toBe(true)
    expect(playAlarm).toHaveBeenCalledTimes(1)

    rerender({ ...healthyVitals, hr: 150, spo2: 80 })

    expect(result.current.activeAlarms).toEqual(['hr', 'spo2'])
    expect(playAlarm).toHaveBeenCalledTimes(1)
  })

  it('pauses when all vitals return to range', () => {
    const { result, rerender } = renderHook((vitals) => useAlarm(vitals), {
      initialProps: { ...healthyVitals, bp_sys: 201 },
    })

    expect(result.current.isAlarming).toBe(true)
    rerender(healthyVitals)

    expect(result.current.activeAlarms).toEqual([])
    expect(result.current.isAlarming).toBe(false)
    expect(pauseAlarm).toHaveBeenCalled()
  })

  it('stays silent and returns no active alarms while vitals are not active', () => {
    const { result } = renderHook(() =>
      useAlarm({ ...healthyVitals, hr: 0, spo2: 0 }, true, false, true, {
        hr: false,
        bp_sys: false,
        bp_dia: false,
        spo2: false,
      }),
    )

    expect(result.current.activeAlarms).toEqual([])
    expect(result.current.isAlarming).toBe(false)
    expect(playAlarm).not.toHaveBeenCalled()
    expect(pauseAlarm).toHaveBeenCalled()
  })

  it('alarms active zero values per vital', () => {
    const { result } = renderHook(() =>
      useAlarm({ ...healthyVitals, hr: 0, spo2: 0 }, true, false, true, {
        hr: true,
        bp_sys: false,
        bp_dia: false,
        spo2: false,
      }),
    )

    expect(result.current.activeAlarms).toEqual(['hr'])
    expect(result.current.isAlarming).toBe(true)
    expect(playAlarm).toHaveBeenCalled()
  })
})
