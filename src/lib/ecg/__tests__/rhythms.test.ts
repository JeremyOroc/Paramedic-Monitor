import { describe, expect, it } from 'vitest'
import {
  ECG_RHYTHMS,
  ECG_SWEEP_MS,
  ETCO2_SCALE_MAX,
  ETCO2_SWEEP_MS,
  RESP_CYCLE_MS,
  SPO2_SWEEP_MS,
  VT_TUNING,
  getEcgRhythm,
  getEtco2Waveform,
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

  it('asystole is effectively flat', () => {
    const sum = ECG_RHYTHMS.asystole.data.reduce((a, b) => a + Math.abs(b), 0)
    expect(sum).toBe(0)
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

  it('getEcgRhythm returns stable references for all rhythms', () => {
    expect(getEcgRhythm('nsr')).toBe(ECG_RHYTHMS.nsr)
    expect(getEcgRhythm('asystole')).toBe(ECG_RHYTHMS.asystole)
    expect(getEcgRhythm('vf')).toBe(ECG_RHYTHMS.vf)
    expect(getEcgRhythm('vt')).toBe(ECG_RHYTHMS.vt)
  })

  it('VF is coarse fibrillation, not artifact noise', () => {
    const data = ECG_RHYTHMS.vf.data
    expect(ECG_RHYTHMS.vf.cycleMs).toBeLessThanOrEqual(360)
    expect(peakOf(data)).toBeGreaterThan(0.65)
    expect(troughOf(data)).toBeLessThan(-0.65)
    expect(zeroCrossings(data)).toBeLessThanOrEqual(6)
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
