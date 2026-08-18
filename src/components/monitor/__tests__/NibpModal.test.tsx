import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NibpModal } from '../NibpModal'

describe('NibpModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <NibpModal
        open={false}
        highlightedRow="systolicAlarm"
        mode="manual"
        autoInterval={2}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('matches the reference geometry, rows, and immutable values', () => {
    render(
      <NibpModal
        open
        highlightedRow="systolicAlarm"
        mode="manual"
        autoInterval={2}
      />,
    )

    const modal = screen.getByRole('dialog', { name: 'NIBP settings' })
    expect(modal).toHaveClass(
      'left-[56px]',
      'right-[96px]',
      'top-[31%]',
      'bottom-[2%]',
      'pointer-events-none',
    )
    expect(within(modal).getByText('NIBP')).toHaveClass('bg-cyan-bp', 'text-black')
    expect(within(modal).getByText('Lower')).toBeInTheDocument()
    expect(within(modal).getByText('Upper')).toBeInTheDocument()
    expect(within(modal).getByText('NIBP Systolic Alarm')).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(within(modal).getByText('NIBP Diastolic Alarm')).toBeInTheDocument()
    expect(within(modal).getByText('NIBP MAP Alarm')).toBeInTheDocument()
    expect(within(modal).getByText('NIBP Mode')).toBeInTheDocument()
    expect(within(modal).getByText('NIBP Auto Mode Interval')).toBeInTheDocument()
    expect(within(modal).getByText('SmartCuf On/Off')).toBeInTheDocument()
    expect(within(modal).getByText('Manual')).toBeInTheDocument()
    expect(within(modal).getByText('2 min')).toBeInTheDocument()
    expect(within(modal).getByText('On')).toBeInTheDocument()
    expect(within(modal).getByText('90')).toBeInTheDocument()
    expect(within(modal).getByText('200')).toBeInTheDocument()
    expect(within(modal).getByText('25')).toBeInTheDocument()
    expect(within(modal).getByText('225')).toBeInTheDocument()
    expect(within(modal).getByText('46')).toBeInTheDocument()
    expect(within(modal).getByText('216')).toBeInTheDocument()
    expect(within(modal).getByText('Exit')).toBeInTheDocument()
    expect(within(modal).queryByText('Start TurboCuf')).toBeNull()
    expect(within(modal).queryByText('300')).toBeNull()
    expect(within(modal).queryAllByRole('button')).toHaveLength(0)
  })

  it('highlights only the selected label and remains pointer-inert', () => {
    const { rerender } = render(
      <NibpModal
        open
        highlightedRow="mode"
        mode="automatic"
        autoInterval={60}
      />,
    )

    const modeLabel = screen.getByText('NIBP Mode')
    const automaticValue = screen.getByText('Automatic')
    expect(modeLabel).toHaveClass('bg-[var(--color-selection-blue)]')
    expect(automaticValue).not.toHaveClass('bg-[var(--color-selection-blue)]')
    fireEvent.click(automaticValue)
    expect(screen.getByText('Automatic')).toBeInTheDocument()
    expect(screen.getByText('60 min')).toBeInTheDocument()

    rerender(
      <NibpModal open highlightedRow="exit" mode="automatic" autoInterval={60} />,
    )
    expect(screen.getByText('Exit')).toHaveAttribute('aria-current', 'true')
  })
})
