import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startRenderer } from '../renderer'
import { ECG_RHYTHMS } from '../rhythms'

function fakeCtx() {
  return {
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'round' as CanvasLineJoin,
    lineCap: 'round' as CanvasLineCap,
  } as unknown as CanvasRenderingContext2D
}

function makeCanvas() {
  const canvas = document.createElement('canvas')
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({
      width: 400,
      height: 200,
      top: 0,
      left: 0,
      right: 400,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  })
  vi.spyOn(canvas, 'getContext').mockImplementation(
    () => fakeCtx() as unknown as CanvasRenderingContext2D | null,
  )
  return canvas
}

describe('startRenderer', () => {
  let rafCalls: FrameRequestCallback[]
  let rafCancelled: number[]

  beforeEach(() => {
    rafCalls = []
    rafCancelled = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCalls.push(cb)
      return rafCalls.length
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafCancelled.push(id)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('schedules a frame and cancels it on cleanup', () => {
    const canvas = makeCanvas()
    const stop = startRenderer({
      canvas,
      color: '#00ff41',
      getWaveform: () => ECG_RHYTHMS.nsr,
      getCycleMs: () => 750,
    })
    expect(rafCalls.length).toBeGreaterThan(0)
    stop()
    expect(rafCancelled.length).toBeGreaterThan(0)
  })

  it('no-ops when 2d context is unavailable', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue(null)
    const stop = startRenderer({
      canvas,
      color: '#fff',
      getWaveform: () => ECG_RHYTHMS.nsr,
      getCycleMs: () => 1000,
    })
    expect(() => stop()).not.toThrow()
  })

  it('re-reads getWaveform after a full cycle wraps', () => {
    const canvas = makeCanvas()
    const getWaveform = vi.fn(() => ECG_RHYTHMS.nsr)
    const stop = startRenderer({
      canvas,
      color: '#00ff41',
      getWaveform,
      getCycleMs: () => 50,
    })
    const initialCalls = getWaveform.mock.calls.length
    // First raf was scheduled inside startRenderer; invoke the inner tick
    // by advancing twice with dt > cycleMs so we cross a wrap.
    const first = rafCalls.shift()
    expect(first).toBeTypeOf('function')
    first!(0)
    const second = rafCalls.shift()
    expect(second).toBeTypeOf('function')
    second!(200)
    expect(getWaveform.mock.calls.length).toBeGreaterThan(initialCalls)
    stop()
  })
})
