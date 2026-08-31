import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playSystemAudio, stopCprAudioSequence } from '@/lib/audio'
import { BottomStatusBar } from '../BottomStatusBar'

vi.mock('@/lib/audio', () => ({
  playSystemAudio: vi.fn(),
  stopCprAudioSequence: vi.fn(),
}))

const baseProps = {
  joules: 120,
  shockCount: 0,
  lastDeliveredJoules: null,
}

describe('BottomStatusBar CPR audio lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stops the metronome when the defibrillator exits CPR early', () => {
    const view = render(
      <BottomStatusBar
        {...baseProps}
        defibState="cpr"
        cprStartTime={Date.now()}
      />,
    )

    view.rerender(
      <BottomStatusBar
        {...baseProps}
        defibState="analyzing_ecg"
        cprStartTime={null}
      />,
    )

    expect(stopCprAudioSequence).toHaveBeenCalledTimes(1)
  })

  it('stops the metronome and announces completion after two minutes', () => {
    render(
      <BottomStatusBar
        {...baseProps}
        defibState="cpr"
        cprStartTime={Date.now() - 120_000}
      />,
    )

    act(() => vi.advanceTimersByTime(0))

    expect(stopCprAudioSequence).toHaveBeenCalledTimes(1)
    expect(playSystemAudio).toHaveBeenCalledWith('stop_cpr.mp3')
  })
})
