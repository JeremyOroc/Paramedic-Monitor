import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePatientSnsMeasurements } from '@/hooks/usePatientSnsMeasurements'

describe('usePatientSnsMeasurements', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs Pulse and Respiratory countdowns independently to their real deadlines', () => {
    const onResult = vi.fn()
    const { result } = renderHook(() => usePatientSnsMeasurements(onResult))

    act(() => {
      result.current.startMeasurement('pulse', 15, {
        'pulse-rate': '98 bpm',
        'pulse-rhythm': 'Regular',
        'pulse-strength': 'Moderate',
        'pulse-speed': 'Fast',
      })
      result.current.startMeasurement('respiratory', 30, {
        'respiratory-rate': '22 breaths/min',
        'respiratory-rhythm': 'Regular',
        'respiratory-strength': 'Mildly labored',
      })
    })

    expect(result.current.measurements.pulse.secondsLeft).toBe(15)
    expect(result.current.measurements.respiratory.secondsLeft).toBe(30)

    act(() => {
      vi.advanceTimersByTime(15_000)
    })

    expect(result.current.measurements.pulse.resultSnapshot).toEqual({
      'pulse-rate': '98 bpm',
      'pulse-rhythm': 'Regular',
      'pulse-strength': 'Moderate',
      'pulse-speed': 'Fast',
    })
    expect(onResult).toHaveBeenCalledWith('pulse')
    expect(result.current.measurements.respiratory.secondsLeft).toBe(15)
    expect(result.current.measurements.respiratory.resultSnapshot).toBeNull()

    act(() => {
      vi.advanceTimersByTime(15_000)
    })

    expect(result.current.measurements.respiratory.resultSnapshot).toEqual({
      'respiratory-rate': '22 breaths/min',
      'respiratory-rhythm': 'Regular',
      'respiratory-strength': 'Mildly labored',
    })
    expect(onResult).toHaveBeenCalledWith('respiratory')
  })

  it('cancels only the selected group without revealing its snapshot', () => {
    const onResult = vi.fn()
    const { result } = renderHook(() => usePatientSnsMeasurements(onResult))

    act(() => {
      result.current.startMeasurement('pulse', 15, { 'pulse-rate': '98 bpm' })
      result.current.startMeasurement('respiratory', 30, {
        'respiratory-rate': '22 breaths/min',
      })
      result.current.cancelMeasurement('pulse')
    })
    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    expect(result.current.measurements.pulse.endsAt).toBeNull()
    expect(result.current.measurements.pulse.resultSnapshot).toBeNull()
    expect(result.current.measurements.respiratory.resultSnapshot).toEqual({
      'respiratory-rate': '22 breaths/min',
    })
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith('respiratory')
  })

  it('toggles a fresh Tap snapshot without unconfirming the group', () => {
    const sourceFindings = {
      'pulse-rate': '98 bpm',
      'pulse-rhythm': 'Regular',
    }
    const onResult = vi.fn()
    const { result } = renderHook(() => usePatientSnsMeasurements(onResult))

    act(() => {
      result.current.toggleMeasurementResult('pulse', sourceFindings)
    })
    sourceFindings['pulse-rate'] = '140 bpm'

    expect(result.current.measurements.pulse.resultSnapshot).toEqual({
      'pulse-rate': '98 bpm',
      'pulse-rhythm': 'Regular',
    })
    expect(onResult).toHaveBeenCalledWith('pulse')

    act(() => {
      result.current.toggleMeasurementResult('pulse', sourceFindings)
    })

    expect(result.current.measurements.pulse.resultSnapshot).toBeNull()
    expect(onResult).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.toggleMeasurementResult('pulse', sourceFindings)
    })

    expect(result.current.measurements.pulse.resultSnapshot).toEqual({
      'pulse-rate': '140 bpm',
      'pulse-rhythm': 'Regular',
    })
    expect(onResult).toHaveBeenCalledTimes(2)
  })

  it('keeps Pulse speed from measurement start when the source changes before completion', () => {
    const { result } = renderHook(() => usePatientSnsMeasurements())
    const sourceFindings = {
      'pulse-rate': '156 bpm',
      'pulse-rhythm': 'Regular',
      'pulse-strength': 'Strong',
      'pulse-speed': 'Fast',
    }

    act(() => {
      result.current.startMeasurement('pulse', 15, sourceFindings)
    })
    sourceFindings['pulse-speed'] = 'Slow'
    act(() => {
      vi.advanceTimersByTime(15_000)
    })

    expect(result.current.measurements.pulse.resultSnapshot?.['pulse-speed']).toBe('Fast')
  })

  it('keeps Respiratory speed from measurement start when the source changes', () => {
    const { result } = renderHook(() => usePatientSnsMeasurements())
    const sourceFindings = {
      'respiratory-rate': '28 breaths/min',
      'respiratory-rhythm': 'Regular',
      'respiratory-strength': 'Labored',
      'respiratory-speed': 'Fast',
    }

    act(() => {
      result.current.startMeasurement('respiratory', 15, sourceFindings)
    })
    sourceFindings['respiratory-speed'] = 'Slow'
    act(() => {
      vi.advanceTimersByTime(15_000)
    })

    expect(result.current.measurements.respiratory.resultSnapshot?.['respiratory-speed']).toBe(
      'Fast',
    )
  })

  it('resets active countdowns and visible results together', () => {
    const { result } = renderHook(() => usePatientSnsMeasurements())

    act(() => {
      result.current.startMeasurement('pulse', 15, { 'pulse-rate': '98 bpm' })
      result.current.toggleMeasurementResult('respiratory', {
        'respiratory-rate': '22 breaths/min',
      })
      result.current.resetMeasurements()
    })

    expect(result.current.measurements.pulse.endsAt).toBeNull()
    expect(result.current.measurements.pulse.resultSnapshot).toBeNull()
    expect(result.current.measurements.respiratory.resultSnapshot).toBeNull()
  })
})
