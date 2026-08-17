import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EventLogModal, type EventLogEntry } from '../EventLogModal'

function makeLog(count: number): EventLogEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Event ${index + 1}`,
    time: `10:00:${String(index).padStart(2, '0')}`,
  }))
}

describe('EventLogModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<EventLogModal open={false} log={makeLog(9)} />)

    expect(container).toBeEmptyDOMElement()
  })

  it.each([0, 8])('hides pagination for a log with %i entries', (count) => {
    render(<EventLogModal open log={makeLog(count)} />)

    expect(screen.queryByText(/Page \d+ of \d+/)).toBeNull()
    expect(screen.queryByText(/Prev/)).toBeNull()
    expect(screen.queryByText(/Next/)).toBeNull()
  })

  it('renders the requested page with highlighted and disabled edge states', () => {
    const log = makeLog(9)
    const { rerender } = render(
      <EventLogModal open log={log} page={1} highlightedButton="prev" />,
    )

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Event 1')).toBeInTheDocument()
    expect(screen.getByText('Event 8')).toBeInTheDocument()
    expect(screen.queryByText('Event 9')).toBeNull()
    expect(screen.getByText(/Prev/)).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/Prev/)).toHaveClass('bg-[#2f6df6]', 'opacity-30')
    expect(screen.getByText(/Next/)).toHaveAttribute('aria-disabled', 'false')

    rerender(<EventLogModal open log={log} page={2} highlightedButton="next" />)

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('Event 9')).toBeInTheDocument()
    expect(screen.queryByText('Event 1')).toBeNull()
    expect(screen.getByText(/Prev/)).toHaveAttribute('aria-disabled', 'false')
    expect(screen.getByText(/Next/)).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/Next/)).toHaveClass('bg-[#2f6df6]', 'opacity-30')
  })
})
