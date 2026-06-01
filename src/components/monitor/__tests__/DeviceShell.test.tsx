import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeviceShell } from '../DeviceShell'
import type { DefibState } from '@/hooks/useDefibSequence'

type Overrides = {
  twelveLeadActive?: boolean
  captureLock?: boolean
  defib?: Partial<{
    state: DefibState
    energy: number
    progress: number
    canAnalyse: boolean
    canCharge: boolean
    canShock: boolean
    canAdjustEnergy: boolean
  }>
  nav?: Partial<{
    onMoveUp: () => void
    onMoveDown: () => void
    onEnter: () => void
  }>
}

function makeProps(overrides: Overrides = {}) {
  const defib = {
    state: 'idle' as DefibState,
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
    ...overrides.defib,
  }
  const softKeys = {
    onTwelveLead: vi.fn(),
    onToggleEtco2: vi.fn(),
    onTreatment: vi.fn(),
    onLeftAnalyse: vi.fn(),
    onBack: vi.fn(),
    onPatientInfo: vi.fn(),
    onCaptureTwelveLead: vi.fn(),
    onPrint: vi.fn(),
  }
  const nav = {
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onEnter: vi.fn(),
    ...overrides.nav,
  }
  return {
    screen: <div>monitor-screen</div>,
    twelveLeadActive: overrides.twelveLeadActive ?? false,
    captureLock: overrides.captureLock,
    defib,
    softKeys,
    nav,
  }
}

describe('DeviceShell', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  function turnPowerOff() {
    fireEvent.click(screen.getByRole('button', { name: 'Power' }))
  }

  function mockRandomSequence(values: number[]) {
    let index = 0
    return vi.spyOn(Math, 'random').mockImplementation(() => values[index++] ?? 0.5)
  }

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
    // Advance past the 2-second boot timer.
    act(() => { vi.advanceTimersByTime(2000) })
    expect(power).toHaveAttribute('aria-pressed', 'true')
  })

  it('does not render off-state its_me immediately after power-off', () => {
    vi.useFakeTimers()
    mockRandomSequence([0.5])
    render(<DeviceShell {...makeProps()} />)

    turnPowerOff()

    expect(screen.queryByTestId('off-its-me-video')).not.toBeInTheDocument()
    expect(screen.queryByTestId('off-its-me-audio')).not.toBeInTheDocument()
  })

  it('keeps the powered-off screen black when the 1/100 its_me roll fails', () => {
    vi.useFakeTimers()
    mockRandomSequence([0.5, 0.5])
    render(<DeviceShell {...makeProps()} />)

    turnPowerOff()
    act(() => { vi.advanceTimersByTime(1000) })

    expect(screen.queryByTestId('off-its-me-video')).not.toBeInTheDocument()
    expect(screen.queryByTestId('off-its-me-audio')).not.toBeInTheDocument()
  })

  it('plays off-state its_me when the 1/100 roll succeeds', () => {
    vi.useFakeTimers()
    mockRandomSequence([0.5, 0, 0.5])
    render(<DeviceShell {...makeProps()} />)

    turnPowerOff()
    act(() => { vi.advanceTimersByTime(1000) })

    expect(screen.getByTestId('off-its-me-video')).toHaveAttribute('src', '/videos/its_me.mp4')
    expect(screen.getByTestId('off-its-me-audio')).toHaveAttribute('src', '/audio/its_me.mp3')
  })

  it('stops an off-state its_me burst after its random 500-5000ms duration', () => {
    vi.useFakeTimers()
    mockRandomSequence([0.5, 0, 0])
    render(<DeviceShell {...makeProps()} />)

    turnPowerOff()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByTestId('off-its-me-video')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(499) })
    expect(screen.getByTestId('off-its-me-video')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(1) })
    expect(screen.queryByTestId('off-its-me-video')).not.toBeInTheDocument()
  })

  it('pauses off-state its_me chance rolls during playback and resumes afterward', () => {
    vi.useFakeTimers()
    const random = mockRandomSequence([
      0.5, 0, 1, // Golden miss, off-state hit, 5000ms duration.
      0.5, 0.5, 0.5, 0.5, 0.5, // Golden misses while its_me is active.
      0.5, 0, 0.5, // Golden miss, off-state hit after the burst ends, next duration.
    ])
    render(<DeviceShell {...makeProps()} />)

    turnPowerOff()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByTestId('off-its-me-video')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.getByTestId('off-its-me-video')).toBeInTheDocument()
    expect(random).toHaveBeenCalledTimes(7)

    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.queryByTestId('off-its-me-video')).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByTestId('off-its-me-video')).toBeInTheDocument()
  })

  it('cancels an active off-state its_me burst when powering on', () => {
    vi.useFakeTimers()
    mockRandomSequence([0.5, 0, 1])
    render(<DeviceShell {...makeProps()} />)

    turnPowerOff()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByTestId('off-its-me-video')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Power' }))

    expect(screen.queryByTestId('off-its-me-video')).not.toBeInTheDocument()
  })

  it('lets Golden Freddy cancel and block off-state its_me bursts', () => {
    vi.useFakeTimers()
    mockRandomSequence([0, 0, 1])
    render(<DeviceShell {...makeProps()} />)

    turnPowerOff()
    act(() => { vi.advanceTimersByTime(1000) })

    expect(screen.queryByTestId('off-its-me-video')).not.toBeInTheDocument()
    expect(document.querySelector('video[src="/videos/golden_freddy.mp4"]')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.queryByTestId('off-its-me-video')).not.toBeInTheDocument()
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
    expect(props.softKeys.onTwelveLead).toHaveBeenCalledTimes(1)
  })

  it('fires onToggleEtco2 when the EtCO2 shell button is clicked', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Toggle EtCO2' }))
    expect(props.softKeys.onToggleEtco2).toHaveBeenCalledTimes(1)
  })

  it('fires onBack when the Back button is clicked', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(props.softKeys.onBack).toHaveBeenCalledTimes(1)
  })

  it('fires onLeftAnalyse when the left CALL INFO shell button is clicked', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Call Info (sidebar)' }))
    expect(props.softKeys.onLeftAnalyse).toHaveBeenCalledTimes(1)
    expect(props.defib.onAnalyse).toHaveBeenCalledTimes(0)
  })

  it('maps slot 2 → Patient Info and slot 7 → Back in 12-lead view', () => {
    render(<DeviceShell {...makeProps({ twelveLeadActive: true })} />)
    expect(screen.getByRole('button', { name: 'Patient Info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    // the main-view functions are not mapped here
    expect(screen.queryByRole('button', { name: '12-lead view' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Toggle EtCO2' })).not.toBeInTheDocument()
  })

  it('keeps all physical left soft keys visible in 12-lead view', () => {
    render(<DeviceShell {...makeProps({ twelveLeadActive: true })} />)
    // slot 1 is the Capture key; the still-unassigned slots remain present too
    expect(screen.getByRole('button', { name: 'Capture 12-lead' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Soft key 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Soft key 6' })).toBeInTheDocument()
  })

  it('fires onPatientInfo when the slot-2 key is clicked in 12-lead view', async () => {
    const user = userEvent.setup()
    const props = makeProps({ twelveLeadActive: true })
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Patient Info' }))
    expect(props.softKeys.onPatientInfo).toHaveBeenCalledTimes(1)
  })

  it('fires onCaptureTwelveLead when the slot-1 key is clicked in 12-lead view', async () => {
    const user = userEvent.setup()
    const props = makeProps({ twelveLeadActive: true })
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Capture 12-lead' }))
    expect(props.softKeys.onCaptureTwelveLead).toHaveBeenCalledTimes(1)
  })

  it('locks every control except Back when captureLock is set', async () => {
    const user = userEvent.setup()
    const props = makeProps({ twelveLeadActive: true, captureLock: true })
    render(<DeviceShell {...props} />)

    await user.click(screen.getByRole('button', { name: 'Capture 12-lead' }))
    await user.click(screen.getByRole('button', { name: 'Patient Info' }))
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await user.click(screen.getByRole('button', { name: 'Move up' }))
    expect(props.softKeys.onCaptureTwelveLead).toHaveBeenCalledTimes(0)
    expect(props.softKeys.onPatientInfo).toHaveBeenCalledTimes(0)
    expect(props.nav.onEnter).toHaveBeenCalledTimes(0)
    expect(props.nav.onMoveUp).toHaveBeenCalledTimes(0)

    // Defib controls are disabled too.
    expect(screen.getByRole('button', { name: 'Analyze rhythm' })).toBeDisabled()

    // Back still works.
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(props.softKeys.onBack).toHaveBeenCalledTimes(1)
  })

  it('keeps unmapped 12-lead soft keys inert', async () => {
    const user = userEvent.setup()
    const props = makeProps({ twelveLeadActive: true })
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Soft key 3' }))
    await user.click(screen.getByRole('button', { name: 'Soft key 4' }))
    expect(props.softKeys.onPatientInfo).toHaveBeenCalledTimes(0)
    expect(props.softKeys.onBack).toHaveBeenCalledTimes(0)
    expect(props.softKeys.onCaptureTwelveLead).toHaveBeenCalledTimes(0)
    expect(props.softKeys.onToggleEtco2).toHaveBeenCalledTimes(0)
  })

  it('wires the right-cluster Move up / Move down / Enter buttons', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Move up' }))
    await user.click(screen.getByRole('button', { name: 'Move down' }))
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(props.nav.onMoveUp).toHaveBeenCalledTimes(1)
    expect(props.nav.onMoveDown).toHaveBeenCalledTimes(1)
    expect(props.nav.onEnter).toHaveBeenCalledTimes(1)
  })

  it('keeps non-mapped left shell buttons inert', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Brightness soft key' }))
    await user.click(screen.getByRole('button', { name: 'Treatment soft key' }))
    expect(props.softKeys.onTwelveLead).toHaveBeenCalledTimes(0)
    expect(props.softKeys.onToggleEtco2).toHaveBeenCalledTimes(0)
    expect(props.softKeys.onLeftAnalyse).toHaveBeenCalledTimes(0)
    expect(props.softKeys.onBack).toHaveBeenCalledTimes(0)
  })

  it('fires onPrint when the Printer soft key is clicked in the main view', async () => {
    const user = userEvent.setup()
    const props = makeProps()
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Printer soft key' }))
    expect(props.softKeys.onPrint).toHaveBeenCalledTimes(1)
  })

  it('fires onAnalyse when ANALYZE is clicked and canAnalyse is true', async () => {
    const user = userEvent.setup()
    const props = makeProps({ defib: { canAnalyse: true } })
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Analyze rhythm' }))
    expect(props.defib.onAnalyse).toHaveBeenCalledTimes(1)
  })

  it('does not fire onAnalyse when ANALYZE is disabled', async () => {
    const user = userEvent.setup()
    const props = makeProps({ defib: { canAnalyse: false } })
    render(<DeviceShell {...props} />)
    const btn = screen.getByRole('button', { name: 'Analyze rhythm' })
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(props.defib.onAnalyse).not.toHaveBeenCalled()
  })

  it('SHOCK button is disabled when canShock is false', () => {
    render(<DeviceShell {...makeProps({ defib: { canShock: false } })} />)
    expect(screen.getByRole('button', { name: 'Shock' })).toBeDisabled()
  })

  it('fires onShock when SHOCK is clicked and canShock is true', async () => {
    const user = userEvent.setup()
    const props = makeProps({ defib: { canShock: true, state: 'charged' } })
    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Shock' }))
    expect(props.defib.onShock).toHaveBeenCalledTimes(1)
  })

  it('displays the current energy level', () => {
    render(<DeviceShell {...makeProps({ defib: { energy: 200 } })} />)
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('fires right-side navigation handlers from the physical shell', async () => {
    const user = userEvent.setup()
    const props = makeProps({
      nav: {
        onMoveUp: vi.fn(),
        onMoveDown: vi.fn(),
        onEnter: vi.fn(),
      },
    })

    render(<DeviceShell {...props} />)
    await user.click(screen.getByRole('button', { name: 'Move up' }))
    await user.click(screen.getByRole('button', { name: 'Move down' }))
    await user.click(screen.getByRole('button', { name: 'Enter' }))

    expect(props.nav.onMoveUp).toHaveBeenCalledTimes(1)
    expect(props.nav.onMoveDown).toHaveBeenCalledTimes(1)
    expect(props.nav.onEnter).toHaveBeenCalledTimes(1)
  })
})
