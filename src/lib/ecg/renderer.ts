import { COLORS } from '@/lib/constants'
import type { WaveformDef } from './rhythms'

export type RendererOptions = {
  canvas: HTMLCanvasElement
  color: string
  /** Canvas clear/erase color; X remains black unless a model palette overrides it. */
  background?: string
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
  /** Optional shared patient-time cardiac phase for related canvases. */
  getPhaseAt?: (nowWallMs: number, cycleMs: number) => number
  /** Starts with canvas drawing suspended while patient and sweep time continue. */
  initiallyOccluded?: boolean
  /** Report readiness before the first reveal; reconstruction is skipped for a fresh reveal. */
  readyOnStart?: boolean
  /** Begin with an empty sweep and reveal only trace history earned since mount. */
  freshReveal?: boolean
  /** Runs after an occluded or suspended canvas has rebuilt its current visible sweep. */
  onReady?: () => void
}

export type RendererController = (() => void) & {
  setOccluded: (occluded: boolean) => void
  /** Records a reactive signal change even while rAF drawing is suspended. */
  syncSignal: () => void
}

type CanvasSize = {
  width: number
  height: number
  dpr: number
}

type SignalSnapshot = {
  startedAtWall: number
  waveform: WaveformDef
  cycleMs: number
  phaseAtStart: number
  amplitudeMultiplier: number
}

const RESIZE_JITTER_PX = 1
const RESIZE_SETTLE_MS = 120
const MAX_CONTIGUOUS_FRAME_MS = 250
const RECONSTRUCT_STEP_PX = 2

function sizesMatch(a: CanvasSize, b: CanvasSize, tolerance = 0): boolean {
  return (
    Math.abs(a.width - b.width) <= tolerance &&
    Math.abs(a.height - b.height) <= tolerance &&
    a.dpr === b.dpr
  )
}

export function startRenderer(opts: RendererOptions): RendererController {
  const {
    canvas,
    color,
    background = COLORS.bg,
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
    getPhaseAt,
    initiallyOccluded = false,
    readyOnStart = false,
    freshReveal = false,
    onReady,
  } = opts

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    let noopOccluded = initiallyOccluded
    const noop = (() => {}) as RendererController
    noop.syncSignal = () => {}
    noop.setOccluded = (nextOccluded: boolean) => {
      const restoring = noopOccluded && !nextOccluded
      noopOccluded = nextOccluded
      if (restoring) onReady?.()
    }
    if (readyOnStart && !initiallyOccluded) onReady?.()
    return noop
  }

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
  let hiddenAtWall =
    typeof document !== 'undefined' && document.hidden ? Date.now() : null
  let lastWallT = Date.now()
  let occluded = initiallyOccluded
  // Recovery reconstructs the visible history, but the first incremental frame
  // must still begin a new stroke. This makes the hidden interval a hard path
  // boundary instead of allowing Safari to join the old and new cursor anchors.
  let suppressNextIncrementalStroke = false
  let stopped = false
  const sequenceStartedAtWall = Date.now()
  let signalHistory: SignalSnapshot[] = []
  let reconstructAfterResize = false

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
    ctx.fillStyle = background
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
    reconstructAfterResize = previousWidth > 0 && previousHeight > 0
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
  if (getPhaseAt) phase = getPhaseAt(Date.now(), getCycleMs())

  const sampleWaveformAt = (waveform: WaveformDef, p: number): number => {
    const data = waveform.data
    const idx = Math.floor(p * data.length) % data.length
    return data[idx]
  }

  const sampleAt = (p: number): number => sampleWaveformAt(activeWaveform, p)

  const yFromValue = (v: number, amplitudeMultiplier = ampMul): number => {
    const halfH = cssHeight / 2
    return halfH - v * halfH * amplitude * amplitudeMultiplier
  }

  const sweepDuration = () => Math.max(500, sweepMs)
  const synchronizedX = (now: number): number =>
    ((now % sweepDuration()) / sweepDuration()) * cssWidth

  const eraseWidth = () => Math.max(6, cssWidth * 0.03)

  const pruneSignalHistory = (nowWall: number) => {
    const cutoff = nowWall - sweepDuration()
    const firstInsideWindow = signalHistory.findIndex(
      (snapshot) => snapshot.startedAtWall >= cutoff,
    )
    if (firstInsideWindow > 1) {
      signalHistory = signalHistory.slice(firstInsideWindow - 1)
    }
  }

  const recordSignalSnapshot = (nowWall: number) => {
    signalHistory.push({
      startedAtWall: nowWall,
      waveform: activeWaveform,
      cycleMs: Math.max(60, getCycleMs() * cycleMul),
      phaseAtStart: phase,
      amplitudeMultiplier: ampMul,
    })
    pruneSignalHistory(nowWall)
  }

  recordSignalSnapshot(sequenceStartedAtWall)

  const refreshSignal = (nowWall = Date.now()): boolean => {
    const nextSignalKey = getSignalKey?.() ?? 'default'
    if (nextSignalKey === activeSignalKey) return false

    activeSignalKey = nextSignalKey
    activeWaveform = getWaveform()
    phase = getPhaseAt?.(nowWall, getCycleMs()) ?? 0
    rollJitter()
    prevY = yFromValue(sampleAt(0))
    recordSignalSnapshot(nowWall)
    suppressNextIncrementalStroke = true
    return true
  }

  const advancePhase = (elapsedMs: number) => {
    const cycleMs = Math.max(60, getCycleMs() * cycleMul)
    const nextPhase = getPhaseAt
      ? getPhaseAt(Date.now(), cycleMs)
      : phase + Math.max(0, elapsedMs) / cycleMs
    const wrapped = getPhaseAt ? nextPhase < phase : nextPhase >= 1
    phase = nextPhase % 1

    if (wrapped) {
      activeWaveform = getWaveform()
      rollJitter()
    }
  }

  const advanceSweep = (now: number, elapsedMs: number) => {
    if (synchronizeSweep) {
      prevX = synchronizedX(now)
      return
    }

    const elapsedX = (Math.max(0, elapsedMs) / sweepDuration()) * cssWidth
    prevX = (prevX + elapsedX) % cssWidth
  }

  const reconstructCurrentSweep = (nowWall = Date.now()) => {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, cssWidth, cssHeight)

    const gapWidth = eraseWidth()
    const availableHistoryMs = freshReveal
      ? Math.min(sweepDuration(), Math.max(0, nowWall - sequenceStartedAtWall))
      : sweepDuration()
    let previousPoint: { x: number; y: number } | null = null
    let previousSnapshot: SignalSnapshot | null = null

    for (let x = 0; x <= cssWidth; x += RECONSTRUCT_STEP_PX) {
      const distanceAhead = (x - prevX + cssWidth) % cssWidth
      if (distanceAhead < gapWidth) {
        previousPoint = null
        continue
      }

      const distanceBehind = (prevX - x + cssWidth) % cssWidth
      const elapsedBehindMs = (distanceBehind / cssWidth) * sweepDuration()
      if (elapsedBehindMs > availableHistoryMs) {
        previousPoint = null
        previousSnapshot = null
        continue
      }

      const sampleWall = nowWall - elapsedBehindMs
      let snapshot: SignalSnapshot | undefined
      for (let index = signalHistory.length - 1; index >= 0; index -= 1) {
        if (signalHistory[index].startedAtWall <= sampleWall) {
          snapshot = signalHistory[index]
          break
        }
      }
      if (!snapshot && !freshReveal) snapshot = signalHistory[0]
      if (!snapshot) {
        previousPoint = null
        previousSnapshot = null
        continue
      }
      const phaseFromStart =
        snapshot.phaseAtStart +
        (sampleWall - snapshot.startedAtWall) / snapshot.cycleMs
      const samplePhase = ((phaseFromStart % 1) + 1) % 1
      const y = yFromValue(
        sampleWaveformAt(snapshot.waveform, samplePhase),
        snapshot.amplitudeMultiplier,
      )

      if (previousPoint && previousSnapshot === snapshot) {
        drawSegment(previousPoint.x, previousPoint.y, x, y)
      }
      previousPoint = { x, y }
      previousSnapshot = snapshot
    }

    prevY = yFromValue(sampleAt(phase))
  }

  const rebaseAfterSuspension = (
    now: number,
    elapsedMs: number,
    rebuild: boolean,
  ) => {
    if (rebuild) resize(now, true)
    const nowWall = Date.now()
    refreshSignal(nowWall)
    advancePhase(elapsedMs)
    advanceSweep(now, elapsedMs)
    prevY = yFromValue(sampleAt(phase))
    lastT = now
    lastWallT = nowWall

    if (rebuild) {
      reconstructAfterResize = false
      reconstructCurrentSweep(nowWall)
      suppressNextIncrementalStroke = true
      onReady?.()
    }
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
      hiddenAtWall ??= Date.now()
      rafId = 0
      return
    }

    rafId = requestAnimationFrame(tick)
    const nowWall = Date.now()
    const rawDt = Math.max(0, now - lastT)
    const wallDt = Math.max(0, nowWall - lastWallT)
    const elapsedMs = Math.max(rawDt, wallDt)

    // Some WebKit resumes run a queued frame after visibilityState has become
    // visible but before the matching event is delivered. Consume the recorded
    // suspension here so the later event cannot advance the timeline twice.
    if (hiddenAtWall !== null) {
      const hiddenElapsedMs = Math.max(0, nowWall - hiddenAtWall)
      hiddenAtWall = null
      rebaseAfterSuspension(now, hiddenElapsedMs, !occluded)
      return
    }

    if (occluded) {
      refreshSignal(nowWall)
      advancePhase(elapsedMs)
      advanceSweep(now, elapsedMs)
      prevY = yFromValue(sampleAt(phase))
      lastT = now
      lastWallT = nowWall
      return
    }

    // Safari can resume rAF before (or without) a matching visibility event.
    // Treat the raw scheduling gap itself as a suspension boundary so stale
    // and current cursor positions can never be joined by a false trace.
    if (rawDt > MAX_CONTIGUOUS_FRAME_MS || wallDt > MAX_CONTIGUOUS_FRAME_MS) {
      rebaseAfterSuspension(now, elapsedMs, true)
      return
    }

    // Self-heal: ResizeObserver can miss or coalesce a layout change (e.g. when
    // the defib state toggles the vitals/energy columns and the ECG column
    // reflows), leaving the cached size out of sync with the canvas — which then
    // corrupts the erase band / sweep math until a manual window resize. Re-sync
    // a few times per second; resize() is a no-op when nothing changed.
    const shouldSelfHeal = (healFrame++ & 15) === 0
    if (pendingSize || shouldSelfHeal) resize(now)
    if (reconstructAfterResize) {
      reconstructAfterResize = false
      reconstructCurrentSweep(nowWall)
      suppressNextIncrementalStroke = true
    }
    const dt = Math.min(64, rawDt)
    lastT = now
    lastWallT = nowWall

    refreshSignal(nowWall)

    const cycleMs = Math.max(60, getCycleMs() * cycleMul)
    const dPhase = dt / cycleMs

    const previousPhase = phase
    const nextPhase = getPhaseAt
      ? getPhaseAt(nowWall, cycleMs)
      : phase + dPhase
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

    const nextEraseWidth = eraseWidth()
    ctx.fillStyle = background
    if (nextX + nextEraseWidth <= cssWidth) {
      ctx.fillRect(nextX, 0, nextEraseWidth, cssHeight)
    } else {
      const tail = nextX + nextEraseWidth - cssWidth
      ctx.fillRect(nextX, 0, cssWidth - nextX, cssHeight)
      ctx.fillRect(0, 0, tail, cssHeight)
    }

    const y = yFromValue(sampleAt(nextPhase % 1))

    if (suppressNextIncrementalStroke) {
      suppressNextIncrementalStroke = false
    } else {
      if (wrapped) {
        drawSegment(prevX, prevY, cssWidth, y)
        drawSegment(0, y, nextX, y)
      } else {
        drawSegment(prevX, prevY, nextX, y)
      }
    }

    prevX = nextX
    prevY = y
    phase = nextPhase % 1

    if (getPhaseAt ? nextPhase < previousPhase : nextPhase >= 1) {
      activeWaveform = getWaveform()
      rollJitter()
    }
  }

  const beginBrowserSuspension = () => {
    if (stopped) return
    hiddenAtWall ??= Date.now()
    if (rafId !== 0) cancelAnimationFrame(rafId)
    rafId = 0
  }

  const endBrowserSuspension = () => {
    if (stopped || document.hidden || hiddenAtWall === null) return
    const now = performance.now()
    const elapsedMs = Math.max(0, Date.now() - hiddenAtWall)
    hiddenAtWall = null
    rebaseAfterSuspension(now, elapsedMs, !occluded)
    rafId = requestAnimationFrame(tick)
  }

  const handleVisibilityChange = () => {
    if (typeof document === 'undefined' || stopped) return
    if (document.hidden) {
      beginBrowserSuspension()
      return
    }
    endBrowserSuspension()
  }

  // iPad Safari may use page lifecycle events when moving between tabs and can
  // delay or omit the matching visibility event. Treat both event families as
  // the same idempotent suspension so whichever arrives first owns recovery.
  const handlePageHide = () => beginBrowserSuspension()
  const handlePageShow = () => endBrowserSuspension()

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pagehide', handlePageHide)
  window.addEventListener('pageshow', handlePageShow)

  if (readyOnStart && !initiallyOccluded && hiddenAtWall === null) {
    if (freshReveal) {
      const now = performance.now()
      const nowWall = Date.now()
      refreshSignal(nowWall)
      if (synchronizeSweep) prevX = synchronizedX(now)
      prevY = yFromValue(sampleAt(phase))
      lastT = now
      lastWallT = nowWall
      suppressNextIncrementalStroke = true
      onReady?.()
    } else {
      rebaseAfterSuspension(performance.now(), 0, true)
    }
  }

  if (hiddenAtWall === null) {
    rafId = requestAnimationFrame((t) => {
      lastT = t
      lastWallT = Date.now()
      if (synchronizeSweep) prevX = synchronizedX(t)
      tick(t)
    })
  }

  const stop = (() => {
    stopped = true
    if (rafId !== 0) cancelAnimationFrame(rafId)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('pagehide', handlePageHide)
    window.removeEventListener('pageshow', handlePageShow)
    ro?.disconnect()
  }) as RendererController

  stop.setOccluded = (nextOccluded: boolean) => {
    if (stopped || nextOccluded === occluded) return
    occluded = nextOccluded

    if (occluded || (typeof document !== 'undefined' && document.hidden)) return

    const now = performance.now()
    const elapsedMs = Math.max(
      Math.max(0, now - lastT),
      Math.max(0, Date.now() - lastWallT),
    )
    rebaseAfterSuspension(now, elapsedMs, true)
  }

  stop.syncSignal = () => {
    if (stopped) return
    refreshSignal(Date.now())
  }

  return stop
}
