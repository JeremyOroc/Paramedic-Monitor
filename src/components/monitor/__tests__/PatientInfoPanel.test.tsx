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

  it('puts the blue cursor on the label while browsing', () => {
    setup({ selectedField: 'age', editing: false })
    const label = screen.getByText('Patient Age')
    const valueCell = screen.getByText('63').parentElement as HTMLElement
    expect(label).toHaveClass('bg-[#2f6df6]')
    expect(valueCell).not.toHaveClass('bg-[#2f6df6]')
    expect(valueCell).toHaveClass('bg-black')
  })

  it('moves the blue cursor to the value while editing', () => {
    setup({ selectedField: 'age', editing: true })
    const label = screen.getByText('Patient Age')
    const valueCell = screen.getByText('63').parentElement as HTMLElement
    expect(valueCell).toHaveClass('bg-[#2f6df6]')
    expect(label).not.toHaveClass('bg-[#2f6df6]')
  })

  it('never gives a label cell a black background', () => {
    setup({ selectedField: 'age', editing: false })
    expect(screen.getByText('Patient Age')).not.toHaveClass('bg-black')
    expect(screen.getByText('Patient Sex')).not.toHaveClass('bg-black')
  })

  it('renders no up/down arrows when editing', () => {
    setup({ selectedField: 'age', editing: true })
    expect(screen.queryByText('▲▼')).not.toBeInTheDocument()
  })

  it('starts after the left sidebar so the menu stays visible', () => {
    setup()
    const panel = screen.getByRole('region', { name: 'Patient Info' })
    expect(panel).toHaveClass('left-[56px]')
    expect(panel).not.toHaveClass('inset-x-0')
  })
})
