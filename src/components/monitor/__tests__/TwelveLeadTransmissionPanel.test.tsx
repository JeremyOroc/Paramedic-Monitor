import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  TWELVE_LEAD_SENT_MS,
  TWELVE_LEAD_TRANSMISSION_DESTINATIONS,
} from '@/lib/twelveLeadTransmission'

import { TwelveLeadTransmissionPanel } from '../TwelveLeadTransmissionPanel'

describe('TwelveLeadTransmissionPanel', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the fixed hospital order with only Return as the extra visible control', () => {
    render(
      <TwelveLeadTransmissionPanel
        open
        highlightedIndex={0}
        sentDestination={null}
        sentUntil={null}
      />,
    )

    const options = screen.getAllByRole('option')
    expect(screen.getByRole('listbox')).toHaveClass('bg-modal-surface')
    expect(options.map((option) => option.textContent)).toEqual([
      ...TWELVE_LEAD_TRANSMISSION_DESTINATIONS,
      'Return',
    ])
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(options[0]).toHaveClass('bg-selection-blue')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows SENT until the projected deadline and then removes it', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-09T12:00:00.000Z'))
    const destination = TWELVE_LEAD_TRANSMISSION_DESTINATIONS[2]

    render(
      <TwelveLeadTransmissionPanel
        open
        highlightedIndex={2}
        sentDestination={destination}
        sentUntil={Date.now() + TWELVE_LEAD_SENT_MS}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(`SENT${destination}`)
    act(() => vi.advanceTimersByTime(TWELVE_LEAD_SENT_MS - 1))
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('clears an already-expired projected confirmation after reopening', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-09T12:00:00.000Z'))
    const destination = TWELVE_LEAD_TRANSMISSION_DESTINATIONS[0]
    const { rerender } = render(
      <TwelveLeadTransmissionPanel
        open={false}
        highlightedIndex={0}
        sentDestination={null}
        sentUntil={null}
      />,
    )

    act(() => vi.advanceTimersByTime(TWELVE_LEAD_SENT_MS * 2))
    rerender(
      <TwelveLeadTransmissionPanel
        open
        highlightedIndex={0}
        sentDestination={destination}
        sentUntil={Date.now() - TWELVE_LEAD_SENT_MS}
      />,
    )
    act(() => vi.advanceTimersByTime(0))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
