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

  it('starts counting at 0 immediately on button press', () => {
    const { result } = renderHook(() => useNibpReading(110))
    act(() => result.current.handlePatientEvent())
    expect(result.current.phase).toBe('counting')
    expect(result.current.displayValue).toBe(0)
  })

  it('begins rising during the first count-up interval', () => {
    const { result } = renderHook(() => useNibpReading(110))
    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(333) })
    expect(result.current.phase).toBe('counting')
    expect(result.current.displayValue).toBeGreaterThan(0)
  })

  it('holds the exact peak at 8000ms, then settles to bpSys after 100ms', () => {
    const { result } = renderHook(() => useNibpReading(110))
    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(8000) })
    expect(result.current.phase).toBe('counting')
    expect(result.current.displayValue).toBe(140)
    act(() => { vi.advanceTimersByTime(100) })
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
    act(() => { vi.advanceTimersByTime(8000) })
    expect(onComplete).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(100) })
    expect(onComplete).toHaveBeenCalledWith(pending)
  })

  it('cancel during counting returns to idle', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useNibpReading(110, onComplete))
    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.phase).toBe('counting')
    act(() => result.current.handlePatientEvent())
    expect(result.current.phase).toBe('idle')
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('exposes cancellation for power-off cleanup', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useNibpReading(110, onComplete))

    act(() => result.current.handlePatientEvent())
    act(() => { vi.advanceTimersByTime(1000) })
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
    act(() => { vi.advanceTimersByTime(8000 + 100) })

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
    act(() => { vi.advanceTimersByTime(8000 + 100) })
    expect(result.current.phase).toBe('settled')
    act(() => result.current.handlePatientEvent())
    expect(result.current.phase).toBe('counting')
    expect(result.current.displayValue).toBe(0)
  })

  it('catches up from elapsed time after interval ticks are delayed', () => {
    const { result } = renderHook(() => useNibpReading(110))
    const startedAt = Date.now()
    act(() => result.current.handlePatientEvent())
    act(() => {
      vi.setSystemTime(startedAt + 7000)
      vi.advanceTimersByTime(333)
    })
    expect(result.current.displayValue).toBeGreaterThan(100)
    expect(result.current.displayValue).toBeLessThan(140)
  })

  describe('buildCountingSequence correctness', () => {
    function captureSequence(bpSys: number): number[] {
      const { result } = renderHook(() => useNibpReading(bpSys))
      act(() => result.current.handlePatientEvent())
      expect(result.current.phase).toBe('counting')

      const target = bpSys + 30
      const collected: number[] = [result.current.displayValue as number]
      for (let elapsed = 333; elapsed < 8000; elapsed += 333) {
        act(() => { vi.advanceTimersByTime(333) })
        const value = result.current.displayValue as number
        if (value !== collected.at(-1)) collected.push(value)
      }
      act(() => { vi.advanceTimersByTime(8) })
      collected.push(result.current.displayValue as number)
      expect(result.current.displayValue).toBe(target)
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
