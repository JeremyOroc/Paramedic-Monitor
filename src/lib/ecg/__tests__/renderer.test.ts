import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startRenderer } from '../renderer'
import { ECG_RHYTHMS } from '../rhythms'

function fakeCtx() {
  return {
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(),
      width: 400,
      height: 200,
      colorSpace: 'srgb',
    })),
    putImageData: vi.fn(),
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

  const setDocumentVisibility = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: state,
    })
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: state === 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  }

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
    setDocumentVisibility('visible')
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

  it('switches waveform immediately when the signal key changes', () => {
    const canvas = makeCanvas()
    let key = 'torsades'
    const torsades = { data: new Float32Array([0.8, -0.8]), cycleMs: 4000 }
    const nsr = { data: new Float32Array([0.05, 0.05]), cycleMs: 750 }
    const getWaveform = vi.fn(() => (key === 'torsades' ? torsades : nsr))
    const stop = startRenderer({
      canvas,
      color: '#00ff41',
      getWaveform,
      getSignalKey: () => key,
      getCycleMs: () => (key === 'torsades' ? 4000 : 750),
      cycleJitter: 0,
      ampJitter: 0,
    })
    const initialCalls = getWaveform.mock.calls.length
    const first = rafCalls.shift()
    expect(first).toBeTypeOf('function')
    first!(0)

    key = 'nsr'
    const second = rafCalls.shift()
    expect(second).toBeTypeOf('function')
    second!(16)

    expect(getWaveform.mock.calls.length).toBeGreaterThan(initialCalls)
    expect(getWaveform.mock.results.at(-1)?.value).toBe(nsr)
    stop()
  })

  it('ignores resize jitter, rejects transients, and preserves a stable resize', () => {
    const ctx = fakeCtx()
    const canvas = document.createElement('canvas')
    let rectW = 400
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: rectW, height: 200, top: 0, left: 0, right: rectW, bottom: 200, x: 0, y: 0,
        toJSON: () => ({}),
      }),
    })
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    const waveform = {
      data: new Float32Array([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]),
      cycleMs: 10_000,
    }
    const getWaveform = vi.fn(() => waveform)

    const stop = startRenderer({
      canvas,
      color: '#00ff41',
      getWaveform,
      getCycleMs: () => waveform.cycleMs,
      cycleJitter: 0,
      ampJitter: 0,
    })

    // A real resize re-syncs the backing store (setTransform) exactly once.
    const setTransform = ctx.setTransform as unknown as ReturnType<typeof vi.fn>
    const afterInit = setTransform.mock.calls.length
    expect(afterInit).toBe(1)

    let now = 0
    const advance = (n: number) => {
      for (let i = 0; i < n; i++) {
        now += 16
        rafCalls.shift()?.(now)
      }
    }

    // Many frames at the same size: the per-frame self-heal stays a no-op,
    // so the trace is never wiped (no extra resize/clear).
    advance(64)
    expect(setTransform.mock.calls.length).toBe(afterInit)

    // A 1px iPad layout rounding wobble is ignored indefinitely.
    rectW = 401
    advance(32)
    expect(setTransform.mock.calls.length).toBe(afterInit)

    // A short-lived browser-chrome size is cancelled when the original size
    // returns before the settle window ends.
    rectW = 520
    advance(4)
    rectW = 400
    advance(4)
    expect(setTransform.mock.calls.length).toBe(afterInit)

    // A real, stable size change is picked up without a manual resize and the
    // existing trace is copied into the new backing store.
    rectW = 520
    advance(24)
    expect(setTransform.mock.calls.length).toBe(afterInit + 1)
    expect(ctx.getImageData).toHaveBeenCalledTimes(1)
    expect(ctx.putImageData).toHaveBeenCalledTimes(1)
    expect(getWaveform).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ctx.lineTo).mock.calls.at(-1)?.[1]).toBeLessThan(90)

    stop()
  })

  it('can synchronize erase sweep x positions across separate renderers', () => {
    const ctxA = fakeCtx()
    const ctxB = fakeCtx()
    const canvasA = makeCanvas()
    const canvasB = makeCanvas()
    vi.mocked(canvasA.getContext).mockReturnValue(ctxA)
    vi.mocked(canvasB.getContext).mockReturnValue(ctxB)

    const commonOptions = {
      color: '#00ff41',
      getWaveform: () => ECG_RHYTHMS.nsr,
      getCycleMs: () => 800,
      sweepMs: 4000,
      synchronizeSweep: true,
      cycleJitter: 0,
      ampJitter: 0,
    }
    const stopA = startRenderer({ canvas: canvasA, ...commonOptions })
    const stopB = startRenderer({ canvas: canvasB, ...commonOptions })

    const startA = rafCalls.shift()
    const startB = rafCalls.shift()
    startA?.(1000)
    startB?.(2500)

    const tickA = rafCalls.shift()
    const tickB = rafCalls.shift()
    tickA?.(3000)
    tickB?.(3000)

    const fillA = ctxA.fillRect as unknown as ReturnType<typeof vi.fn>
    const fillB = ctxB.fillRect as unknown as ReturnType<typeof vi.fn>
    const eraseA = fillA.mock.calls.at(-1)
    const eraseB = fillB.mock.calls.at(-1)

    expect(eraseA?.[0]).toBe(eraseB?.[0])

    stopA()
    stopB()
  })

  it('advances hidden elapsed time and rebases the sweep without joining stale points', () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const ctx = fakeCtx()
    const canvas = makeCanvas()
    vi.mocked(canvas.getContext).mockReturnValue(ctx)
    const waveform = {
      data: new Float32Array([0, 0.25, 0.5, 0.75]),
      cycleMs: 1000,
    }
    const stop = startRenderer({
      canvas,
      color: '#00ff41',
      getWaveform: () => waveform,
      getCycleMs: () => waveform.cycleMs,
      sweepMs: 4000,
      synchronizeSweep: true,
      cycleJitter: 0,
      ampJitter: 0,
    })

    rafCalls.shift()?.(now)
    rafCalls.shift()
    const lineTo = ctx.lineTo as unknown as ReturnType<typeof vi.fn>
    const fillRect = ctx.fillRect as unknown as ReturnType<typeof vi.fn>
    const drawsBeforeSuspension = lineTo.mock.calls.length
    const fillsBeforeSuspension = fillRect.mock.calls.length

    setDocumentVisibility('hidden')
    now = 3500
    setDocumentVisibility('visible')

    expect(lineTo).toHaveBeenCalledTimes(drawsBeforeSuspension)
    expect(fillRect).toHaveBeenCalledTimes(fillsBeforeSuspension)

    rafCalls.shift()?.(3516)
    const resumedFrom = vi.mocked(ctx.moveTo).mock.calls.at(-1)
    expect(resumedFrom?.[0]).toBeCloseTo(350)
    expect(resumedFrom?.[1]).toBeCloseTo(57.5)

    stop()
  })

  it('rebases an unsynchronized sweep through repeated visibility changes', () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const ctx = fakeCtx()
    const canvas = makeCanvas()
    vi.mocked(canvas.getContext).mockReturnValue(ctx)
    const stop = startRenderer({
      canvas,
      color: '#cc44ff',
      getWaveform: () => ECG_RHYTHMS.nsr,
      getCycleMs: () => 1000,
      sweepMs: 4000,
      synchronizeSweep: false,
      cycleJitter: 0,
      ampJitter: 0,
    })

    rafCalls.shift()?.(now)
    rafCalls.shift()
    setDocumentVisibility('hidden')
    now = 3500
    setDocumentVisibility('visible')
    rafCalls.shift()?.(3516)
    expect(vi.mocked(ctx.moveTo).mock.calls.at(-1)?.[0]).toBeCloseTo(250)

    rafCalls.shift()
    now = 3516
    setDocumentVisibility('hidden')
    now = 6016
    setDocumentVisibility('visible')
    rafCalls.shift()?.(6032)
    expect(vi.mocked(ctx.moveTo).mock.calls.at(-1)?.[0]).toBeCloseTo(101.6)

    stop()
  })

  it('adopts the latest signal while hidden and removes its visibility listener on cleanup', () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const removeListener = vi.spyOn(document, 'removeEventListener')
    let key = 'nsr'
    const nsr = { data: new Float32Array([0]), cycleMs: 1000 }
    const vf = { data: new Float32Array([0.6]), cycleMs: 500 }
    const getWaveform = vi.fn(() => (key === 'nsr' ? nsr : vf))
    const stop = startRenderer({
      canvas: makeCanvas(),
      color: '#00ff41',
      getWaveform,
      getSignalKey: () => key,
      getCycleMs: () => (key === 'nsr' ? nsr.cycleMs : vf.cycleMs),
      cycleJitter: 0,
      ampJitter: 0,
    })

    rafCalls.shift()?.(now)
    rafCalls.shift()
    setDocumentVisibility('hidden')
    key = 'vf'
    now = 2600
    setDocumentVisibility('visible')

    expect(getWaveform.mock.results.at(-1)?.value).toBe(vf)
    stop()
    expect(removeListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    )
  })
})
