import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { LeadCell } from '../LeadCell'

const { useWaveformRenderer } = vi.hoisted(() => ({
  useWaveformRenderer: vi.fn((...args: unknown[]) => {
    void args
    return { current: null }
  }),
}))

vi.mock('@/hooks/useWaveformRenderer', () => ({ useWaveformRenderer }))

describe('LeadCell', () => {
  it('shares sweep timing and forwards persistent-surface activity', () => {
    const onReady = vi.fn()
    render(
      <LeadCell
        label="V1"
        rhythm="nsr"
        hr={80}
        occluded
        onReady={onReady}
      />,
    )

    expect(screen.getByTestId('lead-canvas-V1')).toBeInTheDocument()
    expect(useWaveformRenderer).toHaveBeenCalledTimes(1)
    const call = useWaveformRenderer.mock.calls[0] as unknown as [
      unknown,
      (get: () => { rhythm: 'nsr'; hr: number }) => {
        synchronizeSweep?: boolean
        cycleJitter?: number
      },
      unknown[],
      { occluded: boolean; onReady: () => void },
    ]
    const buildOptions = call[1]
    const options = buildOptions(() => ({ rhythm: 'nsr', hr: 80 }))
    expect(options).toMatchObject({
      synchronizeSweep: true,
      cycleJitter: 0,
    })
    expect(call[3]).toEqual({
      occluded: true,
      onReady,
    })
  })
})
