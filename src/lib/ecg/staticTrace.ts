import { COLORS } from '@/lib/utils'

export type DrawLeadRowOptions = {
  canvas: HTMLCanvasElement
  /** One waveform-cycle of samples per lead, laid out left→right across the row. */
  leads: Float32Array[]
  /** Whole number of cycles drawn per lead segment (keeps segment ends on the baseline). */
  beatsPerLead: number
  /** Trace ink color. Defaults to the dark printout ink. */
  color?: string
  paper?: string
  grid?: string
  /** Trace height as a fraction of the row half-height. */
  amplitude?: number
  lineWidth?: number
  /** Grid square size in CSS px. */
  gridSizePx?: number
}

/**
 * Draws one printout row of ECG paper: a uniform square grid plus a single
 * CONTINUOUS trace spanning every lead in the row left→right. Drawing the whole
 * row as one polyline (rather than one canvas per lead) avoids seams between
 * leads, so the baseline reads as one connected line like a real 12-lead. Each
 * lead segment uses a whole number of beats, so segment ends meet on the
 * baseline. No animation or jitter — one static snapshot, re-drawn on resize.
 */
export function drawLeadRow(opts: DrawLeadRowOptions): void {
  const {
    canvas,
    leads,
    beatsPerLead,
    color = COLORS.printInk,
    paper = COLORS.printPaper,
    grid = COLORS.printGrid,
    amplitude = 0.6,
    lineWidth = 1.4,
    gridSizePx = 8,
  } = opts

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const rect = canvas.getBoundingClientRect()
  const cssWidth = Math.max(1, Math.floor(rect.width))
  const cssHeight = Math.max(1, Math.floor(rect.height))
  canvas.width = cssWidth * dpr
  canvas.height = cssHeight * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // Paper
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  // Grid: a single uniform pattern of equal squares (no bold/major lines).
  ctx.strokeStyle = grid
  ctx.lineWidth = 0.5
  for (let x = 0; x <= cssWidth + 0.5; x += gridSizePx) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, cssHeight)
    ctx.stroke()
  }
  for (let y = 0; y <= cssHeight + 0.5; y += gridSizePx) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(cssWidth, y + 0.5)
    ctx.stroke()
  }

  const n = leads.length
  if (n === 0 || beatsPerLead <= 0) return

  // One continuous trace across the whole row. For each x, pick the lead whose
  // segment x falls in and sample its waveform by the local phase.
  const midY = cssHeight / 2
  const halfH = cssHeight / 2
  const segW = cssWidth / n
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let x = 0; x <= cssWidth; x++) {
    const seg = Math.min(n - 1, Math.floor(x / segW))
    const data = leads[seg]
    if (data.length === 0) continue
    const localFrac = (x - seg * segW) / segW
    const phase = (localFrac * beatsPerLead) % 1
    const idx = Math.floor(phase * data.length) % data.length
    const y = midY - data[idx] * halfH * amplitude
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}
