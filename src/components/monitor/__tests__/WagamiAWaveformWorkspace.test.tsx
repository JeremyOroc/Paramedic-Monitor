import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_VITALS } from '@/types/vitals'
import { WagamiAWaveformWorkspace } from '../WagamiAWaveformWorkspace'

vi.mock('../ECGCanvas', () => ({
  ECGCanvas: ({ palette, rhythm, connected }: { palette: string; rhythm: string; connected: boolean }) => <div data-testid="a-ecg-mock" data-palette={palette} data-rhythm={rhythm} data-connected={String(connected)} />,
}))
vi.mock('../SecondaryChannel', () => ({
  SecondaryChannel: ({ channel, palette, connected }: { channel: string; palette: string; connected: boolean }) => <div data-testid={`a-${channel}-mock`} data-palette={palette} data-connected={String(connected)} />,
}))

const vitals = { ...DEFAULT_VITALS }
const active = { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true }

describe('Wagami A live waveform workspace', () => {
  it('uses A palette on three reused live renderers and places mute left of the dock', () => {
    render(<WagamiAWaveformWorkspace vitals={vitals} active={active} alarms={[]} />)

    expect(screen.getByTestId('a-ecg-mock')).toHaveAttribute('data-palette', 'wagamiA')
    expect(screen.getByTestId('a-spo2-mock')).toHaveAttribute('data-palette', 'wagamiA')
    expect(screen.getByTestId('a-etco2-mock')).toHaveAttribute('data-palette', 'wagamiA')
    expect(screen.getByRole('button', { name: 'Couper tous les sons' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('AUCUNE ALARME')
  })

  it('keeps on-screen alarm text even when audio is muted', () => {
    render(<WagamiAWaveformWorkspace vitals={vitals} active={active} alarms={['hr', 'spo2']} muted onMute={() => {}} />)

    expect(screen.getByRole('status')).toHaveTextContent('ALARME · FC / SpO₂')
    expect(screen.getByRole('button', { name: 'Réactiver les sons' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('disconnects the ECG renderer when the confirmed FC channel is inactive', () => {
    render(<WagamiAWaveformWorkspace vitals={vitals} active={{ ...active, hr: false }} alarms={[]} />)

    expect(screen.getByTestId('a-ecg-mock')).toHaveAttribute('data-connected', 'false')
  })
})
