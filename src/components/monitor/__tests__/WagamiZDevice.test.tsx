import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WagamiZDevice, type WagamiZDeviceProps } from '@/components/monitor/WagamiZDevice'

vi.mock('@/components/monitor/WagamiZScreen', () => ({
  WagamiZScreen: () => <div data-testid="mock-wagami-z-screen">Écran actif</div>,
}))

const DEFAULT_PROPS: WagamiZDeviceProps = {
  date: '27/08/2026',
  time: '14:32:10',
  sessionTimer: '00:00:12',
  patientMode: 'adult',
  rhythm: 'nsr',
  heartRate: 72,
  spo2: 98,
  etco2: 35,
  bpSys: 120,
  bpDia: 80,
  joules: 120,
  spo2Waveform: 'normal',
  etco2Waveform: 'normal',
  active: {
    hr: true,
    bp_sys: true,
    bp_dia: true,
    etco2: true,
    spo2: true,
  },
}

describe('WagamiZDevice', () => {
  const originalWidth = window.innerWidth
  const originalHeight = window.innerHeight

  const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
    act(() => window.dispatchEvent(new Event('resize')))
  }

  beforeEach(() => {
    setViewport(1920, 1080)
  })

  afterEach(() => {
    vi.useRealTimers()
    setViewport(originalWidth, originalHeight)
  })

  it('boots from off for two seconds with a centered WAGAMI mark', () => {
    vi.useFakeTimers()
    const onPowerOn = vi.fn()
    const onPowerStateChange = vi.fn()
    render(
      <WagamiZDevice
        {...DEFAULT_PROPS}
        onPowerOn={onPowerOn}
        onPowerStateChange={onPowerStateChange}
      />,
    )

    const device = screen.getByTestId('wagami-z-device')
    expect(device).toHaveAttribute('data-power-state', 'off')
    expect(screen.queryByTestId('mock-wagami-z-screen')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Alimentation' }))
    expect(device).toHaveAttribute('data-power-state', 'booting')
    expect(onPowerStateChange).toHaveBeenCalledWith('booting')
    expect(screen.getByTestId('wagami-z-boot-screen')).toHaveTextContent('WAGAMI')
    expect(onPowerOn).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1999))
    expect(device).toHaveAttribute('data-power-state', 'booting')

    act(() => vi.advanceTimersByTime(1))
    expect(device).toHaveAttribute('data-power-state', 'on')
    expect(screen.getByTestId('mock-wagami-z-screen')).toBeInTheDocument()
    expect(onPowerOn).toHaveBeenCalledOnce()
    expect(onPowerStateChange).toHaveBeenCalledWith('on')
  })

  it('powers off immediately and can reboot', () => {
    vi.useFakeTimers()
    const onPowerOff = vi.fn()
    const onPowerOn = vi.fn()
    render(
      <WagamiZDevice
        {...DEFAULT_PROPS}
        initialPowerState="on"
        onPowerOff={onPowerOff}
        onPowerOn={onPowerOn}
      />,
    )

    const power = screen.getByRole('button', { name: 'Alimentation' })
    fireEvent.click(power)
    expect(screen.getByTestId('wagami-z-device')).toHaveAttribute('data-power-state', 'off')
    expect(onPowerOff).toHaveBeenCalledOnce()

    fireEvent.click(power)
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByTestId('wagami-z-device')).toHaveAttribute('data-power-state', 'on')
    expect(onPowerOn).toHaveBeenCalledOnce()
  })

  it('renders a controlled spectator power state', () => {
    render(
      <WagamiZDevice
        {...DEFAULT_PROPS}
        initialPowerState="off"
        powerStateOverride="on"
      />,
    )

    expect(screen.getByTestId('mock-wagami-z-screen')).toBeInTheDocument()
  })

  it('keeps every physical control except power inert', () => {
    const onPowerOff = vi.fn()
    render(
      <WagamiZDevice
        {...DEFAULT_PROPS}
        initialPowerState="on"
        onPowerOff={onPowerOff}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'CHOC' }))
    fireEvent.click(screen.getByRole('button', { name: 'CHARGE' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sélecteur rotatif' }))

    expect(screen.getByTestId('wagami-z-device')).toHaveAttribute('data-power-state', 'on')
    expect(onPowerOff).not.toHaveBeenCalled()
  })

  it('renders the approved shell landmarks without registered marks', () => {
    render(<WagamiZDevice {...DEFAULT_PROPS} initialPowerState="on" />)

    expect(screen.getByTestId('wagami-z-shell')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-z-screen-bezel')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-z-lower-body')).toBeInTheDocument()
    expect(screen.getByLabelText('Haut-parleur')).toBeInTheDocument()
    expect(screen.getByText('WAGAMI')).toBeInTheDocument()
    expect(screen.getByText('Z')).toBeInTheDocument()
    expect(screen.queryByText('®')).toBeNull()
    expect(screen.getByTestId('wagami-z-device')).not.toHaveClass('min-w-[1024px]')
  })

  it('shows exact state-preserving French guidance for unsupported viewports', () => {
    render(<WagamiZDevice {...DEFAULT_PROPS} initialPowerState="on" />)

    setViewport(768, 1024)
    expect(screen.getByRole('heading', { name: 'Mode paysage requis' })).toBeInTheDocument()
    expect(screen.getByText('Tournez l’iPad pour continuer.')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-z-device')).toHaveAttribute('data-power-state', 'on')

    setViewport(1000, 700)
    expect(screen.getByRole('heading', { name: 'Affichage non pris en charge' })).toBeInTheDocument()
    expect(screen.getByText('Utilisez un iPad compatible en plein écran.')).toBeInTheDocument()

    setViewport(1180, 820)
    expect(screen.getByTestId('wagami-z-shell')).toBeInTheDocument()
    expect(screen.getByTestId('mock-wagami-z-screen')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-z-device')).toHaveAttribute('data-power-state', 'on')
  })
})
