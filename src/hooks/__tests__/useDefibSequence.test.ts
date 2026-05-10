import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDefibSequence } from '../useDefibSequence'

describe('useDefibSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in idle with default joules for adult', () => {
    const { result } = renderHook(() =>
      useDefibSequence({ patientMode: 'adult' }),
    )
    expect(result.current.state).toBe('idle')
    expect(result.current.energy).toBe(120)
    expect(result.current.shockCount).toBe(0)
    expect(result.current.canAnalyse).toBe(true)
    expect(result.current.canCharge).toBe(true)
    expect(result.current.canShock).toBe(false)
  })

  it('uses pediatric joule default', () => {
    const { result } = renderHook(() =>
      useDefibSequence({ patientMode: 'pediatric' }),
    )
    expect(result.current.energy).toBe(50)
  })

  it('transitions idle → analysing → analysed', () => {
    const { result } = renderHook(() =>
      useDefibSequence({ patientMode: 'adult', analyseDurationMs: 1000 }),
    )
    act(() => result.current.onAnalyse())
    expect(result.current.state).toBe('analysing')
    expect(result.current.canAnalyse).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.state).toBe('analysed')
    expect(result.current.canCharge).toBe(true)
  })

  it('transitions analysed → charging → charged', () => {
    const { result } = renderHook(() =>
      useDefibSequence({
        patientMode: 'adult',
        analyseDurationMs: 100,
        chargeDurationMs: 200,
      }),
    )
    act(() => result.current.onAnalyse())
    act(() => {
      vi.advanceTimersByTime(100)
    })
    act(() => result.current.onCharge())
    expect(result.current.state).toBe('charging')
    expect(result.current.canShock).toBe(false)

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.state).toBe('charged')
    expect(result.current.canShock).toBe(true)
  })

  it('SHOCK increments counter and returns to idle', () => {
    const { result } = renderHook(() =>
      useDefibSequence({
        patientMode: 'adult',
        analyseDurationMs: 100,
        chargeDurationMs: 100,
      }),
    )
    act(() => result.current.onAnalyse())
    act(() => vi.advanceTimersByTime(100))
    act(() => result.current.onCharge())
    act(() => vi.advanceTimersByTime(100))
    expect(result.current.canShock).toBe(true)

    act(() => result.current.onShock())
    expect(result.current.shockCount).toBe(1)
    expect(result.current.state).toBe('idle')
    expect(result.current.canShock).toBe(false)
  })

  it('ignores out-of-order presses', () => {
    const { result } = renderHook(() =>
      useDefibSequence({ patientMode: 'adult' }),
    )
    act(() => result.current.onShock())
    expect(result.current.shockCount).toBe(0)
    expect(result.current.state).toBe('idle')
  })

  it('energy up/down adjusts in 10J steps and clamps at 10J min', () => {
    const { result } = renderHook(() =>
      useDefibSequence({ patientMode: 'pediatric' }),
    )
    expect(result.current.energy).toBe(50)
    act(() => result.current.onEnergyUp())
    expect(result.current.energy).toBe(60)
    act(() => result.current.onEnergyDown())
    act(() => result.current.onEnergyDown())
    expect(result.current.energy).toBe(40)
    for (let i = 0; i < 10; i++) act(() => result.current.onEnergyDown())
    expect(result.current.energy).toBe(10)
  })

  it('blocks energy adjustment during analysing/charging', () => {
    const { result } = renderHook(() =>
      useDefibSequence({ patientMode: 'adult', analyseDurationMs: 1000 }),
    )
    act(() => result.current.onAnalyse())
    expect(result.current.canAdjustEnergy).toBe(false)
    const before = result.current.energy
    act(() => result.current.onEnergyUp())
    expect(result.current.energy).toBe(before)
  })

  it('updates energy when patientMode changes', () => {
    const { result, rerender } = renderHook(
      ({ mode }: { mode: 'adult' | 'pediatric' | 'neonate' }) =>
        useDefibSequence({ patientMode: mode }),
      { initialProps: { mode: 'adult' as const } },
    )
    expect(result.current.energy).toBe(120)
    rerender({ mode: 'neonate' })
    expect(result.current.energy).toBe(10)
  })
})
