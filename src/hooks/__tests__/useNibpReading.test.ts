import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNibpReading } from '../useNibpReading'

describe('useNibpReading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // deterministic random
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('starts in idle phase with empty displayValue', () => {
    const { result } = renderHook(() => useNibpReading(110))
    expect(result.current.phase).toBe('idle')
    expect(result.current.displayValue).toBe('')
  })

  it('idle → please_wait on button press', () => {
    const { result } = renderHook(() => useNibpReading(110))
    act(() => result.current.handlePatientEvent())
    expect(result.current.phase).toBe('please_wait')
    expect(result.current.displayValue).toBe('Please Wait')
  })

  it('please_wait → reading after 3000ms', () => {
    const { result } = renderHook(() => useNibpReading(110))
    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.phase).toBe('reading')
    expect(result.current.displayValue).toBe('Reading in Progress')
  })

  it('reading → counting after 500ms', () => {
    const { result } = renderHook(() => useNibpReading(110))
    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(3000) })
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.phase).toBe('counting')
    expect(result.current.displayValue).toBe(0)
  })

  it('counting → settled after 8000ms, displayValue becomes bpSys', () => {
    const { result } = renderHook(() => useNibpReading(110))
    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(3000 + 500 + 8000 + 500) })
    expect(result.current.phase).toBe('settled')
    expect(result.current.displayValue).toBe(110)
  })

  it('commits the pending BP snapshot only after the full sequence completes', () => {
    const onComplete = vi.fn()
    const pending = {
      bpSys: 118,
      bpDia: 76,
      active: { bp_sys: true, bp_dia: true },
    }
    const { result } = renderHook(() => useNibpReading(pending, onComplete))

    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(3000 + 500 + 7000) })
    expect(onComplete).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(2000) })
    expect(onComplete).toHaveBeenCalledWith(pending)
  })

  it('cancel during please_wait returns to idle', () => {
    const { result } = renderHook(() => useNibpReading(110))
    act(() => result.current.handlePatientEvent())
    expect(result.current.phase).toBe('please_wait')
    act(() => result.current.handlePatientEvent())
    expect(result.current.phase).toBe('idle')
  })

  it('cancel during reading returns to idle', () => {
    const { result } = renderHook(() => useNibpReading(110))
    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.phase).toBe('reading')
    act(() => result.current.handlePatientEvent())
    expect(result.current.phase).toBe('idle')
  })

  it('cancel during counting returns to idle', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useNibpReading(110, onComplete))
    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(3000 + 500 + 1000) })
    expect(result.current.phase).toBe('counting')
    act(() => result.current.handlePatientEvent())
    expect(result.current.phase).toBe('idle')
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('exposes cancellation for power-off cleanup', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useNibpReading(110, onComplete))

    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(3000 + 500 + 1000) })
    act(() => result.current.cancelReading())
    act(() => { vi.advanceTimersByTime(10_000) })

    expect(result.current.phase).toBe('idle')
    expect(result.current.displayValue).toBe('')
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('commits an inactive BP snapshot by returning to idle with blank display', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useNibpReading(
        {
          bpSys: 0,
          bpDia: 0,
          active: { bp_sys: false, bp_dia: false },
        },
        onComplete,
      ),
    )

    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(3000 + 500 + 8000 + 100) })

    expect(result.current.phase).toBe('idle')
    expect(result.current.displayValue).toBe('')
    expect(onComplete).toHaveBeenCalledWith({
      bpSys: 0,
      bpDia: 0,
      active: { bp_sys: false, bp_dia: false },
    })
  })

  it('pressing after settled starts a new reading (not idle)', () => {
    const { result } = renderHook(() => useNibpReading(110))
    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(3000 + 500 + 8000 + 500) })
    expect(result.current.phase).toBe('settled')
    act(() => result.current.handlePatientEvent())
    expect(result.current.phase).toBe('please_wait')
  })

  describe('buildCountingSequence correctness', () => {
    function captureSequence(bpSys: number): number[] {
      const { result } = renderHook(() => useNibpReading(bpSys))
      act(() => result.current.handlePatientEvent())
      act(() => { vi.advanceTimersByTime(3000 + 500) }) // enter counting phase
      expect(result.current.phase).toBe('counting')

      const target = bpSys + 30
      const maxSteps = Math.floor(8000 / 333)
      const actualSteps = Math.max(Math.min(maxSteps, target + 1), 2)
      const intervalMs = Math.round(8000 / actualSteps)

      // Collect: initial value + (actualSteps - 1) interval ticks
      const collected: number[] = [result.current.displayValue as number]
      for (let i = 1; i < actualSteps; i++) {
        act(() => { vi.advanceTimersByTime(intervalMs) })
        collected.push(result.current.displayValue as number)
      }
      return collected
    }

    it('sequence for bpSys=110 starts at 0, ends at 140', () => {
      const seq = captureSequence(110)
      expect(seq[0]).toBe(0)
      expect(seq[seq.length - 1]).toBe(140)
    })

    it('sequence for bpSys=110 is monotonically increasing with steps >= 1', () => {
      const seq = captureSequence(110)
      for (let i = 1; i < seq.length; i++) {
        const step = seq[i] - seq[i - 1]
        expect(step).toBeGreaterThanOrEqual(1)
        expect(seq[i]).toBeGreaterThan(seq[i - 1])
      }
    })

    it('sequence for bpSys=60 starts at 0, ends at 90', () => {
      const seq = captureSequence(60)
      expect(seq[0]).toBe(0)
      expect(seq[seq.length - 1]).toBe(90)
    })

    it('sequence for bpSys=5 (edge case) starts at 0, ends at 35', () => {
      const seq = captureSequence(5)
      expect(seq[0]).toBe(0)
      expect(seq[seq.length - 1]).toBe(35)
    })

    it('sequence for bpSys=180 starts at 0, ends at 210', () => {
      const seq = captureSequence(180)
      expect(seq[0]).toBe(0)
      expect(seq[seq.length - 1]).toBe(210)
    })
  })
})
