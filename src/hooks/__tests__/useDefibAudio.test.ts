import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDefibAudio } from '../useDefibAudio'
import * as audio from '@/lib/audio'

vi.mock('@/lib/audio', () => ({
  playChargeBeep: vi.fn(),
  pauseChargeBeep: vi.fn(),
  playShockReadyBeep: vi.fn(),
  pauseShockReadyBeep: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useDefibAudio', () => {
  it('plays the charge beep while charging and unmuted', () => {
    renderHook(() => useDefibAudio('charging', false))
    expect(audio.playChargeBeep).toHaveBeenCalled()
  })

  it('does not play the charge beep when muted', () => {
    renderHook(() => useDefibAudio('charging', true))
    expect(audio.playChargeBeep).not.toHaveBeenCalled()
    expect(audio.pauseChargeBeep).toHaveBeenCalled()
  })

  it('plays the shock-ready beep when charged or shock_advised and unmuted', () => {
    const charged = renderHook(() => useDefibAudio('charged', false))
    expect(audio.playShockReadyBeep).toHaveBeenCalledTimes(1)
    charged.unmount()
    vi.clearAllMocks()
    renderHook(() => useDefibAudio('shock_advised', false))
    expect(audio.playShockReadyBeep).toHaveBeenCalledTimes(1)
  })

  it('pauses both beeps when idle', () => {
    renderHook(() => useDefibAudio('idle', false))
    expect(audio.pauseChargeBeep).toHaveBeenCalled()
    expect(audio.pauseShockReadyBeep).toHaveBeenCalled()
    expect(audio.playChargeBeep).not.toHaveBeenCalled()
    expect(audio.playShockReadyBeep).not.toHaveBeenCalled()
  })
})
