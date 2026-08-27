import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WagamiZScreen } from '@/components/monitor/WagamiZScreen'
import type { VitalActiveState } from '@/types/vitals'

vi.mock('@/components/monitor/ECGCanvas', () => ({
  ECGCanvas: ({ rhythm, hr, connected, cprOverride }: {
    rhythm: string
    hr: number
    connected: boolean
    cprOverride: boolean
  }) => (
    <div
      data-testid="mock-ecg"
      data-rhythm={rhythm}
      data-heart-rate={hr}
      data-connected={connected}
      data-cpr-override={cprOverride}
    />
  ),
}))

vi.mock('@/components/monitor/SecondaryChannel', () => ({
  SecondaryChannel: ({ channel, connected }: { channel: string; connected: boolean }) => (
    <div data-testid={`mock-${channel}`} data-connected={connected} />
  ),
}))

const ACTIVE: VitalActiveState = {
  hr: true,
  bp_sys: true,
  bp_dia: true,
  etco2: true,
  spo2: true,
}

const BASE_PROPS = {
  date: '2026-08-27',
  time: '14:32:10',
  sessionTimer: '00:03:18',
  patientMode: 'adult' as const,
  rhythm: 'nsr' as const,
  heartRate: 72,
  spo2: 98,
  etco2: 35,
  bpSys: 120,
  bpDia: 80,
  joules: 120,
  shockCount: 0,
  spo2Waveform: 'normal' as const,
  etco2Waveform: 'normal' as const,
  active: ACTIVE,
}

describe('WagamiZScreen', () => {
  it('renders the live French monitor state and fixed touch layout', () => {
    render(<WagamiZScreen {...BASE_PROPS} />)

    expect(screen.getByText('27/08/2026')).toBeInTheDocument()
    expect(screen.getByText('14:32:10')).toBeInTheDocument()
    expect(screen.getByText('00:03:18')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'DEA' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MANUEL' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ADULTE' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PNI' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MARQUEUR' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'IMPRIMER' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CAPTURE' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '12 LEAD' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ANALYSER' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Énergie 120 joules' })).toHaveTextContent('120 J')
    expect(screen.getByLabelText('Nombre de chocs')).toHaveTextContent('00')
    expect(screen.getByText('ECG')).toBeInTheDocument()
    expect(screen.queryByText('ÉLECTRODES')).toBeNull()
    expect(screen.getByRole('button', { name: 'Options' })).toHaveTextContent('')
    expect(screen.getByTestId('wagami-z-empty-pni-lane')).toBeInTheDocument()
    expect(screen.getByLabelText('Indice de perfusion')).toHaveTextContent('3.3')

    expect(screen.getByTestId('mock-ecg')).toHaveAttribute('data-heart-rate', '72')
    expect(screen.getByTestId('mock-etco2')).toHaveAttribute('data-connected', 'true')
    expect(screen.getByTestId('mock-spo2')).toHaveAttribute('data-connected', 'true')

    const vitals = screen.getByRole('complementary', { name: 'Signes vitaux' })
    expect(vitals).toHaveTextContent('72')
    expect(vitals).toHaveTextContent('35')
    expect(vitals).toHaveTextContent('98')
    expect(vitals).toHaveTextContent('120/80')
    expect(vitals).toHaveTextContent('(93)')
  })

  it('derives PI decoration from SpO2 signal strength and hides it when off', () => {
    const { rerender } = render(
      <WagamiZScreen {...BASE_PROPS} spo2Waveform="weak" />,
    )
    expect(screen.getByLabelText('Indice de perfusion')).toHaveTextContent('0.5')

    rerender(
      <WagamiZScreen
        {...BASE_PROPS}
        spo2Waveform="off"
        active={{ ...ACTIVE, spo2: false }}
      />,
    )
    expect(screen.queryByLabelText('Indice de perfusion')).toBeNull()
  })

  it('reserves inactive lanes and reports them as OFF', () => {
    render(
      <WagamiZScreen
        {...BASE_PROPS}
        active={{ hr: false, bp_sys: false, bp_dia: false, etco2: false, spo2: false }}
      />,
    )

    const vitals = screen.getByRole('complementary', { name: 'Signes vitaux' })
    expect(within(vitals).getAllByText('OFF')).toHaveLength(4)
    expect(screen.getByTestId('mock-ecg')).toHaveAttribute('data-connected', 'false')
    expect(screen.getByTestId('mock-etco2')).toHaveAttribute('data-connected', 'false')
    expect(screen.getByTestId('mock-spo2')).toHaveAttribute('data-connected', 'false')
  })

  it('flashes alarmed values visually and keeps touch controls inert', () => {
    const { container } = render(
      <WagamiZScreen
        {...BASE_PROPS}
        heartRate={160}
        bpSys={80}
        bpDia={50}
        spo2={85}
        patientMode="pediatric"
      />,
    )

    expect(screen.getByRole('button', { name: 'PÉDIATRIQUE' })).toBeInTheDocument()
    expect(container.querySelectorAll('.vital-alarm-flash')).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: 'ANALYSER' }))
    fireEvent.click(screen.getByRole('button', { name: 'MANUEL' }))
    expect(screen.getByRole('button', { name: 'DEA' })).toHaveClass('bg-wagami-z-action-purple')
    expect(screen.getByRole('button', { name: 'MANUEL' })).not.toHaveClass('bg-wagami-z-action-purple')
  })
})
