import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RightNavCluster } from '../RightNavCluster'

function setup(overrides: Partial<Parameters<typeof RightNavCluster>[0]> = {}) {
  const onTwelveLead = vi.fn()
  const onBack = vi.fn()
  render(
    <RightNavCluster onTwelveLead={onTwelveLead} onBack={onBack} {...overrides} />,
  )
  return { onTwelveLead, onBack }
}

describe('RightNavCluster', () => {
  it('renders all 8 buttons', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Alarm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '12-lead view (right)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move left' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move right' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Snapshot' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('fires onTwelveLead when the 12L button is clicked', async () => {
    const user = userEvent.setup()
    const { onTwelveLead } = setup()
    await user.click(screen.getByRole('button', { name: '12-lead view (right)' }))
    expect(onTwelveLead).toHaveBeenCalledTimes(1)
  })

  it('fires onBack when the Move left arrow is clicked', async () => {
    const user = userEvent.setup()
    const { onBack } = setup()
    await user.click(screen.getByRole('button', { name: 'Move left' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('disables decorative buttons (alarm, home, move-right, enter, snapshot, settings)', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Alarm' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Home' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move right' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Enter' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Snapshot' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeDisabled()
  })
})
