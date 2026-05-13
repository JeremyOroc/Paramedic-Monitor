import type { Etco2Waveform, Rhythm, Spo2Waveform } from '@/types/vitals'

export type WaveformDef = {
  data: Float32Array
  cycleMs: number | null
}

export const RESP_CYCLE_MS = 5000
export const ETCO2_SCALE_MAX = 150
const SAMPLES = 600

export const VT_TUNING = {
  cycleMs: 340,
  plateau: [0.10, 0.18],
  plateauDrop: [0.035, 0.06],
  plateauApexOffset: 0.38,
  plateauWobble: [0.004, 0.009],
  troughDepth: [0.5, 0.68],
  troughCenter: [0.48, 0.56],
  troughHalfWidth: [0.22, 0.32],
  vSharpness: [0.9, 1.35],
  ampJitter: [0.92, 1.1],
  fineWobble: 0.0015,
  microNoise: 0.0004,
} as const

function flatLine(): Float32Array {
  return new Float32Array(SAMPLES)
}

function gaussian(i: number, center: number, width: number): number {
  const x = (i - center) / width
  return Math.exp(-x * x)
}

function mulberry32(seed: number): () => number {
  let s = (seed >>> 0) || 1
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type NsrGains = {
  pGain?: number
  qGain?: number
  rGain?: number
  sGain?: number
  tGain?: number
}

function triangle(t: number, start: number, peak: number, end: number): number {
  if (t < start || t > end) return 0
  if (t <= peak) return (t - start) / (peak - start)
  return 1 - (t - peak) / (end - peak)
}

type Range = readonly [number, number]

function between(rand: () => number, range: Range): number {
  const [min, max] = range
  return min + rand() * (max - min)
}

function synthNSR(g: NsrGains = {}): Float32Array {
  const pGain = g.pGain ?? 1
  const qGain = g.qGain ?? 1
  const rGain = g.rGain ?? 1
  const sGain = g.sGain ?? 1
  const tGain = g.tGain ?? 1
  const out = new Float32Array(SAMPLES)
  const pCenter = SAMPLES * 0.20
  const qCenter = SAMPLES * 0.338
  const tCenter = SAMPLES * 0.58
  for (let i = 0; i < SAMPLES; i++) {
    const phase = i / SAMPLES
    const p = 0.07 * pGain * gaussian(i, pCenter, SAMPLES * 0.022)
    const q = -0.035 * qGain * gaussian(i, qCenter, SAMPLES * 0.01)
    const r = 0.62 * rGain * triangle(phase, 0.35, 0.368, 0.392)
    const s = -0.055 * sGain * triangle(phase, 0.392, 0.42, 0.455)
    const st = phase > 0.445 && phase < 0.50 ? 0.006 * tGain : 0
    const t = 0.18 * tGain * gaussian(i, tCenter, SAMPLES * 0.043)
    const baseline = Math.sin(phase * Math.PI * 2.1) * 0.003
    out[i] = p + q + r + s + st + t + baseline
  }
  return out
}

function synthVT(seed = 1): Float32Array {
  const out = new Float32Array(SAMPLES)
  const rand = mulberry32(seed)
  const ampVar = between(rand, VT_TUNING.ampJitter)
  const microPhase = rand() * Math.PI * 2
  const hashPhase = rand() * Math.PI * 2
  const plateau = between(rand, VT_TUNING.plateau) * ampVar
  const plateauDrop = between(rand, VT_TUNING.plateauDrop) * ampVar
  const plateauWobble = between(rand, VT_TUNING.plateauWobble) * ampVar
  const troughDepth = between(rand, VT_TUNING.troughDepth) * ampVar
  const troughCenter = between(rand, VT_TUNING.troughCenter)
  const plateauApex = (troughCenter + VT_TUNING.plateauApexOffset) % 1
  const halfWidth = between(rand, VT_TUNING.troughHalfWidth)
  const vSharpness = between(rand, VT_TUNING.vSharpness)
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES
    const linearDistanceFromTrough = Math.abs(t - troughCenter)
    const linearDistanceFromApex = Math.abs(t - plateauApex)
    const circularDistanceFromApex = Math.min(
      linearDistanceFromApex,
      1 - linearDistanceFromApex,
    )
    const vProgress = Math.max(0, 1 - linearDistanceFromTrough / halfWidth)
    const vTrough = Math.pow(vProgress, vSharpness)
    const plateauDome = 1 - smoothstep(circularDistanceFromApex / 0.5)
    const plateauContour =
      plateau -
      plateauDrop * (1 - plateauDome) +
      plateauWobble * (plateauDome - 0.5)
    const fineContour =
      VT_TUNING.fineWobble * Math.sin(t * Math.PI * 4 + seed * 0.27) +
      VT_TUNING.fineWobble * 0.35 * Math.sin(t * Math.PI * 6 + microPhase)
    const microNoise =
      VT_TUNING.microNoise *
      Math.sin(t * Math.PI * 43 + hashPhase) *
      (0.55 + 0.45 * Math.sin(t * Math.PI * 2 + microPhase))
    out[i] = plateauContour + fineContour + microNoise - troughDepth * vTrough
  }
  return out
}

function synthVF(): Float32Array {
  const out = new Float32Array(SAMPLES)
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES
    const primary = 0.72 * Math.sin(t * Math.PI * 2 - 0.35)
    const asymmetricPeak = 0.22 * triangle(t, 0.10, 0.28, 0.44)
    const asymmetricTrough = -0.18 * triangle(t, 0.56, 0.70, 0.90)
    const wobble =
      0.075 * Math.sin(t * Math.PI * 6.4 + 0.9) +
      0.04 * Math.sin(t * Math.PI * 10.6 + 2.2)
    out[i] = primary + asymmetricPeak + asymmetricTrough + wobble
  }
  return out
}

function synthPleth(): Float32Array {
  const out = new Float32Array(SAMPLES)
  const peakA = SAMPLES * 0.22
  const peakB = SAMPLES * 0.40
  for (let i = 0; i < SAMPLES; i++) {
    const main = gaussian(i, peakA, SAMPLES * 0.07)
    const dicrotic = 0.35 * gaussian(i, peakB, SAMPLES * 0.09)
    out[i] = (main + dicrotic) * 0.95 - 0.05
  }
  return out
}

function scaleData(src: Float32Array, factor: number): Float32Array {
  const out = new Float32Array(src.length)
  for (let i = 0; i < src.length; i++) out[i] = src[i] * factor
  return out
}

function synthCapno(
  shape: 'normal' | 'hypoventilation' | 'obstructed',
  plateauV: number,
): Float32Array {
  const baseline = -1
  const cap = baseline + (plateauV - baseline)
  if (shape === 'obstructed') return synthCapnoShark(baseline, cap)
  if (shape === 'hypoventilation') {
    const clipped = Math.min(cap, baseline + (-1 + 0.4) * 2 + 1.6)
    return synthCapnoSquare(baseline, clipped)
  }
  return synthCapnoSquare(baseline, cap)
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

function synthCapnoSquare(baseline: number, peak: number): Float32Array {
  const out = new Float32Array(SAMPLES)
  const expStart = SAMPLES * 0.40
  const plateauStart = SAMPLES * 0.55
  const plateauEnd = SAMPLES * 0.85
  const inspReturn = SAMPLES * 0.96
  const rise = peak - baseline
  const plateauTilt = rise * 0.05
  for (let i = 0; i < SAMPLES; i++) {
    if (i < expStart) out[i] = baseline
    else if (i < plateauStart) {
      const t = (i - expStart) / (plateauStart - expStart)
      out[i] = baseline + smoothstep(t) * rise
    } else if (i < plateauEnd) {
      const t = (i - plateauStart) / (plateauEnd - plateauStart)
      out[i] = peak + t * plateauTilt
    } else if (i < inspReturn) {
      const t = (i - plateauEnd) / (inspReturn - plateauEnd)
      out[i] = (peak + plateauTilt) - smoothstep(t) * (rise + plateauTilt)
    } else out[i] = baseline
  }
  return out
}

function synthCapnoShark(baseline: number, peak: number): Float32Array {
  const out = new Float32Array(SAMPLES)
  const expStart = SAMPLES * 0.40
  const peakIdx = SAMPLES * 0.88
  const inspReturn = SAMPLES * 0.97
  const rise = peak - baseline
  for (let i = 0; i < SAMPLES; i++) {
    if (i < expStart) out[i] = baseline
    else if (i < peakIdx) {
      const r = (i - expStart) / (peakIdx - expStart)
      out[i] = baseline + Math.pow(r, 0.55) * rise
    } else if (i < inspReturn) {
      const t = (i - peakIdx) / (inspReturn - peakIdx)
      out[i] = peak - smoothstep(t) * rise
    } else out[i] = baseline
  }
  return out
}

export const ECG_RHYTHMS: Record<Rhythm, WaveformDef> = {
  nsr:      { data: synthNSR(), cycleMs: null },
  vf:       { data: synthVF(),  cycleMs: 330 },
  vt:       { data: synthVT(1), cycleMs: VT_TUNING.cycleMs },
  asystole: { data: flatLine(), cycleMs: 1000 },
  pea:      { data: synthNSR(), cycleMs: null },
}

export function getEcgRhythm(rhythm: Rhythm): WaveformDef {
  return ECG_RHYTHMS[rhythm] ?? ECG_RHYTHMS.nsr
}

export const ECG_SWEEP_MS = 4000
export const SPO2_SWEEP_MS = 4000
export const ETCO2_SWEEP_MS = 30000

export type LeadName =
  | 'I' | 'II' | 'III' | 'aVR' | 'aVL' | 'aVF'
  | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6'

export type LeadMorphology = {
  pGain: number
  qGain: number
  rGain: number
  sGain: number
  tGain: number
  inverted: boolean
}

export const LEAD_MORPHOLOGY: Record<LeadName, LeadMorphology> = {
  I:   { pGain: 0.8, qGain: 0.8, rGain: 0.55, sGain: 0.4, tGain: 0.7, inverted: false },
  II:  { pGain: 1.0, qGain: 1.0, rGain: 1.00, sGain: 1.0, tGain: 1.0, inverted: false },
  III: { pGain: 0.6, qGain: 0.6, rGain: 0.60, sGain: 0.5, tGain: 0.6, inverted: false },
  aVR: { pGain: 0.5, qGain: 0.5, rGain: 0.50, sGain: 0.4, tGain: 0.5, inverted: true  },
  aVL: { pGain: 0.5, qGain: 0.4, rGain: 0.40, sGain: 0.4, tGain: 0.5, inverted: false },
  aVF: { pGain: 0.6, qGain: 0.7, rGain: 0.65, sGain: 0.5, tGain: 0.6, inverted: false },
  V1:  { pGain: 0.4, qGain: 0.4, rGain: 0.18, sGain: 1.9, tGain: 0.3, inverted: false },
  V2:  { pGain: 0.5, qGain: 0.5, rGain: 0.38, sGain: 1.5, tGain: 0.4, inverted: false },
  V3:  { pGain: 0.6, qGain: 0.6, rGain: 0.70, sGain: 1.0, tGain: 0.6, inverted: false },
  V4:  { pGain: 0.7, qGain: 0.7, rGain: 1.10, sGain: 0.7, tGain: 0.7, inverted: false },
  V5:  { pGain: 0.7, qGain: 0.6, rGain: 1.25, sGain: 0.4, tGain: 0.8, inverted: false },
  V6:  { pGain: 0.7, qGain: 0.5, rGain: 1.20, sGain: 0.2, tGain: 0.8, inverted: false },
}

export function getLeadWaveform(rhythm: Rhythm, lead: LeadName): WaveformDef {
  const m = LEAD_MORPHOLOGY[lead]
  const base = ECG_RHYTHMS[rhythm]
  if (rhythm === 'nsr' || rhythm === 'pea') {
    const data = synthNSR({
      pGain: m.pGain,
      qGain: m.qGain,
      rGain: m.rGain,
      sGain: m.sGain,
      tGain: m.tGain,
    })
    return { data: m.inverted ? invert(data) : data, cycleMs: base.cycleMs }
  }
  const scale = (m.rGain + m.sGain) / 2
  const scaled = scaleData(base.data, scale)
  return { data: m.inverted ? invert(scaled) : scaled, cycleMs: base.cycleMs }
}

function invert(src: Float32Array): Float32Array {
  const out = new Float32Array(src.length)
  for (let i = 0; i < src.length; i++) out[i] = -src[i]
  return out
}

export function spo2AmplitudeFactor(spo2: number): number {
  if (!Number.isFinite(spo2)) return 1
  if (spo2 >= 95) return 1.0
  if (spo2 >= 85) return 0.7 + ((spo2 - 85) / 10) * 0.3
  if (spo2 >= 70) return 0.35 + ((spo2 - 70) / 15) * 0.35
  return 0.25
}

export function getSpo2Waveform(
  shape: Spo2Waveform,
  spo2Percent: number,
): WaveformDef {
  if (shape === 'off') return { data: flatLine(), cycleMs: 1000 }
  const shapeFactor = shape === 'weak' ? 0.45 : 1
  const ampFactor = spo2AmplitudeFactor(spo2Percent) * shapeFactor
  return { data: scaleData(synthPleth(), ampFactor), cycleMs: null }
}

export function getEtco2Waveform(
  shape: Etco2Waveform,
  etco2Mmhg: number,
): WaveformDef {
  if (shape === 'off') return { data: flatLine(), cycleMs: 1000 }
  const cycleMs =
    shape === 'hypoventilation' ? RESP_CYCLE_MS * 1.4
    : shape === 'obstructed'    ? RESP_CYCLE_MS * 1.2
    : RESP_CYCLE_MS
  const clamped = Math.max(0, Math.min(ETCO2_SCALE_MAX, etco2Mmhg))
  const plateauV = -1 + (2 * clamped) / ETCO2_SCALE_MAX
  return {
    data: synthCapno(
      shape === 'normal' || shape === 'hypoventilation' || shape === 'obstructed'
        ? shape
        : 'normal',
      plateauV,
    ),
    cycleMs,
  }
}
