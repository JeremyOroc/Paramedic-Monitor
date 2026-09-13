import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ContinuousWaveformSurface } from '../ContinuousWaveformSurface'

describe('ContinuousWaveformSurface', () => {
  const renderWaveform = ({
    occluded,
    onReady,
  }: {
    occluded: boolean
    onReady: () => void
  }) => (
    <>
      <canvas data-testid="waveform" data-occluded={String(occluded)} />
      <button type="button" onClick={onReady}>Waveform ready</button>
    </>
  )

  const renderTemporary = ({
    occluded,
    onReady,
  }: {
    occluded: boolean
    onReady: () => void
  }) => (
    <>
      <canvas data-testid="temporary-waveform" data-occluded={String(occluded)} />
      <button type="button" onClick={onReady}>12-lead ready</button>
    </>
  )

  it('keeps both waveform surfaces mounted and reveals each only when ready', async () => {
    const { rerender } = render(
      <ContinuousWaveformSurface
        temporarySurfaceActive={false}
        waveform={renderWaveform}
        temporarySurface={renderTemporary}
      />,
    )
    const waveformElement = screen.getByTestId('waveform')
    expect(screen.queryByTestId('temporary-waveform')).not.toBeInTheDocument()

    rerender(
      <ContinuousWaveformSurface
        temporarySurfaceActive
        waveform={renderWaveform}
        temporarySurface={renderTemporary}
      />,
    )

    const temporaryElement = screen.getByTestId('temporary-waveform')
    expect(screen.getByTestId('waveform')).toBe(waveformElement)
    expect(screen.getByTestId('waveform')).toHaveAttribute('data-occluded', 'true')
    expect(screen.getByTestId('continuous-waveform-layer')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(screen.getByTestId('temporary-monitor-surface')).not.toHaveAttribute(
      'aria-hidden',
    )

    rerender(
      <ContinuousWaveformSurface
        temporarySurfaceActive={false}
        waveform={renderWaveform}
        temporarySurface={renderTemporary}
      />,
    )

    expect(screen.getByTestId('waveform')).toBe(waveformElement)
    expect(screen.getByTestId('temporary-waveform')).toBe(temporaryElement)
    expect(screen.getByTestId('waveform')).toHaveAttribute('data-occluded', 'false')
    expect(screen.getByTestId('temporary-waveform')).toHaveAttribute(
      'data-occluded',
      'false',
    )
    expect(screen.getByTestId('continuous-waveform-layer')).toHaveAttribute(
      'aria-hidden',
      'true',
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Waveform ready', hidden: true }),
    )

    await waitFor(() => {
      expect(screen.getByTestId('continuous-waveform-layer')).not.toHaveAttribute(
        'aria-hidden',
      )
    })
    expect(screen.getByTestId('temporary-monitor-surface')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(screen.getByTestId('temporary-waveform')).toBe(temporaryElement)
    expect(screen.getByTestId('temporary-waveform')).toHaveAttribute(
      'data-occluded',
      'true',
    )

    rerender(
      <ContinuousWaveformSurface
        temporarySurfaceActive
        waveform={renderWaveform}
        temporarySurface={renderTemporary}
      />,
    )

    expect(screen.getByTestId('temporary-waveform')).toBe(temporaryElement)
    expect(screen.getByTestId('temporary-monitor-surface')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(screen.getByTestId('temporary-waveform')).toHaveAttribute(
      'data-occluded',
      'false',
    )

    fireEvent.click(
      screen.getByRole('button', { name: '12-lead ready', hidden: true }),
    )

    await waitFor(() => {
      expect(screen.getByTestId('temporary-monitor-surface')).not.toHaveAttribute(
        'aria-hidden',
      )
    })
    expect(screen.getByTestId('continuous-waveform-layer')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(screen.getByTestId('waveform')).toBe(waveformElement)
    expect(screen.getByTestId('waveform')).toHaveAttribute('data-occluded', 'true')
  })
})
