import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { WaveformPanel } from '../WaveformPanel'

vi.mock('../ECGCanvas', () => ({
  ECGCanvas: ({
    occluded,
    onReady,
  }: {
    occluded?: boolean
    onReady?: () => void
  }) => (
    <button type="button" data-occluded={String(occluded)} onClick={onReady}>
      ECG ready
    </button>
  ),
}))

vi.mock('../SecondaryChannel', () => ({
  SecondaryChannel: ({
    channel,
    occluded,
    onReady,
  }: {
    channel: 'spo2' | 'etco2'
    occluded?: boolean
    onReady?: () => void
  }) => (
    <button type="button" data-occluded={String(occluded)} onClick={onReady}>
      {channel} ready
    </button>
  ),
}))

const baseProps = {
  secondaryChannel: 'spo2' as const,
  rhythm: 'nsr' as const,
  hr: 80,
  spo2: 98,
  etco2: 35,
  spo2Waveform: 'normal' as const,
  etco2Waveform: 'normal' as const,
}

describe('WaveformPanel readiness', () => {
  it('reports each re-entry only after every live renderer is ready', () => {
    const onReady = vi.fn()
    const { rerender } = render(
      <WaveformPanel {...baseProps} occluded onReady={onReady} />,
    )

    rerender(<WaveformPanel {...baseProps} onReady={onReady} />)
    fireEvent.click(screen.getByRole('button', { name: 'ECG ready' }))
    expect(onReady).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'spo2 ready' }))
    expect(onReady).toHaveBeenCalledTimes(1)

    rerender(<WaveformPanel {...baseProps} occluded onReady={onReady} />)
    rerender(<WaveformPanel {...baseProps} onReady={onReady} />)
    fireEvent.click(screen.getByRole('button', { name: 'ECG ready' }))
    expect(onReady).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'spo2 ready' }))
    expect(onReady).toHaveBeenCalledTimes(2)
  })
})
