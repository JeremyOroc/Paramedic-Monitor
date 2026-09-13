import { COLORS } from '@/lib/constants'
import type { WaveformDef } from './rhythms'

export type RendererOptions = {
  canvas: HTMLCanvasElement
  color: string
  getWaveform: () => WaveformDef
  getCycleMs: () => number
  getSignalKey?: () => string
  /** Time in ms for the trace to sweep across the full canvas. Defaults to 4000ms (~Zoll ECG paper speed). */
  sweepMs?: number
  /** Aligns the erase/update sweep to wall-clock time so separate canvases share the same x position. */
  synchronizeSweep?: boolean
  amplitude?: number
  lineWidth?: number
  fillStyle?: 'line' | 'area'
  fillAlpha?: number
  /** Fraction (0..1) — amplitude varies by ±ampJitter each cycle wrap. */
  ampJitter?: number
  /** Fraction (0..1) — cycleMs varies by ±cycleJitter each cycle wrap. */
  cycleJitter?: number
}

type CanvasSize = {
  width: number
  height: number
  dpr: number
}

const RESIZE_JITTER_PX = 1
const RESIZE_SETTLE_MS = 120

function sizesMatch(a: CanvasSize, b: CanvasSize, tolerance = 0): boolean {
  return (
    Math.abs(a.width - b.width) <= tolerance &&
    Math.abs(a.height - b.height) <= tolerance &&
    a.dpr === b.dpr
  )
}

export function startRenderer(opts: RendererOptions): () => void {
  const {
    canvas,
    color,
    getWaveform,
    getCycleMs,
    getSignalKey,
    sweepMs = 4000,
    synchronizeSweep = false,
    amplitude = 0.85,
    lineWidth = 2,
    fillStyle = 'line',
    fillAlpha = 0.7,
    ampJitter = 0,
    cycleJitter = 0,
  } = opts

  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  let activeWaveform = getWaveform()
  let activeSignalKey = getSignalKey?.() ?? 'default'
  let cssWidth = 0
  let cssHeight = 0
  let dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  let phase = 0
  let prevX = 0
  let prevY = 0
  let lastT = performance.now()
  let rafId = 0
  let ampMul = 1
  let cycleMul = 1
  let pendingSize: CanvasSize | null = null
  let pendingSince = 0
  // Browsers suspend requestAnimationFrame in background tabs. Keep that gap
  // separate from the ordinary per-frame clamp so patient time can advance on
  // return without drawing one long segment across the stale sweep position.
  let hiddenAt =
    typeof document !== 'undefined' && document.hidden ? performance.now() : null
  let stopped = false

  const readCanvasSize = (): CanvasSize => {
    const rect = canvas.getBoundingClientRect()
    return {
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
      dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    }
  }

  const commitSize = (next: CanvasSize) => {
    let traceSnapshot: ImageData | null = null
    if (cssWidth > 0 && cssHeight > 0) {
      try {
        traceSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)
      } catch {
        // A resize must still succeed if the backing store cannot be copied.
      }
    }

    const previousWidth = cssWidth
    const previousHeight = cssHeight
    const previousXRatio = previousWidth > 0 ? prevX / previousWidth : 0
    const previousYRatio = previousHeight > 0 ? prevY / previousHeight : 0.5

    dpr = next.dpr
    cssWidth = next.width
    cssHeight = next.height
    canvas.width = cssWidth * dpr
    canvas.height = cssHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, cssWidth, cssHeight)

    if (traceSnapshot) {
      try {
        ctx.putImageData(traceSnapshot, 0, 0)
      } catch {
        // Keep the freshly cleared backing store if the snapshot no longer fits.
      }
    }

    prevX = previousXRatio * cssWidth
    prevY = previousYRatio * cssHeight
  }

  // iPad browser chrome and Control Center can report short-lived viewport
  // sizes while the system gesture is settling. Reallocating the backing store
  // for each one clears the ECG, so ignore 1px rounding noise and commit only a
  // real size that remains stable for a short window. The first size is applied
  // immediately so the initial trace starts at full resolution.
  const resize = (now: number, force = false) => {
    const next = readCanvasSize()
    const current = { width: cssWidth, height: cssHeight, dpr }

    if (force) {
      pendingSize = null
      commitSize(next)
      return
    }

    if (sizesMatch(next, current, RESIZE_JITTER_PX)) {
      pendingSize = null
      return
    }

    if (!pendingSize || !sizesMatch(next, pendingSize, RESIZE_JITTER_PX)) {
      pendingSize = next
      pendingSince = now
      return
    }

    pendingSize = next
    if (now - pendingSince < RESIZE_SETTLE_MS) return

    commitSize(next)
    pendingSize = null
  }
  resize(performance.now(), true)

  const ro =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => resize(performance.now()))
      : null
  ro?.observe(canvas)

  prevY = cssHeight / 2

  const rollJitter = () => {
    ampMul = 1 + (Math.random() - 0.5) * 2 * ampJitter
    cycleMul = 1 + (Math.random() - 0.5) * 2 * cycleJitter
  }
  rollJitter()

  const sampleAt = (p: number): number => {
    const data = activeWaveform.data
    const idx = Math.floor(p * data.length) % data.length
    return data[idx]
  }

  const yFromValue = (v: number): number => {
    const halfH = cssHeight / 2
    return halfH - v * halfH * amplitude * ampMul
  }

  const sweepDuration = () => Math.max(500, sweepMs)
  const synchronizedX = (now: number): number =>
    ((now % sweepDuration()) / sweepDuration()) * cssWidth

  const refreshSignal = (): boolean => {
    const nextSignalKey = getSignalKey?.() ?? 'default'
    if (nextSignalKey === activeSignalKey) return false

    activeSignalKey = nextSignalKey
    activeWaveform = getWaveform()
    phase = 0
    rollJitter()
    prevY = yFromValue(sampleAt(0))
    return true
  }

  const advancePhase = (elapsedMs: number) => {
    const cycleMs = Math.max(60, getCycleMs() * cycleMul)
    const nextPhase = phase + Math.max(0, elapsedMs) / cycleMs
    phase = nextPhase % 1

    if (nextPhase >= 1) {
      activeWaveform = getWaveform()
      rollJitter()
    }
  }

  const rebaseAfterSuspension = (now: number, elapsedMs: number) => {
    resize(now)
    refreshSignal()
    advancePhase(elapsedMs)

    // Move both drawing anchors to the current patient/sweep time without
    // touching the backing store. The next visible frame begins a fresh local
    // segment while the existing trace remains behind it.
    if (synchronizeSweep) {
      prevX = synchronizedX(now)
    } else {
      const elapsedX = (Math.max(0, elapsedMs) / sweepDuration()) * cssWidth
      prevX = (prevX + elapsedX) % cssWidth
    }
    prevY = yFromValue(sampleAt(phase))
    lastT = now
  }

  const drawSegment = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) => {
    if (fillStyle === 'area') {
      const baselineY = cssHeight
      ctx.save()
      ctx.globalAlpha = fillAlpha
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
      ctx.lineTo(toX, baselineY)
      ctx.lineTo(fromX, baselineY)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()
  }

  let healFrame = 0
  const tick = (now: number) => {
    if (typeof document !== 'undefined' && document.hidden) {
      hiddenAt ??= now
      rafId = 0
      return
    }

    rafId = requestAnimationFrame(tick)
    // Self-heal: ResizeObserver can miss or coalesce a layout change (e.g. when
    // the defib state toggles the vitals/energy columns and the ECG column
    // reflows), leaving the cached size out of sync with the canvas — which then
    // corrupts the erase band / sweep math until a manual window resize. Re-sync
    // a few times per second; resize() is a no-op when nothing changed.
    const shouldSelfHeal = (healFrame++ & 15) === 0
    if (pendingSize || shouldSelfHeal) resize(now)
    const dt = Math.min(64, now - lastT)
    lastT = now

    refreshSignal()

    const cycleMs = Math.max(60, getCycleMs() * cycleMul)
    const dPhase = dt / cycleMs

    const nextPhase = phase + dPhase
    let nextX: number
    let wrapped: boolean
    if (synchronizeSweep) {
      nextX = synchronizedX(now)
      wrapped = nextX < prevX
    } else {
      const xSpeed = cssWidth / sweepDuration()
      const dx = dt * xSpeed
      nextX = prevX + dx
      wrapped = false
      if (nextX >= cssWidth) {
        nextX = nextX - cssWidth
        wrapped = true
      }
    }

    const eraseWidth = Math.max(6, cssWidth * 0.03)
    ctx.fillStyle = COLORS.bg
    if (nextX + eraseWidth <= cssWidth) {
      ctx.fillRect(nextX, 0, eraseWidth, cssHeight)
    } else {
      const tail = nextX + eraseWidth - cssWidth
      ctx.fillRect(nextX, 0, cssWidth - nextX, cssHeight)
      ctx.fillRect(0, 0, tail, cssHeight)
    }

    const y = yFromValue(sampleAt(nextPhase % 1))

    if (wrapped) {
      drawSegment(prevX, prevY, cssWidth, y)
      drawSegment(0, y, nextX, y)
    } else {
      drawSegment(prevX, prevY, nextX, y)
    }

    prevX = nextX
    prevY = y
    phase = nextPhase % 1

    if (nextPhase >= 1) {
      activeWaveform = getWaveform()
      rollJitter()
    }
  }

  const handleVisibilityChange = () => {
    if (typeof document === 'undefined' || stopped) return
    const now = performance.now()

    if (document.hidden) {
      hiddenAt ??= now
      if (rafId !== 0) cancelAnimationFrame(rafId)
      rafId = 0
      return
    }

    if (hiddenAt === null) return
    const elapsedMs = now - hiddenAt
    hiddenAt = null
    rebaseAfterSuspension(now, elapsedMs)
    rafId = requestAnimationFrame(tick)
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  if (hiddenAt === null) {
    rafId = requestAnimationFrame((t) => {
      lastT = t
      if (synchronizeSweep) prevX = synchronizedX(t)
      tick(t)
    })
  }

  return () => {
    stopped = true
    if (rafId !== 0) cancelAnimationFrame(rafId)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    ro?.disconnect()
  }
}
