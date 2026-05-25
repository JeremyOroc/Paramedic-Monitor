import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeftSidebar } from '../LeftSidebar'

function setup(overrides: Partial<Parameters<typeof LeftSidebar>[0]> = {}) {
  const onTwelveLead = vi.fn()
  const onToggleEtco2 = vi.fn()
  const onBack = vi.fn()
  render(
    <LeftSidebar
      twelveLeadActive={false}
      etco2Active={false}
      onTwelveLead={onTwelveLead}
      onToggleEtco2={onToggleEtco2}
      onBack={onBack}
      {...overrides}
    />,
  )
  return { onTwelveLead, onToggleEtco2, onBack }
}

describe('LeftSidebar', () => {
  it('renders the sidebar labels as display-only controls', () => {
    setup()
    expect(screen.queryByRole('button', { name: '12-lead view' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Toggle EtCO2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('12-lead view')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle EtCO2')).toBeInTheDocument()
    expect(screen.getByLabelText('Back')).toBeInTheDocument()
  })

  it('does not fire callbacks when display-only labels are clicked', async () => {
    const user = userEvent.setup()
    const { onTwelveLead, onToggleEtco2, onBack } = setup()
    await user.click(screen.getByLabelText('12-lead view'))
    await user.click(screen.getByLabelText('Toggle EtCO2'))
    await user.click(screen.getByLabelText('Back'))
    expect(onTwelveLead).not.toHaveBeenCalled()
    expect(onToggleEtco2).not.toHaveBeenCalled()
    expect(onBack).not.toHaveBeenCalled()
  })

  it('renders decorative labels without button semantics', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Brightness' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Medications' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Analyse (sidebar)' })).not.toBeInTheDocument()
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
