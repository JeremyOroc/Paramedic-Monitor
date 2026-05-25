import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PatientInfoPanel } from '../PatientInfoPanel'

function setup(overrides: Partial<Parameters<typeof PatientInfoPanel>[0]> = {}) {
  return render(
    <PatientInfoPanel
      open
      age={63}
      sex="M"
      selectedField="age"
      editing={false}
      {...overrides}
    />,
  )
}

describe('PatientInfoPanel', () => {
  it('renders nothing when closed', () => {
    const { container } = setup({ open: false })
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the title and both fields with values', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Patient Info' })).toBeInTheDocument()
    expect(screen.getByText('Patient Age')).toBeInTheDocument()
    expect(screen.getByText('63')).toBeInTheDocument()
    expect(screen.getByText('Patient Sex')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('marks the selected field as current', () => {
    setup({ selectedField: 'sex' })
    const sexRow = screen.getByText('Patient Sex').closest('li')
    const ageRow = screen.getByText('Patient Age').closest('li')
    expect(sexRow).toHaveAttribute('aria-current', 'true')
    expect(ageRow).not.toHaveAttribute('aria-current')
  })

  it('flags the editing state on the selected field', () => {
    setup({ selectedField: 'age', editing: true })
    const ageRow = screen.getByText('Patient Age').closest('li')
    expect(ageRow).toHaveAttribute('data-editing', 'true')
  })
})
