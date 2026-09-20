import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_VITALS } from '@/types/vitals'
import { WagamiAWaveformWorkspace } from '../WagamiAWaveformWorkspace'

vi.mock('../ECGCanvas', () => ({
  ECGCanvas: ({ palette, rhythm, connected, cprOverride }: { palette: string; rhythm: string; connected: boolean; cprOverride: boolean }) => <div data-testid="a-ecg-mock" data-palette={palette} data-rhythm={rhythm} data-connected={String(connected)} data-cpr-override={String(cprOverride)} />,
}))
vi.mock('../SecondaryChannel', () => ({
  SecondaryChannel: ({ channel, palette, connected }: { channel: string; palette: string; connected: boolean }) => <div data-testid={`a-${channel}-mock`} data-palette={palette} data-connected={String(connected)} />,
}))

const vitals = { ...DEFAULT_VITALS }
const active = { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true }

describe('Wagami A live waveform workspace', () => {
  it('uses A palette on three reused live renderers without a touchscreen mute action', () => {
    render(<WagamiAWaveformWorkspace vitals={vitals} active={active} alarms={[]} />)

    expect(screen.getByTestId('a-ecg-mock')).toHaveAttribute('data-palette', 'wagamiA')
    expect(screen.getByTestId('a-spo2-mock')).toHaveAttribute('data-palette', 'wagamiA')
    expect(screen.getByTestId('a-etco2-mock')).toHaveAttribute('data-palette', 'wagamiA')
    expect(screen.queryByRole('button', { name: 'Couper tous les sons' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('MODE ADULTE')
    expect(screen.getByRole('status')).not.toHaveTextContent('ALARME')
  })

  it('keeps on-screen alarm text independently of the shell mute action', () => {
    render(<WagamiAWaveformWorkspace vitals={vitals} active={active} alarms={['hr', 'spo2']} />)

    expect(screen.getByRole('status')).toHaveTextContent('MODE ADULTE · ALARME · FC / SpO₂')
    expect(screen.queryByRole('button', { name: 'Réactiver les sons' })).not.toBeInTheDocument()
  })

  it('disconnects the ECG renderer when the confirmed FC channel is inactive', () => {
    render(<WagamiAWaveformWorkspace vitals={vitals} active={{ ...active, hr: false }} alarms={[]} />)

    expect(screen.getByTestId('a-ecg-mock')).toHaveAttribute('data-connected', 'false')
  })

  it('passes an active CPR override through the A ECG renderer', () => {
    render(<WagamiAWaveformWorkspace vitals={vitals} active={active} alarms={[]} cprOverride />)
    expect(screen.getByTestId('a-ecg-mock')).toHaveAttribute('data-cpr-override', 'true')
  })

  it('shows English mode and fixed alarm order above the waveforms', () => {
    render(<WagamiAWaveformWorkspace vitals={vitals} active={active} alarms={['bp', 'hr', 'spo2']} patientMode="neonate" locale="en" />)

    expect(screen.getByRole('status')).toHaveTextContent('MODE NEONATAL · ALARM · HR / SpO₂ / NIBP')
  })
})
