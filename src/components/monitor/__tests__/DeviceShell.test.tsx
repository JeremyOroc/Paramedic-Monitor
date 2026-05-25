import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
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
    onToggleEtco2: vi.fn(),
    onLeftAnalyse: vi.fn(),
    onBack: vi.fn(),
    onPatientInfo: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onEnter: vi.fn(),
    twelveLeadActive: false,
    ...overrides,
  }
}

describe('DeviceShell', () => {
  afterEach(() => {
    vi.useRealTimers()
  })
  it('renders the WAGAMI wordmark', () => {
    render(<DeviceShell {...makeProps()} />)
    expect(screen.getByText('WAGAMI')).toBeInTheDocument()
  })

  it('renders the screen slot content', () => {
    render(<DeviceShell {...makeProps()} />)
    expect(screen.getByText('monitor-screen')).toBeInTheDocument()
  })

  it('toggles the physical power button between on and off', () => {
    vi.useFakeTimers()
    render(<DeviceShell {...makeProps()} />)
    const power = screen.getByRole('button', { name: 'Power' })
    expect(power).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(power)
    expect(power).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(power) // → booting
    expect(power).toHaveAttribute('aria-pressed', 'false')
    // Advance past the 2-second boot timer
    act(() => { vi.runAllTimers() })
    expect(power).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders the ANALYZE, CHARGE, and SHOCK buttons', () => {
    render(<DeviceShell {...makeProps()} />)
    expect(screen.getByRole('button', { name: 'Analyze rhythm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Charge defibrillator' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Shock' })).toBeInTheDocument()
  })

  it('renders an inert pacer button on the physical shell', async () => {
    const user = userEvent.setup()
    render(<DeviceShell {...makeProps()} />)
    const pacer = screen.getByRole('button', { name: 'Pacer' })
    expect(pacer).toBeInTheDocument()
    await user.click(pacer)
  })

  it('renders 12-lead, EtCO2, and Back buttons on the physical shell', () => {
    render(<DeviceShell {...makeProps()} />)
    expect(screen.getByRole('button', { name: '12-lead view' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle EtCO2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  it('fires onTwelveLead when the 12-lead button is clicked', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: '12-lead view' }))
    expect(props.onTwelveLead).toHaveBeenCalledTimes(1)
  })

  it('fires onToggleEtco2 when the EtCO2 shell button is clicked', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(props.onToggleEtco2).toHaveBeenCalledTimes(1)
  })

  it('fires onBack when the Back button is clicked', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(props.onBack).toHaveBeenCalledTimes(1)
  })

  it('fires onLeftAnalyse when the left ANALYSE shell button is clicked', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Analyse (sidebar)' }))
    expect(props.onLeftAnalyse).toHaveBeenCalledTimes(1)
    expect(props.onAnalyse).toHaveBeenCalledTimes(0)
  })

  it('shows Patient Info (slot 2) + Back on the left shell in 12-lead view', () => {
    render(<DeviceShell {...makeProps({ twelveLeadActive: true })} />)
    expect(screen.getByRole('button', { name: 'Patient Info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    // main-view keys are gone
    expect(screen.queryByRole('button', { name: '12-lead view' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Toggle EtCO2' })).not.toBeInTheDocument()
  })

  it('fires onPatientInfo when the slot-2 key is clicked in 12-lead view', async () => {
    const user = userEvent.setup()
    const props = makeProps({ twelveLeadActive: true })
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Patient Info' }))
    expect(props.onPatientInfo).toHaveBeenCalledTimes(1)
  })

  it('wires the right-cluster Move up / Move down / Enter buttons', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Move up' }))
    await user.click(screen.getByRole('button', { name: 'Move down' }))
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(props.onMoveUp).toHaveBeenCalledTimes(1)
    expect(props.onMoveDown).toHaveBeenCalledTimes(1)
    expect(props.onEnter).toHaveBeenCalledTimes(1)
  })

  it('keeps non-mapped left shell buttons inert', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Brightness soft key' }))
    await user.click(screen.getByRole('button', { name: 'Treatment soft key' }))
    await user.click(screen.getByRole('button', { name: 'Printer soft key' }))
    expect(props.onTwelveLead).toHaveBeenCalledTimes(0)
    expect(props.onToggleEtco2).toHaveBeenCalledTimes(0)
    expect(props.onLeftAnalyse).toHaveBeenCalledTimes(0)
    expect(props.onBack).toHaveBeenCalledTimes(0)
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
})
