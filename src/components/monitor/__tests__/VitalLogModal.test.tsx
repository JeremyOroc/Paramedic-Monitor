import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { VitalLogModal } from '../VitalLogModal'
import type { VitalLogEntry } from '@/hooks/useVitalLog'

function makeLog(count: number): VitalLogEntry[] {
  return Array.from({ length: count }, (_, index) => {
    const totalMinutes = (index + 1) * 5
    return {
      timestamp: `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}:00`,
      fc: 80 + index,
      pniSys: index === 0 ? null : 120 + index,
      pniDia: 80 + index,
      etco2: 35 + index,
      spo2: 98 - index,
    }
  })
}

describe('VitalLogModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<VitalLogModal open={false} log={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the empty state and exact colored headers', () => {
    render(<VitalLogModal open log={[]} />)

    expect(screen.getByRole('region', { name: 'Vital Log' })).toHaveClass(
      'left-[56px]',
      'right-[96px]',
      'top-[56px]',
      'bottom-[110px]',
    )
    expect(screen.getByRole('heading', { name: 'Vital Log' })).toBeInTheDocument()
    expect(screen.getByText('No vitals recorded.')).toBeInTheDocument()
    expect(screen.getByText('FC')).toHaveClass('text-ecg-green')
    expect(screen.getByText('PNI SYS')).toHaveClass('text-cyan-bp')
    expect(screen.getByText('PNI DIA')).toHaveClass('text-cyan-bp')
    expect(screen.getByText('ETCO2')).toHaveClass('text-purple-etco2')
    expect(screen.getByText('SPO2')).toHaveClass('text-yellow-spo2')
    expect(screen.queryByText(/Page \d+ of \d+/)).toBeNull()
    expect(screen.getByText('Exit')).toHaveAttribute('aria-current', 'true')
  })

  it('renders separate PNI columns, colors, and dashes for unavailable values', () => {
    render(<VitalLogModal open log={makeLog(1)} />)
    const modal = screen.getByRole('region', { name: 'Vital Log' })

    expect(within(modal).getByText('FC')).toHaveClass('text-ecg-green')
    expect(within(modal).getByText('PNI SYS')).toHaveClass('text-cyan-bp')
    expect(within(modal).getByText('PNI DIA')).toHaveClass('text-cyan-bp')
    expect(within(modal).getByText('ETCO2')).toHaveClass('text-purple-etco2')
    expect(within(modal).getByText('SPO2')).toHaveClass('text-yellow-spo2')
    expect(within(modal).getByText('-')).toBeInTheDocument()
    expect(within(modal).getByText('00:05:00')).toBeInTheDocument()
  })

  it('paginates after eight rows and exposes disabled edge states', () => {
    const log = makeLog(12)
    const { rerender } = render(
      <VitalLogModal open log={log} page={1} highlightedButton="prev" />,
    )

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('00:40:00')).toBeInTheDocument()
    expect(screen.queryByText('00:45:00')).toBeNull()
    expect(screen.getByText(/Prev/)).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/Prev/)).toHaveAttribute('aria-current', 'true')

    rerender(<VitalLogModal open log={log} page={2} highlightedButton="next" />)

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('00:45:00')).toBeInTheDocument()
    expect(screen.getByText('01:00:00')).toBeInTheDocument()
    expect(screen.queryByText('00:05:00')).toBeNull()
    expect(screen.getByText(/Next/)).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/Next/)).toHaveAttribute('aria-current', 'true')
  })
})
