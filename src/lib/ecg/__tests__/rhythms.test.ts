import { describe, expect, it } from 'vitest'
import {
  ASYSTOLE_TUNING,
  ECG_RHYTHMS,
  ECG_SWEEP_MS,
  ETCO2_SCALE_MAX,
  ETCO2_SWEEP_MS,
  RESP_CYCLE_MS,
  SPO2_SWEEP_MS,
  TORSADES_TUNING,
  VT_TUNING,
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

  it('Anterior MI exists as an HR-driven rhythm distinct from NSR', () => {
    const def = ECG_RHYTHMS['anterior-mi']
    assertNormalized(def, 'anterior-mi')
    expect(def.cycleMs).toBeNull()
    expect(waveformDistance(def.data, ECG_RHYTHMS.nsr.data)).toBeGreaterThan(20)
    expect(troughOf(def.data)).toBeLessThan(troughOf(ECG_RHYTHMS.nsr.data) - 0.25)
    expect(peakOf(def.data)).toBeLessThan(peakOf(ECG_RHYTHMS.nsr.data) * 0.5)
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
    expect(segmentPeak(def.data, 0.34, 0.39)).toBeGreaterThan(0.70)
    expect(segmentTrough(def.data, 0.39, 0.43)).toBeGreaterThan(-0.12)
    expect(segmentMean(def.data, 0.56, 0.68)).toBeGreaterThan(
      segmentMean(ECG_RHYTHMS.nsr.data, 0.56, 0.68) + 0.25,
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

  it('VT uses a plateau-and-V-trough shape like the screenshot reference', () => {
    const data = ECG_RHYTHMS.vt.data
    const peak = peakOf(data)
    const trough = troughOf(data)
    let plateauSamples = 0
    let troughSamples = 0
    for (let i = 0; i < data.length; i++) {
      if (data[i] > peak * 0.58) plateauSamples++
      if (data[i] < trough * 0.82) troughSamples++
    }

    expect(ECG_RHYTHMS.vt.cycleMs).toBe(VT_TUNING.cycleMs)
    expect(ECG_RHYTHMS.vt.cycleMs).toBeGreaterThanOrEqual(320)
    expect(ECG_RHYTHMS.vt.cycleMs).toBeLessThanOrEqual(380)
    expect(peak).toBeGreaterThan(0.12)
    expect(peak).toBeLessThan(0.34)
    expect(trough).toBeLessThan(-0.22)
    expect(trough).toBeGreaterThan(-0.52)
    expect(Math.abs(trough)).toBeGreaterThan(peak * 1.2)
    expect(peak - trough).toBeGreaterThan(0.42)
    expect(peak - trough).toBeLessThan(0.8)
    expect(plateauSamples / data.length).toBeGreaterThan(0.25)
    expect(troughSamples / data.length).toBeLessThan(0.16)
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

  it('VT has a rounded downward-sloping plateau and a deep sharp downward V', () => {
    const data = ECG_RHYTHMS.vt.data
    const peak = peakOf(data)
    const trough = troughOf(data)
    const troughIndex = indexOfTrough(data)
    let plateauEnd = 0
    while (plateauEnd < troughIndex && data[plateauEnd] > peak * 0.55) {
      plateauEnd++
    }
    const plateau: number[] = Array.from(data.slice(0, plateauEnd))
    const plateauSpread = Math.max(...plateau) - Math.min(...plateau)
    const plateauPeakIndex = indexOfPeakBefore(data, plateauEnd)
    expect(Math.abs(trough)).toBeGreaterThan(peak * 1.2)
    expect(plateauSpread).toBeLessThan(0.18)
    expect(plateauEnd).toBeGreaterThan(40)
    expect(plateauPeakIndex / plateauEnd).toBeLessThan(0.35)
    expect(data[plateauEnd - 1]).toBeLessThan(data[0] - 0.015)
    expect(data[plateauEnd - 1]).toBeLessThan(data[plateauPeakIndex] - 0.015)
    expect(directionChanges(data, plateauEnd)).toBeLessThanOrEqual(2)
  })

  it('getEcgRhythm returns stable references for non-polymorphic rhythms', () => {
    expect(getEcgRhythm('nsr')).toBe(ECG_RHYTHMS.nsr)
    expect(getEcgRhythm('asystole')).toBe(ECG_RHYTHMS.asystole)
    expect(getEcgRhythm('vt')).toBe(ECG_RHYTHMS.vt)
  })

  it('VF uses the torsades-style polymorphic pattern', () => {
    expectTorsadesStylePattern(ECG_RHYTHMS.vf)
  })

  it('torsades is a multi-second twisting polymorphic VT template', () => {
    expectTorsadesStylePattern(ECG_RHYTHMS.torsades)
  })

  it.each(['vf', 'torsades'] as const)(
    'getEcgRhythm generates new %s pattern variants across template cycles',
    (rhythm) => {
      const variants = Array.from({ length: TORSADES_TUNING.patternCount + 1 }, () =>
        getEcgRhythm(rhythm),
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
    },
  )
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
