import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { startRenderer } from '@/lib/ecg/renderer'
import { useWaveformRenderer } from '../useWaveformRenderer'

vi.mock('@/lib/ecg/renderer', () => ({
  startRenderer: vi.fn(() => Object.assign(vi.fn(), { setOccluded: vi.fn() })),
}))

const mockStart = vi.mocked(startRenderer)

function Harness({
  value,
  dep,
  occluded = false,
  onReady,
}: {
  value: number
  dep: number
  occluded?: boolean
  onReady?: () => void
}) {
  const ref = useWaveformRenderer(
    { value },
    (get) => ({
      color: '#fff',
      getWaveform: () => ({ data: new Float32Array([get().value]), cycleMs: null }),
      getSignalKey: () => String(get().value),
      getCycleMs: () => get().value,
    }),
    [dep],
    { occluded, onReady },
  )
  return <canvas ref={ref} data-testid="c" />
}

beforeEach(() => {
  mockStart.mockClear()
})

describe('useWaveformRenderer', () => {
  it('starts the renderer once on mount with the built options + canvas', () => {
    render(<Harness value={5} dep={0} />)
    expect(mockStart).toHaveBeenCalledTimes(1)
    const opts = mockStart.mock.calls[0][0]
    expect(opts.canvas).toBeInstanceOf(HTMLCanvasElement)
    expect(opts.getCycleMs()).toBe(5)
    expect(opts.getSignalKey?.()).toBe('5')
  })

  it('exposes the latest live values without restarting the renderer', () => {
    const { rerender } = render(<Harness value={5} dep={0} />)
    const opts = mockStart.mock.calls[0][0]
    rerender(<Harness value={9} dep={0} />)
    expect(mockStart).toHaveBeenCalledTimes(1) // not restarted
    expect(opts.getCycleMs()).toBe(9) // reads current value via getLatest
    expect(opts.getSignalKey?.()).toBe('9')
  })

  it('restarts (cleanup + start) when deps change', () => {
    const { rerender } = render(<Harness value={5} dep={0} />)
    const cleanup = mockStart.mock.results[0].value
    rerender(<Harness value={5} dep={1} />)
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(mockStart).toHaveBeenCalledTimes(2)
  })

  it('cleans up on unmount', () => {
    const { unmount } = render(<Harness value={5} dep={0} />)
    const cleanup = mockStart.mock.results[0].value
    unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('updates occlusion without restarting and forwards readiness', () => {
    const onReady = vi.fn()
    const { rerender } = render(
      <Harness value={5} dep={0} onReady={onReady} />,
    )
    const renderer = mockStart.mock.results[0].value
    const opts = mockStart.mock.calls[0][0]

    rerender(<Harness value={5} dep={0} occluded onReady={onReady} />)

    expect(mockStart).toHaveBeenCalledTimes(1)
    expect(renderer.setOccluded).toHaveBeenCalledWith(true)
    opts.onReady?.()
    expect(onReady).toHaveBeenCalledTimes(1)
  })
})
