import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useVitalLog, type VitalLogSnapshot } from '../useVitalLog'

const snapshot: VitalLogSnapshot = {
  fc: 80,
  pniSys: 120,
  pniDia: 80,
  etco2: 35,
  spo2: 98,
}

describe('useVitalLog', () => {
  it('takes its first immutable snapshot at five minutes', () => {
    const { result, rerender } = renderHook(
      (props: { elapsedSeconds: number; snapshot: VitalLogSnapshot }) =>
        useVitalLog({ ...props, isRunning: true }),
      { initialProps: { elapsedSeconds: 299, snapshot } },
    )

    expect(result.current).toEqual([])

    rerender({ elapsedSeconds: 300, snapshot })
    expect(result.current).toEqual([{ timestamp: '00:05:00', ...snapshot }])

    rerender({ elapsedSeconds: 450, snapshot: { ...snapshot, fc: 130 } })
    expect(result.current[0].fc).toBe(80)
  })

  it('adds every crossed boundary with the freshest available snapshot', () => {
    const latest = { ...snapshot, fc: 120, pniDia: null, etco2: null }
    const { result, rerender } = renderHook(
      ({ elapsedSeconds }) =>
        useVitalLog({ elapsedSeconds, isRunning: true, snapshot: latest }),
      { initialProps: { elapsedSeconds: 0 } },
    )

    rerender({ elapsedSeconds: 901 })

    expect(result.current).toEqual([
      { timestamp: '00:05:00', ...latest },
      { timestamp: '00:10:00', ...latest },
      { timestamp: '00:15:00', ...latest },
    ])
  })

  it('preserves null values for independent unavailable channels', () => {
    const unavailable: VitalLogSnapshot = {
      fc: 120,
      pniSys: 118,
      pniDia: null,
      etco2: null,
      spo2: null,
    }
    const { result } = renderHook(() =>
      useVitalLog({ elapsedSeconds: 300, isRunning: true, snapshot: unavailable }),
    )

    expect(result.current[0]).toEqual({ timestamp: '00:05:00', ...unavailable })
  })

  it('clears and restarts its boundary schedule when the timer stops', () => {
    const { result, rerender } = renderHook(
      (props: { elapsedSeconds: number; isRunning: boolean }) =>
        useVitalLog({ ...props, snapshot }),
      { initialProps: { elapsedSeconds: 300, isRunning: true } },
    )
    expect(result.current).toHaveLength(1)

    act(() => {
      rerender({ elapsedSeconds: 0, isRunning: false })
    })
    expect(result.current).toEqual([])

    rerender({ elapsedSeconds: 300, isRunning: true })
    expect(result.current).toEqual([{ timestamp: '00:05:00', ...snapshot }])
  })
})
