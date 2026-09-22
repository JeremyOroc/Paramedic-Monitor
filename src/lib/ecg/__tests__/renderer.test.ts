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
    closePath: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    globalAlpha: 1,
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
  const ctx = fakeCtx()
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
    () => ctx as unknown as CanvasRenderingContext2D | null,
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

  it('clears a model-specific canvas with its supplied background', () => {
    const canvas = makeCanvas()
    const ctx = canvas.getContext('2d')
    const stop = startRenderer({
      canvas,
      color: '#65E5D9',
      background: '#081014',
      getWaveform: () => ECG_RHYTHMS.nsr,
      getCycleMs: () => 750,
    })

    expect(ctx?.fillStyle).toBe('#081014')
    expect(ctx?.fillRect).toHaveBeenCalled()
    stop()
  })

  it('no-ops when 2d context is unavailable', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue(null)
    const onReady = vi.fn()
    const stop = startRenderer({
      canvas,
      color: '#fff',
      getWaveform: () => ECG_RHYTHMS.nsr,
      getCycleMs: () => 1000,
      onReady,
    })
    stop.setOccluded(true)
    stop.setOccluded(false)
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(() => stop()).not.toThrow()
  })

  it('reconstructs a shared-phase canvas before its first reveal', () => {
    const canvas = makeCanvas()
    const onReady = vi.fn()
    const getPhaseAt = vi.fn(() => 0.25)
    const stop = startRenderer({
      canvas,
      color: '#fff',
      getWaveform: () => ECG_RHYTHMS.nsr,
      getCycleMs: () => 750,
      getPhaseAt,
      readyOnStart: true,
      onReady,
    })

    expect(onReady).toHaveBeenCalledTimes(1)
    expect(getPhaseAt).toHaveBeenCalledWith(expect.any(Number), 750)
    stop.setOccluded(true)
    stop.setOccluded(false)
    expect(onReady).toHaveBeenCalledTimes(2)
    stop()
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

  it('reconstructs hidden elapsed time without joining stale and current points', () => {
    let now = 1000
    let wallNow = 10_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.spyOn(Date, 'now').mockImplementation(() => wallNow)
    const ctx = fakeCtx()
    const canvas = makeCanvas()
    vi.mocked(canvas.getContext).mockReturnValue(ctx)
    const waveform = {
      data: new Float32Array([0, 0.25, 0.5, 0.75]),
      cycleMs: 1000,
    }
    const onReady = vi.fn()
    const stop = startRenderer({
      canvas,
      color: '#00ff41',
      getWaveform: () => waveform,
      getCycleMs: () => waveform.cycleMs,
      sweepMs: 4000,
      synchronizeSweep: true,
      cycleJitter: 0,
      ampJitter: 0,
      onReady,
    })

    rafCalls.shift()?.(now)
    rafCalls.shift()
    const lineTo = ctx.lineTo as unknown as ReturnType<typeof vi.fn>
    const drawsBeforeSuspension = lineTo.mock.calls.length

    setDocumentVisibility('hidden')
    now = 3500
    wallNow = 12_500
    setDocumentVisibility('visible')

    expect(lineTo.mock.calls.length).toBeGreaterThan(drawsBeforeSuspension)
    expect(onReady).toHaveBeenCalledTimes(1)

    const reconstructedMoves = vi.mocked(ctx.moveTo).mock.calls.slice(drawsBeforeSuspension)
    const reconstructedLines = lineTo.mock.calls.slice(drawsBeforeSuspension)
    reconstructedLines.forEach((line, index) => {
      expect(Math.abs(Number(line[0]) - Number(reconstructedMoves[index]?.[0]))).toBeLessThanOrEqual(2)
    })

    const drawsAfterReconstruction = lineTo.mock.calls.length
    wallNow = 12_516
    rafCalls.shift()?.(3516)
    expect(lineTo).toHaveBeenCalledTimes(drawsAfterReconstruction)

    wallNow = 12_532
    rafCalls.shift()?.(3532)
    const resumedFrom = vi.mocked(ctx.moveTo).mock.calls.at(-1)
    expect(resumedFrom?.[0]).toBeCloseTo(351.6)

    stop()
  })

  it('uses Safari page lifecycle events as one hard stroke boundary', () => {
    let now = 1000
    let wallNow = 10_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.spyOn(Date, 'now').mockImplementation(() => wallNow)
    const ctx = fakeCtx()
    const canvas = makeCanvas()
    vi.mocked(canvas.getContext).mockReturnValue(ctx)
    const onReady = vi.fn()
    const stop = startRenderer({
      canvas,
      color: '#00ff41',
      getWaveform: () => ECG_RHYTHMS.nsr,
      getCycleMs: () => 1000,
      sweepMs: 4000,
      synchronizeSweep: true,
      cycleJitter: 0,
      ampJitter: 0,
      onReady,
    })

    rafCalls.shift()?.(now)
    rafCalls.shift()
    window.dispatchEvent(new Event('pagehide'))
    now = 5000
    wallNow = 14_000
    window.dispatchEvent(new Event('pageshow'))

    const lineTo = vi.mocked(ctx.lineTo)
    const moves = vi.mocked(ctx.moveTo)
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(lineTo.mock.calls.length).toBeGreaterThan(0)
    lineTo.mock.calls.forEach((line, index) => {
      expect(Math.abs(Number(line[0]) - Number(moves.mock.calls[index]?.[0]))).toBeLessThanOrEqual(2)
    })

    const drawsAfterReconstruction = lineTo.mock.calls.length
    wallNow = 14_016
    rafCalls.shift()?.(5016)
    expect(lineTo).toHaveBeenCalledTimes(drawsAfterReconstruction)

    wallNow = 14_032
    rafCalls.shift()?.(5032)
    expect(lineTo.mock.calls.length).toBeGreaterThan(drawsAfterReconstruction)

    // A delayed visibility event observes the already-consumed boundary.
    document.dispatchEvent(new Event('visibilitychange'))
    expect(onReady).toHaveBeenCalledTimes(1)
    stop()
  })

  it('rebases an unsynchronized sweep through repeated visibility changes', () => {
    let now = 1000
    let wallNow = 10_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.spyOn(Date, 'now').mockImplementation(() => wallNow)
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
    wallNow = 12_500
    setDocumentVisibility('visible')
    const lineTo = vi.mocked(ctx.lineTo)
    const firstRecoveryDraws = lineTo.mock.calls.length
    wallNow = 12_516
    rafCalls.shift()?.(3516)
    expect(lineTo).toHaveBeenCalledTimes(firstRecoveryDraws)
    wallNow = 12_532
    rafCalls.shift()?.(3532)
    expect(vi.mocked(ctx.moveTo).mock.calls.at(-1)?.[0]).toBeCloseTo(251.6)

    rafCalls.shift()
    now = 3532
    setDocumentVisibility('hidden')
    now = 6032
    wallNow = 15_032
    setDocumentVisibility('visible')
    const secondRecoveryDraws = lineTo.mock.calls.length
    wallNow = 15_048
    rafCalls.shift()?.(6048)
    expect(lineTo).toHaveBeenCalledTimes(secondRecoveryDraws)
    wallNow = 15_064
    rafCalls.shift()?.(6064)
    expect(vi.mocked(ctx.moveTo).mock.calls.at(-1)?.[0]).toBeCloseTo(104.8)

    stop()
  })

  it('adopts the latest signal while hidden and removes its visibility listener on cleanup', () => {
    let now = 1000
    let wallNow = 10_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.spyOn(Date, 'now').mockImplementation(() => wallNow)
    const removeListener = vi.spyOn(document, 'removeEventListener')
    const removeWindowListener = vi.spyOn(window, 'removeEventListener')
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
    wallNow = 11_600
    setDocumentVisibility('visible')

    expect(getWaveform.mock.results.at(-1)?.value).toBe(vf)
    stop()
    expect(removeListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    )
    expect(removeWindowListener).toHaveBeenCalledWith('pagehide', expect.any(Function))
    expect(removeWindowListener).toHaveBeenCalledWith('pageshow', expect.any(Function))
  })

  it('recovers a long animation gap when Safari omits visibility events', () => {
    let now = 1000
    let wallNow = 10_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.spyOn(Date, 'now').mockImplementation(() => wallNow)
    const ctx = fakeCtx()
    const canvas = makeCanvas()
    vi.mocked(canvas.getContext).mockReturnValue(ctx)
    const onReady = vi.fn()
    const stop = startRenderer({
      canvas,
      color: '#00ff41',
      getWaveform: () => ECG_RHYTHMS.nsr,
      getCycleMs: () => 1000,
      sweepMs: 4000,
      synchronizeSweep: true,
      cycleJitter: 0,
      ampJitter: 0,
      onReady,
    })

    rafCalls.shift()?.(now)
    const resumedFrame = rafCalls.shift()
    const drawsBeforeGap = vi.mocked(ctx.lineTo).mock.calls.length
    now = 5000
    wallNow = 14_000
    resumedFrame?.(now)

    const moves = vi.mocked(ctx.moveTo).mock.calls.slice(drawsBeforeGap)
    const lines = vi.mocked(ctx.lineTo).mock.calls.slice(drawsBeforeGap)
    expect(lines.length).toBeGreaterThan(0)
    lines.forEach((line, index) => {
      expect(Math.abs(Number(line[0]) - Number(moves[index]?.[0]))).toBeLessThanOrEqual(2)
    })
    expect(onReady).toHaveBeenCalledTimes(1)
    stop()
  })

  it('consumes a reordered visibility gap once when rAF resumes before the event', () => {
    let now = 1000
    let wallNow = 10_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.spyOn(Date, 'now').mockImplementation(() => wallNow)
    const onReady = vi.fn()
    const stop = startRenderer({
      canvas: makeCanvas(),
      color: '#00ff41',
      getWaveform: () => ECG_RHYTHMS.nsr,
      getCycleMs: () => 1000,
      cycleJitter: 0,
      ampJitter: 0,
      onReady,
    })

    rafCalls.shift()?.(now)
    const queuedFrame = rafCalls.shift()
    setDocumentVisibility('hidden')

    now = 3500
    wallNow = 12_500
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    })
    queuedFrame?.(now)
    expect(onReady).toHaveBeenCalledTimes(1)

    document.dispatchEvent(new Event('visibilitychange'))
    expect(onReady).toHaveBeenCalledTimes(1)
    stop()
  })

  it('stops covered draws and rebuilds final geometry before reporting ready', () => {
    let now = 1000
    let wallNow = 10_000
    let rectWidth = 400
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.spyOn(Date, 'now').mockImplementation(() => wallNow)
    const ctx = fakeCtx()
    const canvas = document.createElement('canvas')
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({
        width: rectWidth,
        height: 200,
        top: 0,
        left: 0,
        right: rectWidth,
        bottom: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    })
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx)
    const onReady = vi.fn()
    const stop = startRenderer({
      canvas,
      color: '#00ff41',
      getWaveform: () => ECG_RHYTHMS.nsr,
      getCycleMs: () => 1000,
      cycleJitter: 0,
      ampJitter: 0,
      onReady,
    })

    rafCalls.shift()?.(now)
    stop.setOccluded(true)
    const drawsBeforeCover = vi.mocked(ctx.lineTo).mock.calls.length

    now = 1016
    wallNow = 10_016
    rafCalls.shift()?.(now)
    now = 1032
    wallNow = 10_032
    rafCalls.shift()?.(now)
    expect(ctx.lineTo).toHaveBeenCalledTimes(drawsBeforeCover)

    rectWidth = 520
    stop.setOccluded(false)

    expect(canvas.width).toBe(520)
    expect(vi.mocked(ctx.lineTo).mock.calls.length).toBeGreaterThan(drawsBeforeCover)
    expect(onReady).toHaveBeenCalledTimes(1)
    stop()
  })
})
