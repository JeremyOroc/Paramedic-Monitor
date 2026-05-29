import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VitalBox } from '../VitalBox'

describe('VitalBox', () => {
  it('renders a single value', () => {
    render(<VitalBox label="FC" value={80} unit="bpm" color="ecgGreen" />)
    expect(screen.getByText('FC')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('bpm')).toBeInTheDocument()
  })

  it('renders stacked values with a divider when stackedValues is set', () => {
    const { container } = render(
      <VitalBox
        label="PNI"
        stackedValues={{ top: 120, bottom: 89 }}
        unit="mmHg"
        color="cyanBP"
      />,
    )
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('89')).toBeInTheDocument()
    expect(screen.queryByText('120/89')).toBeNull()
    expect(container.querySelector('hr')).not.toBeNull()
  })

  it('uses the alarm visual treatment when alarming', () => {
    render(<VitalBox label="FC" value={38} unit="bpm" color="ecgGreen" alarming />)

    expect(screen.getByText('FC')).toHaveClass('text-white')
    expect(screen.getByText('bpm')).toHaveClass('text-white')
    expect(screen.getByText('38')).toHaveClass('text-alarm-red')
    expect(screen.getByTestId('vital-value')).toHaveClass('vital-alarm-flash')
    expect(screen.getByText('FC').closest('[data-alarming="true"]')).toHaveClass('bg-white')
  })

  it('does not flash the value when the vital is normal', () => {
    render(<VitalBox label="FC" value={80} unit="bpm" color="ecgGreen" />)

    expect(screen.getByTestId('vital-value')).not.toHaveClass('vital-alarm-flash')
  })

  it('highlights the value area without highlighting the label row when selected', () => {
    const { container } = render(
      <VitalBox label="FC" value={80} unit="bpm" color="ecgGreen" selected />,
    )

    const box = screen.getByText('FC').closest('[data-selected="true"]')
    expect(box).toBeInTheDocument()
    const selectedRegion = screen.getByTestId('vital-value').parentElement
    expect(selectedRegion).toHaveClass('bg-[var(--color-selection-blue)]', 'text-white')
    expect(selectedRegion).not.toContainElement(screen.getByText('FC'))
  })
})
