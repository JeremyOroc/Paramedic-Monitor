import { describe, expect, it } from 'vitest'
import {
  ASYSTOLE_TUNING,
  CPR_COMPRESSION_TUNING,
  CPR_COMPRESSION_WAVEFORM,
  ECG_RHYTHMS,
  ECG_SWEEP_MS,
  ETCO2_SCALE_MAX,
  ETCO2_SWEEP_MS,
  RESP_CYCLE_MS,
  SECOND_DEGREE_TYPE_1_TUNING,
  SECOND_DEGREE_TYPE_2_TUNING,
  SPO2_SWEEP_MS,
  THIRD_DEGREE_TUNING,
  TORSADES_TUNING,
  VT_TUNING,
  VF_TUNING,
  getEcgRhythm,
  getEtco2Waveform,
  getLeadWaveform,
  getSpo2Waveform,
  spo2AmplitudeFactor,
  type WaveformDef,
} from '../rhythms'

function assertNormalized(def: WaveformDef, name: string) {
  expect(def.data.length, `${name} has samples`).toBeGreaterThan(0)
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < def.data.length; i++) {
    if (def.data[i] < min) min = def.data[i]
    if (def.data[i] > max) max = def.data[i]
  }
  expect(min, `${name} min in range`).toBeGreaterThanOrEqual(-1.05)
  expect(max, `${name} max in range`).toBeLessThanOrEqual(1.05)
}

function peakOf(data: Float32Array): number {
  let m = -Infinity
  for (let i = 0; i < data.length; i++) if (data[i] > m) m = data[i]
  return m
}

function troughOf(data: Float32Array): number {
  let m = Infinity
  for (let i = 0; i < data.length; i++) if (data[i] < m) m = data[i]
  return m
}

function indexOfTrough(data: Float32Array): number {
  let idx = 0
  for (let i = 1; i < data.length; i++) {
    if (data[i] < data[idx]) idx = i
  }
  return idx
}

function indexOfPeakBefore(data: Float32Array, end: number): number {
  let idx = 0
  for (let i = 1; i < end; i++) {
    if (data[i] > data[idx]) idx = i
  }
  return idx
}

function zeroCrossings(data: Float32Array): number {
  let crossings = 0
  for (let i = 1; i < data.length; i++) {
    if ((data[i - 1] <= 0 && data[i] > 0) || (data[i - 1] >= 0 && data[i] < 0)) {
      crossings++
    }
  }
  return crossings
}

function maxAdjacentDelta(data: Float32Array): number {
  let max = 0
  for (let i = 1; i < data.length; i++) {
    max = Math.max(max, Math.abs(data[i] - data[i - 1]))
  }
  return max
}

function directionChanges(data: Float32Array, end: number): number {
  let changes = 0
  let lastDirection = 0
  for (let i = 1; i < end; i++) {
    const delta = data[i] - data[i - 1]
    const direction = Math.abs(delta) < 0.0005 ? 0 : Math.sign(delta)
    if (direction !== 0 && lastDirection !== 0 && direction !== lastDirection) {
      changes++
    }
    if (direction !== 0) lastDirection = direction
  }
  return changes
}

function segmentAmplitudes(data: Float32Array, segments: number): number[] {
  return Array.from({ length: segments }, (_, segment) => {
    const start = Math.floor((segment / segments) * data.length)
    const end = Math.floor(((segment + 1) / segments) * data.length)
    let min = Infinity
    let max = -Infinity
    for (let i = start; i < end; i++) {
      if (data[i] < min) min = data[i]
      if (data[i] > max) max = data[i]
    }
    return max - min
  })
}

function segmentMaxDeltas(data: Float32Array, segments: number): number[] {
  return Array.from({ length: segments }, (_, segment) => {
    const start = Math.max(1, Math.floor((segment / segments) * data.length))
    const end = Math.floor(((segment + 1) / segments) * data.length)
    let max = 0
    for (let i = start; i < end; i++) {
      max = Math.max(max, Math.abs(data[i] - data[i - 1]))
    }
    return max
  })
}

function waveformDistance(a: Float32Array, b: Float32Array): number {
  let distance = 0
  for (let i = 0; i < a.length; i++) distance += Math.abs(a[i] - b[i])
  return distance
}

function segmentMean(data: Float32Array, startPhase: number, endPhase: number): number {
  const start = Math.floor(data.length * startPhase)
  const end = Math.floor(data.length * endPhase)
  let sum = 0
  for (let i = start; i < end; i++) sum += data[i]
  return sum / Math.max(1, end - start)
}

function segmentPeak(data: Float32Array, startPhase: number, endPhase: number): number {
  const start = Math.floor(data.length * startPhase)
  const end = Math.floor(data.length * endPhase)
  let max = -Infinity
  for (let i = start; i < end; i++) max = Math.max(max, data[i])
  return max
}

function segmentTrough(data: Float32Array, startPhase: number, endPhase: number): number {
  const start = Math.floor(data.length * startPhase)
  const end = Math.floor(data.length * endPhase)
  let min = Infinity
  for (let i = start; i < end; i++) min = Math.min(min, data[i])
  return min
}

function expectTorsadesStylePattern(def: WaveformDef): void {
  const data = def.data
  const beatRate = (TORSADES_TUNING.beatCount * 60000) / TORSADES_TUNING.cycleMs
  const amplitudes = segmentAmplitudes(data, TORSADES_TUNING.beatCount)
  const deltas = segmentMaxDeltas(data, TORSADES_TUNING.beatCount)
  const minAmplitude = Math.min(...amplitudes)
  const maxAmplitude = Math.max(...amplitudes)
  const middleWaist = Math.min(...amplitudes.slice(7, 10))
  const tallComplexes = amplitudes.filter((amp) => amp > 0.6).length
  const delta = maxAdjacentDelta(data)
  const firstScreen = Array.from(data.slice(0, Math.floor(data.length * 0.22)))
  const firstScreenAmplitude = Math.max(...firstScreen) - Math.min(...firstScreen)
  const earlySmall = Math.max(...amplitudes.slice(0, 2))
  const earlyBig = Math.max(...amplitudes.slice(3, 6))
  const roundedTopSamples = Array.from(data).filter((v) => v > peakOf(data) * 0.85).length
  const roundedBottomSamples = Array.from(data).filter((v) => v < troughOf(data) * 0.85).length

  expect(def.cycleMs).toBe(TORSADES_TUNING.cycleMs)
  expect(def.cycleMs).toBeGreaterThanOrEqual(3600)
  expect(def.cycleMs).toBeLessThanOrEqual(4200)
  expect(beatRate).toBeGreaterThanOrEqual(200)
  expect(beatRate).toBeLessThanOrEqual(240)
  expect(TORSADES_TUNING.beatCount).toBeGreaterThanOrEqual(14)
  expect(TORSADES_TUNING.beatCount).toBeLessThanOrEqual(16)
  expect(tallComplexes).toBeGreaterThanOrEqual(4)
  expect(maxAmplitude).toBeGreaterThan(0.7)
  expect(maxAmplitude).toBeGreaterThan(1.15)
  expect(minAmplitude).toBeGreaterThan(0.25)
  expect(minAmplitude).toBeLessThan(maxAmplitude * 0.45)
  expect(middleWaist).toBeLessThan(maxAmplitude * 0.6)
  expect(maxAmplitude - minAmplitude).toBeGreaterThan(0.38)
  expect(earlyBig).toBeGreaterThan(earlySmall * 1.8)
  expect(firstScreenAmplitude).toBeGreaterThan(0.5)
  expect(roundedTopSamples).toBeGreaterThanOrEqual(8)
  expect(roundedBottomSamples).toBeGreaterThanOrEqual(8)
  expect(Math.max(...deltas)).toBeGreaterThan(Math.min(...deltas) * 1.7)
  expect(zeroCrossings(data)).toBeGreaterThanOrEqual(TORSADES_TUNING.beatCount + 8)
  expect(zeroCrossings(data)).toBeLessThanOrEqual(TORSADES_TUNING.beatCount * 3)
  expect(delta).toBeGreaterThan(0.025)
  expect(delta).toBeLessThan(0.16)
}

describe('ECG_RHYTHMS', () => {
  it.each(Object.entries(ECG_RHYTHMS))(
    '%s has normalized data and a valid cycleMs',
    (name, def) => {
      assertNormalized(def, name)
      if (def.cycleMs !== null) expect(def.cycleMs).toBeGreaterThan(0)
    },
  )

  it('NSR is HR-driven (cycleMs null)', () => {
    expect(ECG_RHYTHMS.nsr.cycleMs).toBeNull()
  })

  it('NSR pads trace has only a shallow negative notch', () => {
    const data = ECG_RHYTHMS.nsr.data
    expect(peakOf(data)).toBeGreaterThan(0.45)
    expect(troughOf(data)).toBeGreaterThan(-0.12)
  })

  it('CPR compression waveform is a smooth rounded 120/min compression trace', () => {
    const def = CPR_COMPRESSION_WAVEFORM
    const data = def.data

    assertNormalized(def, 'cpr compression')
    expect(def.cycleMs).toBe(CPR_COMPRESSION_TUNING.cycleMs)
    expect(def.cycleMs).toBe(500)
    expect(peakOf(data)).toBeGreaterThan(0.32)
    expect(troughOf(data)).toBeLessThan(-0.36)
    expect(zeroCrossings(data)).toBeGreaterThanOrEqual(2)
    expect(zeroCrossings(data)).toBeLessThanOrEqual(4)
    expect(maxAdjacentDelta(data)).toBeLessThan(0.025)
  })

  it('1st Degree has a prolonged PR interval before a narrow QRS', () => {
    const def = ECG_RHYTHMS['first-degree']
    assertNormalized(def, 'first-degree')
    expect(def.cycleMs).toBeNull()
    expect(waveformDistance(def.data, ECG_RHYTHMS.nsr.data)).toBeGreaterThan(8)
    expect(segmentPeak(def.data, 0.16, 0.22)).toBeGreaterThan(0.045)
    expect(segmentPeak(def.data, 0.34, 0.42)).toBeLessThan(0.08)
    expect(segmentPeak(def.data, 0.46, 0.50)).toBeGreaterThan(0.45)
    expect(segmentTrough(def.data, 0.50, 0.56)).toBeGreaterThan(-0.08)
    expect(segmentMean(def.data, 0.56, 0.70)).toBeGreaterThan(0.04)
  })

  it('1st Degree 12-lead morphology preserves the delayed QRS across leads', () => {
    const leadII = getLeadWaveform('first-degree', 'II').data
    const leadV1 = getLeadWaveform('first-degree', 'V1').data

    expect(segmentPeak(leadII, 0.16, 0.22)).toBeGreaterThan(0.045)
    expect(segmentPeak(leadII, 0.34, 0.42)).toBeLessThan(0.08)
    expect(segmentPeak(leadII, 0.46, 0.50)).toBeGreaterThan(0.45)
    expect(segmentPeak(leadV1, 0.34, 0.42)).toBeLessThan(0.06)
    expect(segmentTrough(leadV1, 0.50, 0.56)).toBeLessThan(-0.08)
  })

  it('2nd Degree Type 1 has progressive PR prolongation and a dropped QRS', () => {
    const def = ECG_RHYTHMS['second-degree-type-1']
    assertNormalized(def, 'second-degree-type-1')
    expect(def.cycleMs).toBe(SECOND_DEGREE_TYPE_1_TUNING.cycleMs)
    expect(segmentPeak(def.data, 0.04, 0.07)).toBeGreaterThan(0.040)
    expect(segmentPeak(def.data, 0.13, 0.17)).toBeGreaterThan(0.45)
    expect(segmentPeak(def.data, 0.29, 0.32)).toBeGreaterThan(0.040)
    expect(segmentPeak(def.data, 0.40, 0.45)).toBeGreaterThan(0.45)
    expect(segmentPeak(def.data, 0.52, 0.55)).toBeGreaterThan(0.040)
    expect(segmentPeak(def.data, 0.67, 0.72)).toBeGreaterThan(0.45)
    expect(segmentPeak(def.data, 0.78, 0.82)).toBeGreaterThan(0.040)
    expect(segmentPeak(def.data, 0.84, 0.94)).toBeLessThan(0.08)
    expect(segmentMean(def.data, 0.86, 0.98)).toBeLessThan(0.02)
  })

  it('2nd Degree Type 1 12-lead morphology preserves the Wenckebach pattern', () => {
    const leadII = getLeadWaveform('second-degree-type-1', 'II').data
    const leadV1 = getLeadWaveform('second-degree-type-1', 'V1').data

    expect(segmentPeak(leadII, 0.04, 0.07)).toBeGreaterThan(0.040)
    expect(segmentPeak(leadII, 0.13, 0.17)).toBeGreaterThan(0.45)
    expect(segmentPeak(leadII, 0.78, 0.82)).toBeGreaterThan(0.040)
    expect(segmentPeak(leadII, 0.84, 0.94)).toBeLessThan(0.08)
    expect(segmentPeak(leadV1, 0.78, 0.82)).toBeGreaterThan(0.012)
    expect(segmentTrough(leadV1, 0.16, 0.22)).toBeLessThan(-0.08)
  })

  it('2nd Degree Type 2 has fixed PR conducted beats and a dropped QRS', () => {
    const def = ECG_RHYTHMS['second-degree-type-2']
    assertNormalized(def, 'second-degree-type-2')
    expect(def.cycleMs).toBe(SECOND_DEGREE_TYPE_2_TUNING.cycleMs)
    expect(segmentPeak(def.data, 0.06, 0.09)).toBeGreaterThan(0.040)
    expect(segmentPeak(def.data, 0.12, 0.16)).toBeGreaterThan(0.45)
    expect(segmentPeak(def.data, 0.27, 0.30)).toBeGreaterThan(0.040)
    expect(segmentPeak(def.data, 0.33, 0.37)).toBeGreaterThan(0.45)
    expect(segmentPeak(def.data, 0.49, 0.52)).toBeGreaterThan(0.040)
    expect(segmentPeak(def.data, 0.55, 0.59)).toBeGreaterThan(0.45)
    expect(segmentPeak(def.data, 0.81, 0.84)).toBeGreaterThan(0.040)
    expect(segmentPeak(def.data, 0.86, 0.96)).toBeLessThan(0.08)
    expect(segmentMean(def.data, 0.86, 0.98)).toBeLessThan(0.02)
  })

  it('2nd Degree Type 2 12-lead morphology preserves fixed PR with dropped QRS', () => {
    const leadII = getLeadWaveform('second-degree-type-2', 'II').data
    const leadV1 = getLeadWaveform('second-degree-type-2', 'V1').data

    expect(segmentPeak(leadII, 0.06, 0.09)).toBeGreaterThan(0.040)
    expect(segmentPeak(leadII, 0.12, 0.16)).toBeGreaterThan(0.45)
    expect(segmentPeak(leadII, 0.81, 0.84)).toBeGreaterThan(0.040)
    expect(segmentPeak(leadII, 0.86, 0.96)).toBeLessThan(0.08)
    expect(segmentPeak(leadV1, 0.81, 0.84)).toBeGreaterThan(0.012)
    expect(segmentTrough(leadV1, 0.15, 0.22)).toBeLessThan(-0.08)
  })

  it('3rd Degree has AV dissociation with more P waves than QRS complexes', () => {
    const def = ECG_RHYTHMS['third-degree']
    assertNormalized(def, 'third-degree')
    expect(def.cycleMs).toBe(THIRD_DEGREE_TUNING.cycleMs)
    expect(segmentPeak(def.data, 0.075, 0.095)).toBeGreaterThan(0.030)
    expect(segmentPeak(def.data, 0.235, 0.255)).toBeGreaterThan(0.018)
    expect(segmentPeak(def.data, 0.395, 0.415)).toBeGreaterThan(0.030)
    expect(segmentPeak(def.data, 0.555, 0.575)).toBeGreaterThan(0.030)
    expect(segmentPeak(def.data, 0.715, 0.735)).toBeGreaterThan(-0.020)
    expect(segmentPeak(def.data, 0.875, 0.895)).toBeGreaterThan(0.030)
    expect(segmentPeak(def.data, 0.15, 0.19)).toBeGreaterThan(0.38)
    expect(segmentTrough(def.data, 0.20, 0.28)).toBeLessThan(-0.08)
    expect(segmentPeak(def.data, 0.63, 0.67)).toBeGreaterThan(0.38)
    expect(segmentTrough(def.data, 0.69, 0.77)).toBeLessThan(-0.07)
    expect(segmentPeak(def.data, 0.30, 0.58)).toBeLessThan(0.12)
  })

  it('3rd Degree 12-lead morphology preserves independent atrial and ventricular timing', () => {
    const leadII = getLeadWaveform('third-degree', 'II').data
    const leadV1 = getLeadWaveform('third-degree', 'V1').data

    expect(segmentPeak(leadII, 0.075, 0.095)).toBeGreaterThan(0.030)
    expect(segmentPeak(leadII, 0.235, 0.255)).toBeGreaterThan(0.018)
    expect(segmentPeak(leadII, 0.15, 0.19)).toBeGreaterThan(0.38)
    expect(segmentPeak(leadII, 0.63, 0.67)).toBeGreaterThan(0.38)
    expect(segmentPeak(leadV1, 0.075, 0.095)).toBeGreaterThan(0.010)
    expect(segmentTrough(leadV1, 0.18, 0.25)).toBeLessThan(-0.08)
  })

  it('Anterior MI exists as an HR-driven rhythm distinct from NSR', () => {
    const def = ECG_RHYTHMS['anterior-mi']
    assertNormalized(def, 'anterior-mi')
    expect(def.cycleMs).toBeNull()
    expect(waveformDistance(def.data, ECG_RHYTHMS.nsr.data)).toBeGreaterThan(20)
    expect(troughOf(def.data)).toBeLessThan(troughOf(ECG_RHYTHMS.nsr.data) - 0.25)
    expect(peakOf(def.data)).toBeLessThan(peakOf(ECG_RHYTHMS.nsr.data) * 0.5)
    expect(segmentPeak(def.data, 0.24, 0.32)).toBeGreaterThan(0.035)
    expect(segmentPeak(def.data, 0.17, 0.23)).toBeLessThan(0.01)
    expect(segmentPeak(def.data, 0.34, 0.38)).toBeGreaterThan(0.18)
    expect(segmentTrough(def.data, 0.38, 0.43)).toBeLessThan(-0.38)
    expect(segmentMean(def.data, 0.43, 0.62)).toBeGreaterThan(
      segmentMean(ECG_RHYTHMS.nsr.data, 0.43, 0.62) + 0.05,
    )
    expect(segmentMean(def.data, 0.54, 0.70)).toBeGreaterThan(0.17)
    expect(segmentMean(def.data, 0.70, 0.78)).toBeGreaterThan(0.03)
    expect(Math.abs(segmentMean(def.data, 0.76, 0.96))).toBeLessThan(0.01)
  })

  it('Anterior MI 12-lead morphology is strongest in anterior leads', () => {
    const v3 = getLeadWaveform('anterior-mi', 'V3').data
    const v4 = getLeadWaveform('anterior-mi', 'V4').data
    const iii = getLeadWaveform('anterior-mi', 'III').data
    const nsrV3 = getLeadWaveform('nsr', 'V3').data

    const anteriorElevation = (segmentMean(v3, 0.43, 0.66) + segmentMean(v4, 0.43, 0.66)) / 2
    const inferiorElevation = segmentMean(iii, 0.43, 0.66)

    expect(anteriorElevation).toBeGreaterThan(inferiorElevation + 0.25)
    expect(segmentMean(v3, 0.43, 0.66)).toBeGreaterThan(
      segmentMean(nsrV3, 0.43, 0.66) + 0.28,
    )
  })

  it('Inferior MI exists as an HR-driven rhythm distinct from NSR', () => {
    const def = ECG_RHYTHMS['inferior-mi']
    assertNormalized(def, 'inferior-mi')
    expect(def.cycleMs).toBeNull()
    expect(waveformDistance(def.data, ECG_RHYTHMS.nsr.data)).toBeGreaterThan(25)
    expect(peakOf(def.data)).toBeGreaterThan(peakOf(ECG_RHYTHMS.nsr.data) + 0.12)
    const qrsPeak = segmentPeak(def.data, 0.34, 0.39)
    const tPeak = segmentPeak(def.data, 0.56, 0.68)
    expect(segmentPeak(def.data, 0.24, 0.32)).toBeGreaterThan(0.055)
    expect(segmentPeak(def.data, 0.17, 0.23)).toBeLessThan(0.01)
    expect(qrsPeak).toBeGreaterThan(0.70)
    expect(segmentTrough(def.data, 0.39, 0.43)).toBeGreaterThan(0.12)
    expect(segmentMean(def.data, 0.39, 0.43)).toBeGreaterThan(0.15)
    expect(segmentMean(def.data, 0.43, 0.49)).toBeGreaterThan(0.13)
    expect(segmentMean(def.data, 0.43, 0.49)).toBeLessThan(segmentMean(def.data, 0.56, 0.64))
    expect(segmentMean(def.data, 0.43, 0.52)).toBeGreaterThan(0.13)
    expect(segmentMean(def.data, 0.43, 0.53)).toBeLessThan(segmentMean(def.data, 0.56, 0.64))
    expect(segmentMean(def.data, 0.50, 0.56)).toBeLessThan(segmentMean(def.data, 0.58, 0.64))
    expect(segmentMean(def.data, 0.62, 0.68)).toBeGreaterThan(tPeak * 0.88)
    expect(tPeak).toBeGreaterThan(qrsPeak * 0.43)
    expect(tPeak).toBeLessThanOrEqual(qrsPeak * 0.52)
    expect(segmentMean(def.data, 0.56, 0.68)).toBeGreaterThan(
      segmentMean(ECG_RHYTHMS.nsr.data, 0.56, 0.68) + 0.13,
    )
    expect(segmentMean(def.data, 0.43, 0.62)).toBeGreaterThan(
      segmentMean(ECG_RHYTHMS.nsr.data, 0.43, 0.62) + 0.10,
    )
    expect(Math.abs(segmentMean(def.data, 0.76, 0.96))).toBeLessThan(0.01)
  })

  it('Inferior MI 12-lead morphology is strongest in inferior leads', () => {
    const ii = getLeadWaveform('inferior-mi', 'II').data
    const iii = getLeadWaveform('inferior-mi', 'III').data
    const avf = getLeadWaveform('inferior-mi', 'aVF').data
    const v3 = getLeadWaveform('inferior-mi', 'V3').data
    const nsrII = getLeadWaveform('nsr', 'II').data

    const inferiorElevation =
      (
        segmentMean(ii, 0.43, 0.66) +
        segmentMean(iii, 0.43, 0.66) +
        segmentMean(avf, 0.43, 0.66)
      ) / 3
    const anteriorElevation = segmentMean(v3, 0.43, 0.66)

    expect(inferiorElevation).toBeGreaterThan(anteriorElevation + 0.25)
    expect(segmentMean(ii, 0.43, 0.66)).toBeGreaterThan(
      segmentMean(nsrII, 0.43, 0.66) + 0.25,
    )
  })

  it('asystole is a near-flat pads baseline with tiny slopes and waves', () => {
    const def = ECG_RHYTHMS.asystole
    const data = def.data
    const peak = peakOf(data)
    const trough = troughOf(data)

    expect(def.cycleMs).toBe(ASYSTOLE_TUNING.cycleMs)
    expect(peak).toBeGreaterThan(0.003)
    expect(peak).toBeLessThan(0.014)
    expect(trough).toBeLessThan(-0.003)
    expect(trough).toBeGreaterThan(-0.014)
    expect(peak - trough).toBeGreaterThan(0.009)
    expect(peak - trough).toBeLessThan(0.027)
    expect(maxAdjacentDelta(data)).toBeLessThan(0.0015)
    expect(zeroCrossings(data)).toBeLessThanOrEqual(8)
  })

  it('VT uses a tall monomorphic tachycardia complex like the screenshot reference', () => {
    const data = ECG_RHYTHMS.vt.data
    const peak = peakOf(data)
    const trough = troughOf(data)

    expect(ECG_RHYTHMS.vt.cycleMs).toBe(VT_TUNING.cycleMs)
    expect(ECG_RHYTHMS.vt.cycleMs).toBeGreaterThanOrEqual(320)
    expect(ECG_RHYTHMS.vt.cycleMs).toBeLessThanOrEqual(380)
    expect(peak).toBeGreaterThan(0.62)
    expect(peak).toBeLessThan(0.74)
    expect(trough).toBeLessThan(-0.36)
    expect(trough).toBeGreaterThan(-0.48)
    expect(peak - trough).toBeGreaterThan(1.0)
    expect(peak - trough).toBeLessThan(1.2)
    expect(segmentPeak(data, 0.12, 0.22)).toBeGreaterThan(0.62)
    expect(segmentMean(data, 0.24, 0.34)).toBeGreaterThan(0.05)
    expect(segmentTrough(data, 0.36, 0.48)).toBeLessThan(-0.36)
    expect(segmentMean(data, 0.55, 0.74)).toBeLessThan(-0.05)
    expect(segmentMean(data, 0.78, 0.98)).toBeGreaterThan(0)
  })

  it('VT has visible contour without artifact-sized jumps', () => {
    const data = ECG_RHYTHMS.vt.data
    const delta = maxAdjacentDelta(data)
    expect(delta).toBeGreaterThan(0.002)
    expect(delta).toBeLessThan(0.045)
    let largeDeltas = 0
    for (let i = 1; i < data.length; i++) {
      if (Math.abs(data[i] - data[i - 1]) > 0.035) largeDeltas++
    }
    expect(largeDeltas).toBeLessThan(10)
  })

  it('VT is monomorphic — every beat is identical', () => {
    const a = getEcgRhythm('vt').data
    const b = getEcgRhythm('vt').data
    expect(a).toBe(b)
    let diff = 0
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i])
    expect(diff).toBe(0)
  })

  it('VT has a steep upstroke, sloped descent, and rounded negative trough', () => {
    const data = ECG_RHYTHMS.vt.data
    const peak = peakOf(data)
    const trough = troughOf(data)
    expect(segmentMean(data, 0.06, 0.13)).toBeLessThan(segmentMean(data, 0.13, 0.20))
    expect(segmentMean(data, 0.22, 0.32)).toBeGreaterThan(segmentMean(data, 0.32, 0.42))
    expect(segmentMean(data, 0.40, 0.48)).toBeLessThan(trough * 0.72)
    expect(segmentMean(data, 0.46, 0.54)).toBeLessThan(trough * 0.58)
    expect(segmentMean(data, 0.52, 0.66)).toBeGreaterThan(segmentMean(data, 0.40, 0.48))
    expect(directionChanges(data, Math.floor(data.length * 0.78))).toBeLessThanOrEqual(3)
  })

  it('getEcgRhythm returns stable references for non-polymorphic rhythms', () => {
    expect(getEcgRhythm('nsr')).toBe(ECG_RHYTHMS.nsr)
    expect(getEcgRhythm('asystole')).toBe(ECG_RHYTHMS.asystole)
    expect(getEcgRhythm('vt')).toBe(ECG_RHYTHMS.vt)
  })

  it('VF uses a dedicated irregular fibrillation pattern', () => {
    const def = ECG_RHYTHMS.vf
    const data = def.data
    const amplitudes = segmentAmplitudes(data, 12)
    const maxAmplitude = Math.max(...amplitudes)
    const minAmplitude = Math.min(...amplitudes)

    assertNormalized(def, 'vf')
    expect(def.cycleMs).toBe(VF_TUNING.cycleMs)
    expect(zeroCrossings(data)).toBeGreaterThanOrEqual(24)
    expect(maxAmplitude).toBeGreaterThan(0.25)
    expect(maxAmplitude).toBeLessThan(0.85)
    expect(minAmplitude).toBeGreaterThan(0.08)
    expect(maxAmplitude - minAmplitude).toBeGreaterThan(0.08)
    expect(Math.abs(segmentMean(data, 0, 1))).toBeLessThan(0.01)
    expect(maxAdjacentDelta(data)).toBeGreaterThan(0.005)
    expect(maxAdjacentDelta(data)).toBeLessThan(0.105)
  })

  it('torsades is a multi-second twisting polymorphic VT template', () => {
    expectTorsadesStylePattern(ECG_RHYTHMS.torsades)
  })

  it('getEcgRhythm generates new VF fibrillation variants across template cycles', () => {
    const variants = Array.from({ length: 5 }, () => getEcgRhythm('vf'))
    const distances = variants.slice(1).map((variant, index) =>
      waveformDistance(variant.data, variants[index].data),
    )

    for (const variant of variants) {
      assertNormalized(variant, 'vf variant')
      expect(variant.cycleMs).toBe(VF_TUNING.cycleMs)
      expect(zeroCrossings(variant.data)).toBeGreaterThanOrEqual(24)
      expect(maxAdjacentDelta(variant.data)).toBeLessThan(0.105)
    }
    expect(Math.min(...distances)).toBeGreaterThan(8)
    expect(Math.max(...distances)).toBeGreaterThan(14)
  })

  it('getEcgRhythm generates new torsades pattern variants across template cycles', () => {
    const variants = Array.from({ length: TORSADES_TUNING.patternCount + 1 }, () =>
      getEcgRhythm('torsades'),
    )
    const distances = variants.slice(1).map((variant, index) =>
      waveformDistance(variant.data, variants[index].data),
    )

    for (const variant of variants) {
      assertNormalized(variant, 'torsades variant')
      expect(variant.cycleMs).toBe(TORSADES_TUNING.cycleMs)
      expect(zeroCrossings(variant.data)).toBeGreaterThanOrEqual(
        TORSADES_TUNING.beatCount + 8,
      )
      expect(maxAdjacentDelta(variant.data)).toBeLessThan(0.16)
    }
    expect(Math.min(...distances)).toBeGreaterThan(35)
    expect(Math.max(...distances)).toBeGreaterThan(60)
  })
})

describe('sweep speeds', () => {
  it('exposes ECG / SpO2 / EtCO2 sweep durations', () => {
    expect(ECG_SWEEP_MS).toBeGreaterThan(1000)
    expect(SPO2_SWEEP_MS).toBeGreaterThan(1000)
    expect(ETCO2_SWEEP_MS).toBeGreaterThan(ECG_SWEEP_MS)
  })
})

describe('getEtco2Waveform — plateau tracks mmHg', () => {
  it('uses the Zoll reference 0-150 mmHg capnography scale', () => {
    expect(ETCO2_SCALE_MAX).toBe(150)
  })

  it('plateau height scales with the EtCO2 value', () => {
    const lo = getEtco2Waveform('normal', 15)
    const mid = getEtco2Waveform('normal', 35)
    const hi = getEtco2Waveform('normal', 75)
    expect(peakOf(lo.data)).toBeLessThan(peakOf(mid.data))
    expect(peakOf(mid.data)).toBeLessThan(peakOf(hi.data))
  })

  it('plateau at 35 mmHg lands at approx the right v-value', () => {
    const def = getEtco2Waveform('normal', 35)
    const expectedV = -1 + (2 * 35) / ETCO2_SCALE_MAX
    expect(peakOf(def.data)).toBeGreaterThan(expectedV - 0.1)
    expect(peakOf(def.data)).toBeLessThan(expectedV + 0.1)
  })

  it('75 mmHg lands near mid-height on the 0-150 scale', () => {
    const def = getEtco2Waveform('normal', 75)
    expect(peakOf(def.data)).toBeGreaterThan(-0.08)
    expect(peakOf(def.data)).toBeLessThan(0.08)
  })

  it('0 mmHg is effectively flat at baseline', () => {
    const def = getEtco2Waveform('normal', 0)
    expect(peakOf(def.data)).toBeLessThanOrEqual(-0.85)
  })

  it('150 mmHg saturates near the top of the canvas', () => {
    const def = getEtco2Waveform('normal', 150)
    expect(peakOf(def.data)).toBeGreaterThan(0.9)
  })

  it('values above 150 are clamped', () => {
    const peak180 = peakOf(getEtco2Waveform('normal', 180).data)
    const peak150 = peakOf(getEtco2Waveform('normal', 150).data)
    expect(peak180).toBeCloseTo(peak150, 5)
  })

  it("'off' is a flat line regardless of value", () => {
    const def = getEtco2Waveform('off', 35)
    expect(peakOf(def.data)).toBe(0)
  })

  it('respiratory cycle longer for hypoventilation than normal', () => {
    const normalCycle = getEtco2Waveform('normal', 35).cycleMs!
    const hypoCycle = getEtco2Waveform('hypoventilation', 35).cycleMs!
    expect(hypoCycle).toBeGreaterThan(normalCycle)
    expect(normalCycle).toBe(RESP_CYCLE_MS)
  })
})

describe('getSpo2Waveform — amplitude scales with SpO2', () => {
  it('high SpO2 produces taller pleth than low SpO2', () => {
    const high = peakOf(getSpo2Waveform('normal', 99).data)
    const low = peakOf(getSpo2Waveform('normal', 70).data)
    expect(high).toBeGreaterThan(low)
  })

  it('SpO2 floor (≤69) is at the 0.25 amplitude factor', () => {
    const floor = peakOf(getSpo2Waveform('normal', 60).data)
    const full = peakOf(getSpo2Waveform('normal', 99).data)
    expect(floor / full).toBeLessThan(0.3)
  })

  it('"weak" shape compounds with the amplitude factor', () => {
    const weakHi = peakOf(getSpo2Waveform('weak', 99).data)
    const normalHi = peakOf(getSpo2Waveform('normal', 99).data)
    expect(weakHi).toBeLessThan(normalHi)
  })

  it("'off' is a flat line regardless of value", () => {
    const def = getSpo2Waveform('off', 95)
    expect(peakOf(def.data)).toBe(0)
  })
})

describe('spo2AmplitudeFactor', () => {
  it('caps at 1.0 for SpO2 ≥ 95', () => {
    expect(spo2AmplitudeFactor(99)).toBe(1)
    expect(spo2AmplitudeFactor(100)).toBe(1)
  })
  it('floors at 0.25 for SpO2 < 70', () => {
    expect(spo2AmplitudeFactor(50)).toBe(0.25)
    expect(spo2AmplitudeFactor(0)).toBe(0.25)
  })
  it('is monotonically increasing in the middle', () => {
    expect(spo2AmplitudeFactor(75)).toBeLessThan(spo2AmplitudeFactor(90))
  })
})
