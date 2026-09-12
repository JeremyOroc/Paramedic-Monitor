import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BottomStatusBar } from '../BottomStatusBar'

vi.mock('@/lib/audio', () => ({
  playSystemAudio: vi.fn(),
  stopCprAudioSequence: vi.fn(),
}))

describe('BottomStatusBar CPR timer sizing', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-12T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('reserves one contained timer slot across Analyze and CPR', () => {
    const { rerender } = render(
      <BottomStatusBar
        defibState="analyzing_ecg"
        joules={120}
        shockCount={0}
        cprStartTime={null}
      />,
    )

    const timerSlot = screen.getByTestId('cpr-timer-slot')
    expect(timerSlot).toHaveClass(
      'min-w-0',
      'flex-1',
      'overflow-hidden',
    )
    expect(screen.queryByTestId('cpr-timer-value')).toBeNull()

    rerender(
      <BottomStatusBar
        defibState="cpr"
        joules={120}
        shockCount={0}
        cprStartTime={null}
      />,
    )

    expect(screen.getByTestId('cpr-timer-slot')).toBe(timerSlot)
    expect(screen.getByTestId('cpr-timer-value')).toHaveTextContent('2:00')
  })

  it('keeps the same fixed value box from 2:00 through 1:59 and 0:00', () => {
    const startedAt = Date.now()
    render(
      <BottomStatusBar
        defibState="cpr"
        joules={120}
        shockCount={0}
        cprStartTime={startedAt}
      />,
    )

    const timerValue = screen.getByTestId('cpr-timer-value')
    expect(timerValue).toHaveTextContent('2:00')
    expect(timerValue).toHaveClass(
      'inline-block',
      'w-[4ch]',
      'whitespace-nowrap',
      'text-center',
      'tabular-nums',
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByTestId('cpr-timer-value')).toBe(timerValue)
    expect(timerValue).toHaveTextContent('1:59')

    act(() => {
      vi.advanceTimersByTime(119_000)
    })
    expect(screen.getByTestId('cpr-timer-value')).toBe(timerValue)
    expect(timerValue).toHaveTextContent('0:00')
  })

  it('prevents the fixed side cells from shrinking into the timer slot', () => {
    const { container } = render(
      <BottomStatusBar
        defibState="cpr"
        joules={120}
        shockCount={2}
        cprStartTime={null}
      />,
    )

    const lowerRow = container.querySelector('.mt-1')
    expect(lowerRow?.firstElementChild).toHaveClass('w-64', 'shrink-0')
    expect(lowerRow?.lastElementChild).toHaveClass('w-32', 'shrink-0')
  })
})
