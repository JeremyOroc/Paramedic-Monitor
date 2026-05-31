import { COLORS } from '@/lib/utils'
import type { WaveformDef } from './rhythms'

export type RendererOptions = {
  canvas: HTMLCanvasElement
  color: string
  getWaveform: () => WaveformDef
  getCycleMs: () => number
  getSignalKey?: () => string
  /** Time in ms for the trace to sweep across the full canvas. Defaults to 4000ms (~Zoll ECG paper speed). */
  sweepMs?: number
  amplitude?: number
  lineWidth?: number
  fillStyle?: 'line' | 'area'
  fillAlpha?: number
  /** Fraction (0..1) — amplitude varies by ±ampJitter each cycle wrap. */
  ampJitter?: number
  /** Fraction (0..1) — cycleMs varies by ±cycleJitter each cycle wrap. */
  cycleJitter?: number
}

export function startRenderer(opts: RendererOptions): () => void {
  const {
    canvas,
    color,
    getWaveform,
    getCycleMs,
    getSignalKey,
    sweepMs = 4000,
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

  // Re-sync the backing store to the element's CSS size. Idempotent: when size
  // and DPR are unchanged it does nothing (and never wipes the drawn trace), so
  // it is safe to call freely — from the ResizeObserver and as a per-frame
  // self-heal. Uses round() to match the element's reported client size, so a
  // sub-pixel layout doesn't leave the cache permanently 1px off.
  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    const nextDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const nextWidth = Math.max(1, Math.round(rect.width))
    const nextHeight = Math.max(1, Math.round(rect.height))
    if (nextWidth === cssWidth && nextHeight === cssHeight && nextDpr === dpr) return
    dpr = nextDpr
    cssWidth = nextWidth
    cssHeight = nextHeight
    canvas.width = cssWidth * dpr
    canvas.height = cssHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, cssWidth, cssHeight)
  }
  resize()

  const ro =
    typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
  ro?.observe(canvas)

  let phase = 0
  let prevX = 0
  let prevY = cssHeight / 2
  let lastT = performance.now()
  let rafId = 0
  let ampMul = 1
  let cycleMul = 1

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
    rafId = requestAnimationFrame(tick)
    // Self-heal: ResizeObserver can miss or coalesce a layout change (e.g. when
    // the defib state toggles the vitals/energy columns and the ECG column
    // reflows), leaving the cached size out of sync with the canvas — which then
    // corrupts the erase band / sweep math until a manual window resize. Re-sync
    // a few times per second; resize() is a no-op when nothing changed.
    if ((healFrame++ & 15) === 0) resize()
    const dt = Math.min(64, now - lastT)
    lastT = now

    const nextSignalKey = getSignalKey?.() ?? 'default'
    if (nextSignalKey !== activeSignalKey) {
      activeSignalKey = nextSignalKey
      activeWaveform = getWaveform()
      phase = 0
      rollJitter()
      prevY = yFromValue(sampleAt(0))
    }

    const cycleMs = Math.max(60, getCycleMs() * cycleMul)
    const dPhase = dt / cycleMs
    const xSpeed = cssWidth / Math.max(500, sweepMs)
    const dx = dt * xSpeed

    const nextPhase = phase + dPhase
    let nextX = prevX + dx
    let wrapped = false
    if (nextX >= cssWidth) {
      nextX = nextX - cssWidth
      wrapped = true
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

  rafId = requestAnimationFrame((t) => {
    lastT = t
    tick(t)
  })

  return () => {
    cancelAnimationFrame(rafId)
    ro?.disconnect()
  }
}
