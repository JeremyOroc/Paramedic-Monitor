import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { PERFORM_CPR_DURATION_MS } from '@/lib/defib/defibMachine'

import { useDefibSequence } from '../useDefibSequence'

const audioMocks = vi.hoisted(() => ({
  playSystemAudio: vi.fn(),
  playCprAudioSequence: vi.fn((onEnded?: () => void) => void onEnded),
}))

vi.mock('@/lib/audio', () => audioMocks)

describe('useDefibSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
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

  it('transitions idle → analyzing_ecg → analyzing_clear → analyzing_result → cpr', () => {
    const { result } = renderHook(() =>
      useDefibSequence({ patientMode: 'adult' }),
    )
    act(() => result.current.onAnalyse())
    expect(result.current.state).toBe('analyzing_ecg')
    expect(result.current.canAnalyse).toBe(false)

    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(result.current.state).toBe('analyzing_clear')

    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(result.current.state).toBe('analyzing_result')

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(result.current.state).toBe('cpr')
    expect(result.current.canCharge).toBe(true)
    expect(result.current.cprStartTime).toBeNull()
    expect(audioMocks.playCprAudioSequence).toHaveBeenCalledOnce()

    act(() => {
      vi.advanceTimersByTime(PERFORM_CPR_DURATION_MS - 1)
    })
    expect(result.current.cprStartTime).toBeNull()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.cprStartTime).toBe(Date.now())
  })

  it('starts the CPR interval when the Perform CPR cue completes after an advised shock', () => {
    const { result } = renderHook(() =>
      useDefibSequence({ patientMode: 'adult', rhythm: 'vf' }),
    )

    act(() => result.current.onAnalyse())
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.state).toBe('shock_advised')

    act(() => result.current.onShock())

    expect(result.current.state).toBe('cpr')
    expect(result.current.cprStartTime).toBeNull()
    expect(audioMocks.playCprAudioSequence).toHaveBeenCalledOnce()

    const onCueEnded = audioMocks.playCprAudioSequence.mock.calls[0]?.[0]
    expect(onCueEnded).toBeTypeOf('function')

    act(() => {
      vi.advanceTimersByTime(1000)
      onCueEnded?.()
    })
    const cueEndedAt = Date.now()
    expect(result.current.cprStartTime).toBe(cueEndedAt)

    act(() => {
      vi.advanceTimersByTime(PERFORM_CPR_DURATION_MS)
    })
    expect(result.current.cprStartTime).toBe(cueEndedAt)
  })

  it('uses the absolute prompt deadline when the fallback callback is throttled', () => {
    const { result } = renderHook(() =>
      useDefibSequence({ patientMode: 'adult', rhythm: 'vf' }),
    )

    act(() => result.current.onAnalyse())
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    act(() => result.current.onShock())
    const scheduledStartTime = Date.now() + PERFORM_CPR_DURATION_MS

    act(() => {
      vi.setSystemTime(Date.now() + 10_000)
      vi.advanceTimersByTime(PERFORM_CPR_DURATION_MS)
    })

    expect(result.current.cprStartTime).toBe(scheduledStartTime)
  })

  it('ignores a stale cue callback and fallback after reset', () => {
    const { result } = renderHook(() =>
      useDefibSequence({ patientMode: 'adult', rhythm: 'vf' }),
    )

    act(() => result.current.onAnalyse())
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    act(() => result.current.onShock())
    const onCueEnded = audioMocks.playCprAudioSequence.mock.calls[0]?.[0]

    act(() => result.current.reset())
    act(() => {
      onCueEnded?.()
      vi.advanceTimersByTime(PERFORM_CPR_DURATION_MS)
    })

    expect(result.current.state).toBe('idle')
    expect(result.current.cprStartTime).toBeNull()
  })

  it('transitions charge_prompt → charging → charged', () => {
    const { result } = renderHook(() =>
      useDefibSequence({
        patientMode: 'adult',
      }),
    )
    act(() => result.current.onCharge())
    expect(result.current.state).toBe('charge_prompt')
    expect(result.current.canShock).toBe(false)

    act(() => result.current.onCharge())
    expect(result.current.state).toBe('charging')

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(result.current.state).toBe('charged')
    expect(result.current.canShock).toBe(true)
  })

  it('SHOCK increments counter and returns to delivered', () => {
    const { result } = renderHook(() =>
      useDefibSequence({
        patientMode: 'adult',
      }),
    )
    act(() => result.current.onCharge())
    act(() => result.current.onCharge())
    act(() => vi.advanceTimersByTime(4000))
    expect(result.current.canShock).toBe(true)

    act(() => result.current.onShock())
    expect(result.current.shockCount).toBe(1)
    expect(result.current.state).toBe('delivered')
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

  it('blocks energy adjustment during analyzing/charging', () => {
    const { result } = renderHook(() =>
      useDefibSequence({ patientMode: 'adult' }),
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
      { initialProps: { mode: 'adult' } as { mode: 'adult' | 'pediatric' | 'neonate' } },
    )
    expect(result.current.energy).toBe(120)
    rerender({ mode: 'neonate' })
    expect(result.current.energy).toBe(10)
  })
})
