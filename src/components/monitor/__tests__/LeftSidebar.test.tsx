import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LeftSidebar } from '../LeftSidebar'

function setup(overrides: Partial<Parameters<typeof LeftSidebar>[0]> = {}) {
  render(<LeftSidebar twelveLeadActive={false} etco2Active={false} {...overrides} />)
}

describe('LeftSidebar', () => {
  it('renders the sidebar labels as display-only controls (no button semantics)', () => {
    setup()
    expect(screen.queryByRole('button', { name: '12-lead view' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Toggle EtCO2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('12-lead view')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle EtCO2')).toBeInTheDocument()
    expect(screen.getByLabelText('Back')).toBeInTheDocument()
  })

  it('renders decorative labels without button semantics', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Brightness' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Medications' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Call Info (sidebar)' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument()
  })

  it('collapses to Capture + Patient Info + Back in 12-lead view', () => {
    setup({ twelveLeadActive: true })
    expect(screen.getByLabelText('Capture 12-lead')).toBeInTheDocument()
    expect(screen.getByLabelText('Patient Info')).toBeInTheDocument()
    expect(screen.getByLabelText('Back')).toBeInTheDocument()
    expect(screen.queryByLabelText('12-lead view')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Toggle EtCO2')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Brightness')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Medications')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Analyse (sidebar)')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Print')).not.toBeInTheDocument()
  })
})
