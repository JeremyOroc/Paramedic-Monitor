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
})
