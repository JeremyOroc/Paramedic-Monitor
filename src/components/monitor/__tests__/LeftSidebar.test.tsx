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
  it('fires onTwelveLead when the 12-lead button is clicked', async () => {
    const user = userEvent.setup()
    const { onTwelveLead } = setup()
    await user.click(screen.getByRole('button', { name: '12-lead view' }))
    expect(onTwelveLead).toHaveBeenCalledTimes(1)
  })

  it('fires onToggleEtco2 when the EtCO2 button is clicked', async () => {
    const user = userEvent.setup()
    const { onToggleEtco2 } = setup()
    await user.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(onToggleEtco2).toHaveBeenCalledTimes(1)
  })

  it('fires onBack when the back button is clicked', async () => {
    const user = userEvent.setup()
    const { onBack } = setup()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('disables decorative buttons (brightness, medications, analyse, print)', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Brightness' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Medications' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Analyse (sidebar)' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Print' })).toBeDisabled()
  })

  it('marks the 12-lead button as active when twelveLeadActive is true', () => {
    setup({ twelveLeadActive: true })
    expect(screen.getByRole('button', { name: '12-lead view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
