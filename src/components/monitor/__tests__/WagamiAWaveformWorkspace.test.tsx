import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_VITALS } from '@/types/vitals'
import { WagamiAWaveformWorkspace } from '../WagamiAWaveformWorkspace'

vi.mock('../ECGCanvas', () => ({
  ECGCanvas: ({ palette, rhythm, connected, cprOverride, onReady, readyOnStart }: { palette: string; rhythm: string; connected: boolean; cprOverride: boolean; onReady?: () => void; readyOnStart?: boolean }) => <div data-testid="a-ecg-mock" data-palette={palette} data-rhythm={rhythm} data-connected={String(connected)} data-cpr-override={String(cprOverride)} data-ready-on-start={String(readyOnStart)}><button type="button" onClick={onReady}>ECG ready</button></div>,
}))
vi.mock('../SecondaryChannel', () => ({
  SecondaryChannel: ({ channel, palette, connected, onReady, readyOnStart }: { channel: string; palette: string; connected: boolean; onReady?: () => void; readyOnStart?: boolean }) => <div data-testid={`a-${channel}-mock`} data-palette={palette} data-connected={String(connected)} data-ready-on-start={String(readyOnStart)}><button type="button" onClick={onReady}>{channel} ready</button></div>,
}))

const vitals = { ...DEFAULT_VITALS }
const active = { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true }

describe('Wagami A live waveform workspace', () => {
  it('uses A palette on three reused live renderers without a touchscreen mute action', () => {
    render(<WagamiAWaveformWorkspace vitals={vitals} active={active} />)

    expect(screen.getByTestId('a-ecg-mock')).toHaveAttribute('data-palette', 'wagamiA')
    expect(screen.getByTestId('a-spo2-mock')).toHaveAttribute('data-palette', 'wagamiA')
    expect(screen.getByTestId('a-etco2-mock')).toHaveAttribute('data-palette', 'wagamiA')
    expect(screen.queryByRole('button', { name: 'Couper tous les sons' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('wagami-a-clinical-status-line')).not.toBeInTheDocument()
  })

  it('disconnects the ECG renderer when the confirmed FC channel is inactive', () => {
    render(<WagamiAWaveformWorkspace vitals={vitals} active={{ ...active, hr: false }} />)

    expect(screen.getByTestId('a-ecg-mock')).toHaveAttribute('data-connected', 'false')
  })

  it('passes an active CPR override through the A ECG renderer', () => {
    render(<WagamiAWaveformWorkspace vitals={vitals} active={active} cprOverride />)
    expect(screen.getByTestId('a-ecg-mock')).toHaveAttribute('data-cpr-override', 'true')
  })

  it('waits for every connected channel before revealing each reconstructed sweep', () => {
    const onReady = vi.fn()
    const { rerender } = render(<WagamiAWaveformWorkspace vitals={vitals} active={active} onReady={onReady} />)

    expect(screen.getByTestId('a-ecg-mock')).toHaveAttribute('data-ready-on-start', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'ECG ready' }))
    fireEvent.click(screen.getByRole('button', { name: 'spo2 ready' }))
    expect(onReady).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'etco2 ready' }))
    expect(onReady).toHaveBeenCalledTimes(1)

    rerender(<WagamiAWaveformWorkspace vitals={vitals} active={active} occluded onReady={onReady} />)
    rerender(<WagamiAWaveformWorkspace vitals={vitals} active={active} onReady={onReady} />)
    fireEvent.click(screen.getByRole('button', { name: 'ECG ready' }))
    fireEvent.click(screen.getByRole('button', { name: 'spo2 ready' }))
    expect(onReady).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'etco2 ready' }))
    expect(onReady).toHaveBeenCalledTimes(2)
  })

  it('does not wait for a disconnected channel', () => {
    const onReady = vi.fn()
    render(<WagamiAWaveformWorkspace vitals={vitals} active={{ ...active, spo2: false }} onReady={onReady} />)
    fireEvent.click(screen.getByRole('button', { name: 'ECG ready' }))
    expect(onReady).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'etco2 ready' }))
    expect(onReady).toHaveBeenCalledTimes(1)
  })
})
