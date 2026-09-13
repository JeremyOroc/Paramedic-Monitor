import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ContinuousWaveformSurface } from '../ContinuousWaveformSurface'

describe('ContinuousWaveformSurface', () => {
  it('keeps the same waveform mounted beneath a temporary surface', () => {
    const { rerender } = render(
      <ContinuousWaveformSurface
        temporarySurfaceActive={false}
        waveform={<canvas data-testid="waveform" />}
        temporarySurface={<div>12-lead</div>}
      />,
    )
    const waveform = screen.getByTestId('waveform')

    rerender(
      <ContinuousWaveformSurface
        temporarySurfaceActive
        waveform={<canvas data-testid="waveform" />}
        temporarySurface={<div>12-lead</div>}
      />,
    )

    expect(screen.getByTestId('waveform')).toBe(waveform)
    expect(screen.getByTestId('continuous-waveform-layer')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(screen.getByTestId('temporary-monitor-surface')).toHaveTextContent(
      '12-lead',
    )

    rerender(
      <ContinuousWaveformSurface
        temporarySurfaceActive={false}
        waveform={<canvas data-testid="waveform" />}
        temporarySurface={<div>12-lead</div>}
      />,
    )

    expect(screen.getByTestId('waveform')).toBe(waveform)
    expect(screen.getByTestId('continuous-waveform-layer')).not.toHaveAttribute(
      'aria-hidden',
    )
    expect(screen.queryByTestId('temporary-monitor-surface')).not.toBeInTheDocument()
  })
})
