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
  peak: 0.68,
  trough: -0.42,
  notch: -0.24,
  resetShoulder: 0.08,
  fineWobble: 0.0015,
  microNoise: 0.0004,
} as const

export const ASYSTOLE_TUNING = {
  cycleMs: 4000,
  primaryWander: 0.0065,
  secondaryWander: 0.0028,
  slopeWave: 0.0022,
  fineWave: 0.0013,
  microNoise: 0.00045,
} as const

export const TORSADES_TUNING = {
  cycleMs: 3900,
  beatCount: 15,
  patternCount: 4,
  peak: 0.95,
  trough: -0.84,
  minEnvelope: 0.14,
  twistPhase: 0.04,
  packetWidth: 0.135,
  fineWobble: 0.01,
  microNoise: 0.0022,
} as const

export const SECOND_DEGREE_TYPE_1_TUNING = {
  cycleMs: 3600,
  conductedBeats: 3,
  droppedPPhase: 0.80,
} as const

export const SECOND_DEGREE_TYPE_2_TUNING = {
  cycleMs: 3600,
  conductedBeats: 3,
  droppedPPhase: 0.825,
} as const

export const THIRD_DEGREE_TUNING = {
  cycleMs: 4200,
  pWaves: 6,
  escapeBeats: 2,
} as const

export const VF_TUNING = {
  cycleMs: 4000,
  minOscillations: 26,
  maxOscillations: 34,
  amplitude: [0.12, 0.32],
  baselineWander: 0.018,
  fineWobble: 0.014,
  microNoise: 0.004,
} as const

export const CPR_COMPRESSION_TUNING = {
  cycleMs: 500,
  peak: 0.36,
  trough: -0.42,
  wobble: 0.012,
} as const

export function getCprCompressionCycleMs(hr: number): number {
  return 60000 / Math.max(20, hr)
}

let polymorphicVariantSeed = 0

function flatLine(): Float32Array {
  return new Float32Array(SAMPLES)
}

function gaussian(i: number, center: number, width: number): number {
  const x = (i - center) / width
  return Math.exp(-x * x)
}

function gaussianPhaseUnwrapped(phase: number, center: number, width: number): number {
  return Math.exp(-Math.pow((phase - center) / width, 2))
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

type AnteriorMiGains = NsrGains & {
  stElevation?: number
  stSlope?: number
  qWidth?: number
  sWidth?: number
  polarity?: 1 | -1
}

type InferiorMiGains = NsrGains & {
  stElevation?: number
  stSlope?: number
  qWidth?: number
  sWidth?: number
  polarity?: 1 | -1
}

const ANTERIOR_MI_MONITOR_MORPHOLOGY: AnteriorMiGains = {
  pGain: 0.65,
  qGain: 0.9,
  rGain: 0.34,
  sGain: 2.05,
  tGain: 0.95,
  stElevation: 0.095,
  stSlope: 0.012,
  sWidth: 0.034,
}

const INFERIOR_MI_MONITOR_MORPHOLOGY: InferiorMiGains = {
  pGain: 0.95,
  qGain: 0.9,
  rGain: 1.45,
  sGain: 0.58,
  tGain: 2.25,
  stElevation: 0.340,
  stSlope: 0.050,
}

type ControlPoint = readonly [number, number]

const ANTERIOR_MI_MONITOR_POINTS: ReadonlyArray<ControlPoint> = [
  [0.000, 0.000],
  [0.120, 0.000],
  [0.230, 0.000],
  [0.275, 0.045],
  [0.315, 0.000],
  [0.330, 0.000],
  [0.342, -0.030],
  [0.362, 0.220],
  [0.388, -0.500],
  [0.430, -0.070],
  [0.470, 0.040],
  [0.545, 0.200],
  [0.610, 0.260],
  [0.690, 0.110],
  [0.775, 0.000],
  [1.000, 0.000],
]

const INFERIOR_MI_MONITOR_POINTS: ReadonlyArray<ControlPoint> = [
  [0.000, 0.000],
  [0.120, 0.000],
  [0.235, 0.000],
  [0.280, 0.075],
  [0.318, 0.000],
  [0.335, 0.000],
  [0.342, -0.030],
  [0.374, 0.760],
  [0.392, 0.360],
  [0.416, 0.185],
  [0.460, 0.145],
  [0.505, 0.165],
  [0.565, 0.245],
  [0.615, 0.340],
  [0.645, 0.382],
  [0.670, 0.370],
  [0.705, 0.260],
  [0.755, 0.030],
  [0.795, 0.000],
  [1.000, 0.000],
]

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

function interpolateSmooth(points: ReadonlyArray<ControlPoint>, phase: number): number {
  for (let i = 1; i < points.length; i++) {
    const [prevT, prevV] = points[i - 1]
    const [nextT, nextV] = points[i]
    if (phase <= nextT) {
      const span = nextT - prevT
      const t = span <= 0 ? 1 : (phase - prevT) / span
      return prevV + (nextV - prevV) * smoothstep(t)
    }
  }
  return points[points.length - 1][1]
}

function synthReferenceStrip(points: ReadonlyArray<ControlPoint>): Float32Array {
  const out = new Float32Array(SAMPLES)
  for (let i = 0; i < SAMPLES; i++) {
    const phase = i / SAMPLES
    out[i] =
      interpolateSmooth(points, phase) +
      0.0025 * Math.sin(phase * Math.PI * 2 * 1.35 - 0.4)
  }
  return out
}

function synthAsystole(): Float32Array {
  const out = new Float32Array(SAMPLES)
  let sum = 0
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES
    const wander =
      ASYSTOLE_TUNING.primaryWander * Math.sin(t * Math.PI * 2 * 0.58 - 0.55) +
      ASYSTOLE_TUNING.secondaryWander * Math.sin(t * Math.PI * 2 * 1.35 + 1.3) +
      ASYSTOLE_TUNING.slopeWave * Math.sin(t * Math.PI * 2 * 0.24 + 0.75) +
      ASYSTOLE_TUNING.fineWave * Math.sin(t * Math.PI * 2 * 2.4 - 0.9)
    const microNoise =
      ASYSTOLE_TUNING.microNoise *
      (
        Math.sin(t * Math.PI * 2 * 23 + 0.2) +
        0.45 * Math.sin(t * Math.PI * 2 * 57 + 2.1)
      )
    const value = wander + microNoise
    out[i] = value
    sum += value
  }
  const centerOffset = sum / SAMPLES
  for (let i = 0; i < SAMPLES; i++) out[i] -= centerOffset
  return out
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

function synthFirstDegreeBlock(g: NsrGains = {}): Float32Array {
  const pGain = g.pGain ?? 1
  const qGain = g.qGain ?? 1
  const rGain = g.rGain ?? 1
  const sGain = g.sGain ?? 1
  const tGain = g.tGain ?? 1
  const out = new Float32Array(SAMPLES)
  const pCenter = SAMPLES * 0.185
  const qCenter = SAMPLES * 0.455
  const tCenter = SAMPLES * 0.625

  for (let i = 0; i < SAMPLES; i++) {
    const phase = i / SAMPLES
    const p = 0.058 * pGain * gaussian(i, pCenter, SAMPLES * 0.026)
    const q = -0.030 * qGain * gaussian(i, qCenter, SAMPLES * 0.010)
    const r = 0.56 * rGain * triangle(phase, 0.466, 0.482, 0.504)
    const s = -0.050 * sGain * triangle(phase, 0.504, 0.528, 0.560)
    const st = phase > 0.550 && phase < 0.590 ? 0.005 * tGain : 0
    const t = 0.165 * tGain * gaussian(i, tCenter, SAMPLES * 0.048)
    const baseline = Math.sin(phase * Math.PI * 2.05) * 0.0025
    out[i] = p + q + r + s + st + t + baseline
  }

  return out
}

function synthCprCompression(): Float32Array {
  const out = new Float32Array(SAMPLES)
  for (let i = 0; i < SAMPLES; i++) {
    const phase = i / SAMPLES
    const wave = Math.sin(phase * Math.PI * 2 + Math.PI * 0.18)
    const rounded = Math.sign(wave) * Math.pow(Math.abs(wave), 0.72)
    const scaled =
      rounded >= 0
        ? rounded * CPR_COMPRESSION_TUNING.peak
        : rounded * Math.abs(CPR_COMPRESSION_TUNING.trough)
    const fineShape =
      CPR_COMPRESSION_TUNING.wobble *
      Math.sin(phase * Math.PI * 4 + Math.PI * 0.15) *
      (0.35 + Math.abs(rounded) * 0.65)
    out[i] = scaled + fineShape
  }
  return out
}

export const CPR_COMPRESSION_WAVEFORM: WaveformDef = {
  data: synthCprCompression(),
  cycleMs: CPR_COMPRESSION_TUNING.cycleMs,
}

function synthSecondDegreeType1(g: NsrGains = {}): Float32Array {
  const pGain = g.pGain ?? 1
  const qGain = g.qGain ?? 1
  const rGain = g.rGain ?? 1
  const sGain = g.sGain ?? 1
  const tGain = g.tGain ?? 1
  const out = new Float32Array(SAMPLES)
  const conducted = [
    { p: 0.055, qrs: 0.150, t: 0.245 },
    { p: 0.300, qrs: 0.425, t: 0.520 },
    { p: 0.535, qrs: 0.695, t: 0.785 },
  ] as const

  for (let i = 0; i < SAMPLES; i++) {
    const phase = i / SAMPLES
    let value = Math.sin(phase * Math.PI * 2.05) * 0.0025

    for (const beat of conducted) {
      value += 0.055 * pGain * gaussianPhaseUnwrapped(phase, beat.p, 0.018)
      value += -0.030 * qGain * gaussianPhaseUnwrapped(phase, beat.qrs - 0.018, 0.007)
      value += 0.56 * rGain * triangle(phase, beat.qrs - 0.010, beat.qrs, beat.qrs + 0.020)
      value += -0.060 * sGain * triangle(phase, beat.qrs + 0.020, beat.qrs + 0.038, beat.qrs + 0.064)
      value += 0.145 * tGain * gaussianPhaseUnwrapped(phase, beat.t, 0.036)
    }

    value +=
      0.052 *
      pGain *
      gaussianPhaseUnwrapped(phase, SECOND_DEGREE_TYPE_1_TUNING.droppedPPhase, 0.018)
    out[i] = value
  }

  return out
}

function synthSecondDegreeType2(g: NsrGains = {}): Float32Array {
  const pGain = g.pGain ?? 1
  const qGain = g.qGain ?? 1
  const rGain = g.rGain ?? 1
  const sGain = g.sGain ?? 1
  const tGain = g.tGain ?? 1
  const out = new Float32Array(SAMPLES)
  const conducted = [
    { p: 0.070, qrs: 0.135, t: 0.225 },
    { p: 0.285, qrs: 0.350, t: 0.440 },
    { p: 0.500, qrs: 0.565, t: 0.655 },
  ] as const

  for (let i = 0; i < SAMPLES; i++) {
    const phase = i / SAMPLES
    let value = Math.sin(phase * Math.PI * 2.05) * 0.0025

    for (const beat of conducted) {
      value += 0.057 * pGain * gaussianPhaseUnwrapped(phase, beat.p, 0.018)
      value += -0.030 * qGain * gaussianPhaseUnwrapped(phase, beat.qrs - 0.018, 0.007)
      value += 0.56 * rGain * triangle(phase, beat.qrs - 0.010, beat.qrs, beat.qrs + 0.020)
      value += -0.058 * sGain * triangle(phase, beat.qrs + 0.020, beat.qrs + 0.038, beat.qrs + 0.064)
      value += 0.145 * tGain * gaussianPhaseUnwrapped(phase, beat.t, 0.036)
    }

    value +=
      0.054 *
      pGain *
      gaussianPhaseUnwrapped(phase, SECOND_DEGREE_TYPE_2_TUNING.droppedPPhase, 0.018)
    out[i] = value
  }

  return out
}

function synthThirdDegreeBlock(g: NsrGains = {}): Float32Array {
  const pGain = g.pGain ?? 1
  const qGain = g.qGain ?? 1
  const rGain = g.rGain ?? 1
  const sGain = g.sGain ?? 1
  const tGain = g.tGain ?? 1
  const out = new Float32Array(SAMPLES)
  const pWaves = [0.085, 0.245, 0.405, 0.565, 0.725, 0.885] as const
  const escapeBeats = [
    { qrs: 0.165, t: 0.285 },
    { qrs: 0.650, t: 0.770 },
  ] as const

  for (let i = 0; i < SAMPLES; i++) {
    const phase = i / SAMPLES
    let value = Math.sin(phase * Math.PI * 2.05) * 0.0025

    for (const p of pWaves) {
      value += 0.040 * pGain * gaussianPhaseUnwrapped(phase, p, 0.014)
    }

    for (const beat of escapeBeats) {
      value += -0.040 * qGain * gaussianPhaseUnwrapped(phase, beat.qrs - 0.026, 0.010)
      value += 0.46 * rGain * triangle(phase, beat.qrs - 0.018, beat.qrs, beat.qrs + 0.034)
      value += -0.135 * sGain * triangle(phase, beat.qrs + 0.034, beat.qrs + 0.068, beat.qrs + 0.118)
      value += 0.118 * tGain * gaussianPhaseUnwrapped(phase, beat.t, 0.043)
    }

    out[i] = value
  }

  return out
}

function synthAnteriorMI(g: AnteriorMiGains = {}): Float32Array {
  const pGain = g.pGain ?? 0.8
  const qGain = g.qGain ?? 1
  const rGain = g.rGain ?? 0.65
  const sGain = g.sGain ?? 1
  const tGain = g.tGain ?? 1.3
  const stElevation = g.stElevation ?? 0.12
  const stSlope = g.stSlope ?? 0.025
  const qWidth = g.qWidth ?? 0.012
  const sWidth = g.sWidth ?? 0.03
  const polarity = g.polarity ?? 1
  const out = new Float32Array(SAMPLES)
  const pCenter = SAMPLES * 0.20
  const qCenter = SAMPLES * 0.335
  const tCenter = SAMPLES * 0.61

  for (let i = 0; i < SAMPLES; i++) {
    const phase = i / SAMPLES
    const p = 0.05 * pGain * gaussian(i, pCenter, SAMPLES * 0.022)
    const q = -0.075 * qGain * gaussian(i, qCenter, SAMPLES * qWidth)
    const r = 0.50 * rGain * triangle(phase, 0.348, 0.368, 0.390)
    const s = -0.19 * sGain * gaussian(i, SAMPLES * 0.41, SAMPLES * sWidth)
    const stWindow =
      phase > 0.430 && phase < 0.565
        ? stElevation + stSlope * ((phase - 0.430) / 0.135)
        : 0
    const t = 0.25 * tGain * gaussian(i, tCenter, SAMPLES * 0.060)
    const terminal =
      phase > 0.675 && phase < 0.760
        ? 0.030 * tGain * Math.sin(((phase - 0.675) / 0.085) * Math.PI)
        : 0
    const baseline = Math.sin(phase * Math.PI * 2.05) * 0.003
    out[i] = polarity * (p + q + r + s + stWindow + t + terminal + baseline)
  }

  return out
}

function synthInferiorMI(g: InferiorMiGains = {}): Float32Array {
  const pGain = g.pGain ?? 0.85
  const qGain = g.qGain ?? 0.85
  const rGain = g.rGain ?? 0.95
  const sGain = g.sGain ?? 0.9
  const tGain = g.tGain ?? 1.35
  const stElevation = g.stElevation ?? 0.14
  const stSlope = g.stSlope ?? 0.025
  const qWidth = g.qWidth ?? 0.012
  const sWidth = g.sWidth ?? 0.025
  const polarity = g.polarity ?? 1
  const out = new Float32Array(SAMPLES)
  const pCenter = SAMPLES * 0.20
  const qCenter = SAMPLES * 0.336
  const tCenter = SAMPLES * 0.600

  for (let i = 0; i < SAMPLES; i++) {
    const phase = i / SAMPLES
    const p = 0.060 * pGain * gaussian(i, pCenter, SAMPLES * 0.022)
    const q = -0.055 * qGain * gaussian(i, qCenter, SAMPLES * qWidth)
    const r = 0.56 * rGain * triangle(phase, 0.350, 0.369, 0.394)
    const s = -0.090 * sGain * gaussian(i, SAMPLES * 0.412, SAMPLES * sWidth)
    const stWindow =
      phase > 0.430 && phase < 0.565
        ? stElevation + stSlope * ((phase - 0.430) / 0.135)
        : 0
    const t = 0.230 * tGain * gaussian(i, tCenter, SAMPLES * 0.055)
    const terminal =
      phase > 0.665 && phase < 0.750
        ? 0.018 * tGain * Math.sin(((phase - 0.665) / 0.085) * Math.PI)
        : 0
    const baseline = Math.sin(phase * Math.PI * 2.05) * 0.003
    out[i] = polarity * (p + q + r + s + stWindow + t + terminal + baseline)
  }

  return out
}

function synthVT(seed = 1): Float32Array {
  const out = new Float32Array(SAMPLES)
  const rand = mulberry32(seed)
  const microPhase = rand() * Math.PI * 2
  const hashPhase = rand() * Math.PI * 2
  const points: ReadonlyArray<ControlPoint> = [
    [0.000, VT_TUNING.resetShoulder],
    [0.060, VT_TUNING.resetShoulder],
    [0.175, VT_TUNING.peak],
    [0.300, 0.180],
    [0.420, VT_TUNING.trough],
    [0.535, VT_TUNING.notch],
    [0.650, -0.070],
    [0.780, 0.055],
    [1.000, VT_TUNING.resetShoulder],
  ]

  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES
    const fineContour =
      VT_TUNING.fineWobble * Math.sin(t * Math.PI * 2 * 5 + seed * 0.27) +
      VT_TUNING.fineWobble * 0.35 * Math.sin(t * Math.PI * 2 * 9 + microPhase)
    const microNoise =
      VT_TUNING.microNoise *
      Math.sin(t * Math.PI * 43 + hashPhase) *
      (0.55 + 0.45 * Math.sin(t * Math.PI * 2 + microPhase))
    out[i] = interpolateSmooth(points, t) + fineContour + microNoise
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

function torsadesEnvelope(progress: number, pattern: number, twistPhase: number): number {
  const packetSets = [
    [
      [0.28, 1.0, 1.0],
      [0.78, 0.9, 1.1],
    ],
    [
      [0.22, 0.9, 0.9],
      [0.58, 1.0, 1.18],
      [0.90, 0.62, 0.82],
    ],
    [
      [0.34, 1.0, 1.2],
      [0.82, 0.84, 0.95],
    ],
    [
      [0.26, 0.92, 1.05],
      [0.66, 0.78, 0.9],
      [0.92, 0.7, 0.8],
    ],
  ] as const
  const packets = packetSets[pattern] ?? packetSets[0]
  let bigPacket = 0
  for (const [center, gain, widthGain] of packets) {
    bigPacket = Math.max(
      bigPacket,
      gain *
        gaussianPhaseUnwrapped(
          progress,
          center + twistPhase,
          TORSADES_TUNING.packetWidth * widthGain,
        ),
    )
  }
  const residualHumps =
    0.12 * Math.abs(Math.sin((progress * 3.2 + twistPhase) * Math.PI * 2)) +
    0.08 * Math.abs(Math.sin((progress * 7.1 - twistPhase) * Math.PI * 2))
  const packet = Math.min(1, Math.max(bigPacket, residualHumps))
  return TORSADES_TUNING.minEnvelope + (1 - TORSADES_TUNING.minEnvelope) * packet
}

function synthTorsades(seed = 12): Float32Array {
  const out = new Float32Array(SAMPLES)
  const rand = mulberry32(seed)
  const pattern = Math.abs(seed) % TORSADES_TUNING.patternCount
  const twistPhase = TORSADES_TUNING.twistPhase + pattern * 0.075 + (rand() - 0.5) * 0.035
  const phaseOffset = rand() * 0.35
  const phaseWarpA = 0.035 + rand() * 0.018
  const phaseWarpB = 0.012 + rand() * 0.012
  const packetTiltPhase = rand() * Math.PI * 2
  const cycles = TORSADES_TUNING.beatCount + (pattern === 2 ? 0.45 : pattern === 3 ? -0.25 : 0)

  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES
    const envelope =
      torsadesEnvelope(t, pattern, twistPhase) *
      (0.95 + 0.05 * Math.sin((t * 4.8 + twistPhase) * Math.PI * 2))
    const phaseWarp =
      phaseWarpA * Math.sin((t * 2.2 + twistPhase) * Math.PI * 2) +
      phaseWarpB * Math.sin((t * 5.4 - twistPhase) * Math.PI * 2)
    const carrierPhase = (cycles * t + phaseOffset + phaseWarp) * Math.PI * 2
    const carrier = Math.sin(carrierPhase)
    const roundedCarrier =
      Math.sign(carrier) * Math.pow(Math.abs(carrier), 1.08)
    const ovalSkew =
      0.08 * Math.sin(carrierPhase * 2 + packetTiltPhase) +
      0.035 * Math.sin(carrierPhase * 3 - packetTiltPhase)
    const polarityScale =
      roundedCarrier >= 0 ? TORSADES_TUNING.peak : Math.abs(TORSADES_TUNING.trough)
    const packetTilt = envelope * 0.04 * Math.sin((t * 1.7 + twistPhase) * Math.PI * 2)
    const fineWobble =
      TORSADES_TUNING.fineWobble *
      Math.sin(t * Math.PI * 2 * 18.8 + seed * 0.13) *
      (0.45 + envelope)
    const smallHumps =
      0.045 *
      Math.sin(t * Math.PI * 2 * (cycles * 1.92) + seed * 0.31) *
      (1.05 - envelope)
    const microNoise =
      TORSADES_TUNING.microNoise *
      Math.sin(t * Math.PI * 2 * 47 + 0.9) *
      (0.65 + 0.35 * Math.sin(t * Math.PI * 2 * 3.1))
    out[i] =
      envelope * polarityScale * (roundedCarrier + ovalSkew) +
      packetTilt +
      smallHumps +
      fineWobble +
      microNoise
  }
  return out
}

function synthVF(seed = 31): Float32Array {
  const rand = mulberry32(seed)
  const points: ControlPoint[] = [[0, 0]]
  const targetOscillations = Math.floor(
    between(rand, [VF_TUNING.minOscillations, VF_TUNING.maxOscillations]),
  )
  let phase = 0
  let polarity: 1 | -1 = rand() > 0.5 ? 1 : -1

  for (let i = 0; i < targetOscillations && phase < 0.940; i++) {
    const remaining = 1 - phase
    const averageStep = remaining / Math.max(1, targetOscillations - i)
    const step = Math.max(0.026, Math.min(0.056, averageStep * between(rand, [0.74, 1.36])))
    phase = Math.min(0.940, phase + step)
    if (rand() > 0.04) polarity = polarity === 1 ? -1 : 1

    const envelope = 0.82 + 0.18 * Math.sin((phase * 2.7 + rand() * 0.18) * Math.PI * 2)
    const jag = rand() > 0.78 ? 1.08 : 1
    const amplitude = between(rand, VF_TUNING.amplitude) * envelope * jag
    points.push([phase, amplitude * polarity])
  }

  points.push([0.975, 0])
  points.push([1, 0])

  const out = new Float32Array(SAMPLES)
  let sum = 0
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES
    const baseline =
      VF_TUNING.baselineWander * Math.sin(t * Math.PI * 2 * 1.25 + seed * 0.11) +
      VF_TUNING.baselineWander * 0.45 * Math.sin(t * Math.PI * 2 * 2.9 + seed * 0.23)
    const fine =
      VF_TUNING.fineWobble * Math.sin(t * Math.PI * 2 * (targetOscillations * 1.7) + seed) +
      VF_TUNING.microNoise * Math.sin(t * Math.PI * 2 * 71 + seed * 0.31)
    const value = interpolateSmooth(points, t) + baseline + fine
    out[i] = value
    sum += value
  }

  const centerOffset = sum / SAMPLES
  let maxAbs = 0
  for (let i = 0; i < SAMPLES; i++) {
    out[i] -= centerOffset
    maxAbs = Math.max(maxAbs, Math.abs(out[i]))
  }
  const scale = maxAbs > 0.42 ? 0.42 / maxAbs : 1
  for (let i = 0; i < SAMPLES; i++) out[i] *= scale

  return out
}


export const ECG_RHYTHMS: Record<Rhythm, WaveformDef> = {
  off:      { data: new Float32Array([0, 0, 0, 0]), cycleMs: 1000 },
  nsr:      { data: synthNSR(),      cycleMs: null },
  vf:       { data: synthVF(17),     cycleMs: VF_TUNING.cycleMs },
  vt:       { data: synthVT(1),      cycleMs: VT_TUNING.cycleMs },
  torsades: { data: synthTorsades(), cycleMs: TORSADES_TUNING.cycleMs },
  asystole: { data: synthAsystole(), cycleMs: ASYSTOLE_TUNING.cycleMs },
  'first-degree': { data: synthFirstDegreeBlock(), cycleMs: null },
  'second-degree-type-1': {
    data: synthSecondDegreeType1(),
    cycleMs: SECOND_DEGREE_TYPE_1_TUNING.cycleMs,
  },
  'second-degree-type-2': {
    data: synthSecondDegreeType2(),
    cycleMs: SECOND_DEGREE_TYPE_2_TUNING.cycleMs,
  },
  'third-degree': {
    data: synthThirdDegreeBlock(),
    cycleMs: THIRD_DEGREE_TUNING.cycleMs,
  },
  'anterior-mi': { data: synthReferenceStrip(ANTERIOR_MI_MONITOR_POINTS), cycleMs: null },
  'inferior-mi': { data: synthReferenceStrip(INFERIOR_MI_MONITOR_POINTS), cycleMs: null },
}

export function getEcgRhythm(rhythm: Rhythm): WaveformDef {
  if (rhythm === 'vf') {
    polymorphicVariantSeed += 1
    return {
      data: synthVF(90 + polymorphicVariantSeed),
      cycleMs: VF_TUNING.cycleMs,
    }
  }
  if (rhythm === 'torsades') {
    polymorphicVariantSeed += 1
    return {
      data: synthTorsades(50 + polymorphicVariantSeed),
      cycleMs: TORSADES_TUNING.cycleMs,
    }
  }
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

const ANTERIOR_MI_LEAD_MORPHOLOGY: Record<LeadName, AnteriorMiGains> = {
  I:   { pGain: 0.75, qGain: 0.8, rGain: 0.55, sGain: 0.45, tGain: 0.90, stElevation: 0.050 },
  II:  { pGain: 0.90, qGain: 0.9, rGain: 0.42, sGain: 1.20, tGain: 0.85, stElevation: 0.045 },
  III: { pGain: 0.55, qGain: 0.8, rGain: 0.28, sGain: 1.65, tGain: 0.35, stElevation: 0.020 },
  aVR: { pGain: 0.55, qGain: 0.9, rGain: 0.40, sGain: 0.80, tGain: 0.80, stElevation: 0.070, polarity: -1 },
  aVL: { pGain: 0.50, qGain: 0.7, rGain: 0.58, sGain: 0.45, tGain: 0.75, stElevation: 0.055 },
  aVF: { pGain: 0.55, qGain: 0.8, rGain: 0.35, sGain: 1.25, tGain: 0.45, stElevation: 0.025 },
  V1:  { pGain: 0.40, qGain: 0.7, rGain: 0.22, sGain: 1.90, tGain: 0.85, stElevation: 0.110 },
  V2:  { pGain: 0.45, qGain: 0.9, rGain: 0.32, sGain: 2.10, tGain: 2.10, stElevation: 0.300, stSlope: 0.040 },
  V3:  { pGain: 0.50, qGain: 1.0, rGain: 0.38, sGain: 2.05, tGain: 2.35, stElevation: 0.350, stSlope: 0.045 },
  V4:  { pGain: 0.60, qGain: 0.9, rGain: 0.70, sGain: 1.55, tGain: 2.15, stElevation: 0.300, stSlope: 0.040 },
  V5:  { pGain: 0.65, qGain: 0.8, rGain: 0.90, sGain: 0.90, tGain: 1.50, stElevation: 0.160, stSlope: 0.030 },
  V6:  { pGain: 0.65, qGain: 0.7, rGain: 0.85, sGain: 0.55, tGain: 1.15, stElevation: 0.085, stSlope: 0.020 },
}

const INFERIOR_MI_LEAD_MORPHOLOGY: Record<LeadName, InferiorMiGains> = {
  I:   { pGain: 0.75, qGain: 0.7, rGain: 0.70, sGain: 0.75, tGain: 0.65, stElevation: 0.010, stSlope: 0.000 },
  II:  { pGain: 1.00, qGain: 0.9, rGain: 1.25, sGain: 0.70, tGain: 1.85, stElevation: 0.290, stSlope: 0.040 },
  III: { pGain: 0.85, qGain: 0.9, rGain: 1.15, sGain: 0.75, tGain: 1.95, stElevation: 0.330, stSlope: 0.045 },
  aVR: { pGain: 0.55, qGain: 0.8, rGain: 0.50, sGain: 0.75, tGain: 1.00, stElevation: 0.075, polarity: -1 },
  aVL: { pGain: 0.50, qGain: 0.8, rGain: 0.80, sGain: 0.70, tGain: 1.15, stElevation: 0.095, polarity: -1 },
  aVF: { pGain: 0.90, qGain: 0.9, rGain: 1.20, sGain: 0.70, tGain: 1.90, stElevation: 0.310, stSlope: 0.040 },
  V1:  { pGain: 0.40, qGain: 0.7, rGain: 0.25, sGain: 1.80, tGain: 0.70, stElevation: 0.035 },
  V2:  { pGain: 0.45, qGain: 0.7, rGain: 0.38, sGain: 1.60, tGain: 0.70, stElevation: 0.035 },
  V3:  { pGain: 0.55, qGain: 0.7, rGain: 0.80, sGain: 1.10, tGain: 0.75, stElevation: 0.020 },
  V4:  { pGain: 0.65, qGain: 0.7, rGain: 1.45, sGain: 0.65, tGain: 0.75, stElevation: 0.045 },
  V5:  { pGain: 0.70, qGain: 0.7, rGain: 1.25, sGain: 0.45, tGain: 0.70, stElevation: 0.030 },
  V6:  { pGain: 0.70, qGain: 0.7, rGain: 1.05, sGain: 0.35, tGain: 0.70, stElevation: 0.025 },
}

export function getLeadWaveform(rhythm: Rhythm, lead: LeadName): WaveformDef {
  const m = LEAD_MORPHOLOGY[lead]
  const base = ECG_RHYTHMS[rhythm]
  if (rhythm === 'anterior-mi') {
    return {
      data: synthAnteriorMI(ANTERIOR_MI_LEAD_MORPHOLOGY[lead]),
      cycleMs: base.cycleMs,
    }
  }
  if (rhythm === 'inferior-mi') {
    return {
      data: synthInferiorMI(INFERIOR_MI_LEAD_MORPHOLOGY[lead]),
      cycleMs: base.cycleMs,
    }
  }
  if (rhythm === 'nsr') {
    const data = synthNSR({
      pGain: m.pGain,
      qGain: m.qGain,
      rGain: m.rGain,
      sGain: m.sGain,
      tGain: m.tGain,
    })
    return { data: m.inverted ? invert(data) : data, cycleMs: base.cycleMs }
  }
  if (rhythm === 'first-degree') {
    const data = synthFirstDegreeBlock({
      pGain: m.pGain,
      qGain: m.qGain,
      rGain: m.rGain,
      sGain: m.sGain,
      tGain: m.tGain,
    })
    return { data: m.inverted ? invert(data) : data, cycleMs: base.cycleMs }
  }
  if (rhythm === 'second-degree-type-1') {
    const data = synthSecondDegreeType1({
      pGain: m.pGain,
      qGain: m.qGain,
      rGain: m.rGain,
      sGain: m.sGain,
      tGain: m.tGain,
    })
    return { data: m.inverted ? invert(data) : data, cycleMs: base.cycleMs }
  }
  if (rhythm === 'second-degree-type-2') {
    const data = synthSecondDegreeType2({
      pGain: m.pGain,
      qGain: m.qGain,
      rGain: m.rGain,
      sGain: m.sGain,
      tGain: m.tGain,
    })
    return { data: m.inverted ? invert(data) : data, cycleMs: base.cycleMs }
  }
  if (rhythm === 'third-degree') {
    const data = synthThirdDegreeBlock({
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
