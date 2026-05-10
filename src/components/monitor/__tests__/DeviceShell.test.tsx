import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeviceShell } from '../DeviceShell'

function makeProps(overrides: Partial<Parameters<typeof DeviceShell>[0]> = {}) {
  return {
    screen: <div>monitor-screen</div>,
    defibState: 'idle' as const,
    energy: 120,
    progress: 0,
    canAnalyse: true,
    canCharge: false,
    canShock: false,
    canAdjustEnergy: true,
    onAnalyse: vi.fn(),
    onCharge: vi.fn(),
    onShock: vi.fn(),
    onEnergyUp: vi.fn(),
    onEnergyDown: vi.fn(),
    onTwelveLead: vi.fn(),
    onBack: vi.fn(),
    twelveLeadActive: false,
    ...overrides,
  }
}

describe('DeviceShell', () => {
  it('renders the ZOLL wordmark', () => {
    render(<DeviceShell {...makeProps()} />)
    expect(screen.getByText('ZOLL')).toBeInTheDocument()
  })

  it('renders the screen slot content', () => {
    render(<DeviceShell {...makeProps()} />)
    expect(screen.getByText('monitor-screen')).toBeInTheDocument()
  })

  it('renders the ANALYZE, CHARGE, and SHOCK buttons', () => {
    render(<DeviceShell {...makeProps()} />)
    expect(screen.getByRole('button', { name: 'Analyze rhythm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Charge defibrillator' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Shock' })).toBeInTheDocument()
  })

  it('renders 12-lead and Back buttons in the right nav panel', () => {
    render(<DeviceShell {...makeProps()} />)
    expect(screen.getByRole('button', { name: '12-lead view' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  it('fires onTwelveLead when the 12-lead button is clicked', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: '12-lead view' }))
    expect(props.onTwelveLead).toHaveBeenCalledTimes(1)
  })

  it('fires onBack when the Back button is clicked', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(props.onBack).toHaveBeenCalledTimes(1)
  })

  it('fires onAnalyse when ANALYZE is clicked and canAnalyse is true', async () => {
    const user = userEvent.setup()
    const props = makeProps({ canAnalyse: true })
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Analyze rhythm' }))
    expect(props.onAnalyse).toHaveBeenCalledTimes(1)
  })

  it('does not fire onAnalyse when ANALYZE is disabled', async () => {
    const user = userEvent.setup()
    const props = makeProps({ canAnalyse: false })
    render(<DeviceShell {...props} />)
    const btn = screen.getByRole('button', { name: 'Analyze rhythm' })
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(props.onAnalyse).not.toHaveBeenCalled()
  })

  it('SHOCK button is disabled when canShock is false', () => {
    render(<DeviceShell {...makeProps({ canShock: false })} />)
    expect(screen.getByRole('button', { name: 'Shock' })).toBeDisabled()
  })

  it('fires onShock when SHOCK is clicked and canShock is true', async () => {
    const user = userEvent.setup()
    const props = makeProps({ canShock: true, defibState: 'charged' })
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Shock' }))
    expect(props.onShock).toHaveBeenCalledTimes(1)
  })

  it('displays the current energy level', () => {
    render(<DeviceShell {...makeProps({ energy: 200 })} />)
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('highlights the 12-lead button when twelveLeadActive is true', () => {
    render(<DeviceShell {...makeProps({ twelveLeadActive: true })} />)
    const btn = screen.getByRole('button', { name: '12-lead view' })
    expect(btn).toHaveClass('bg-[#4a90b8]')
  })
})
