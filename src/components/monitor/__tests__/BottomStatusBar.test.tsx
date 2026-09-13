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

  it('reserves the exact hidden timer content across every Analyze state and CPR', () => {
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
      'overflow-hidden',
      'bg-black',
    )
    const timerContent = screen.getByTestId('cpr-timer-content')
    const timerValue = screen.getByTestId('cpr-timer-value')
    expect(timerContent).toHaveClass('invisible')
    expect(timerContent).toHaveAttribute('aria-hidden', 'true')
    expect(timerValue).toHaveTextContent('2:00')

    for (const defibState of [
      'analyzing_clear',
      'analyzing_result',
      'shock_advised',
    ] as const) {
      rerender(
        <BottomStatusBar
          defibState={defibState}
          joules={120}
          shockCount={0}
          cprStartTime={null}
        />,
      )

      expect(screen.getByTestId('cpr-timer-slot')).toBe(timerSlot)
      expect(screen.getByTestId('cpr-timer-content')).toBe(timerContent)
      expect(screen.getByTestId('cpr-timer-value')).toBe(timerValue)
      expect(timerContent).toHaveClass('invisible')
      expect(timerContent).toHaveAttribute('aria-hidden', 'true')
    }

    rerender(
      <BottomStatusBar
        defibState="cpr"
        joules={120}
        shockCount={0}
        cprStartTime={null}
      />,
    )

    expect(screen.getByTestId('cpr-timer-slot')).toBe(timerSlot)
    expect(screen.getByTestId('cpr-timer-content')).toBe(timerContent)
    expect(screen.getByTestId('cpr-timer-value')).toBe(timerValue)
    expect(timerSlot).toHaveClass('bg-white')
    expect(timerContent).not.toHaveClass('invisible')
    expect(timerContent).not.toHaveAttribute('aria-hidden')
    expect(timerValue).toHaveTextContent('2:00')
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

  it('shares the remaining status-row width between contained 2:1 side tracks', () => {
    render(
      <BottomStatusBar
        defibState="cpr"
        joules={120}
        shockCount={2}
        cprStartTime={null}
      />,
    )

    expect(screen.getByTestId('cpr-status-row')).toHaveClass(
      'grid',
      'grid-cols-[minmax(0,2fr)_max-content_minmax(0,1fr)]',
      'overflow-hidden',
    )
    expect(screen.getByTestId('cpr-status-left')).toHaveClass(
      'min-w-0',
      'overflow-hidden',
    )
    expect(screen.getByTestId('cpr-shock-count')).toHaveClass(
      'min-w-0',
      'overflow-hidden',
    )
    expect(screen.getByTestId('cpr-status-left')).not.toHaveClass('w-64', 'shrink-0')
    expect(screen.getByTestId('cpr-shock-count')).not.toHaveClass('w-32', 'shrink-0')
  })
})
