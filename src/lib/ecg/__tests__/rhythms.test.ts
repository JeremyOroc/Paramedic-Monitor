import { describe, expect, it } from 'vitest'
import {
  ECG_RHYTHMS,
  ECG_SWEEP_MS,
  ETCO2_SCALE_MAX,
  ETCO2_SWEEP_MS,
  RESP_CYCLE_MS,
  SPO2_SWEEP_MS,
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

  it('VT is wide-complex and negative-dominant like the reference', () => {
    const data = ECG_RHYTHMS.vt.data
    const peak = peakOf(data)
    const trough = troughOf(data)
    expect(ECG_RHYTHMS.vt.cycleMs).toBeGreaterThanOrEqual(420)
    expect(ECG_RHYTHMS.vt.cycleMs).toBeLessThanOrEqual(480)
    expect(trough).toBeLessThan(-0.65)
    expect(peak).toBeGreaterThan(0.25)
    expect(peak).toBeLessThan(0.65)
    expect(Math.abs(trough)).toBeGreaterThan(peak * 1.4)
  })

  it('VT carries baked-in noise so the trace does not look synthetic', () => {
    const delta = maxAdjacentDelta(ECG_RHYTHMS.vt.data)
    expect(delta).toBeGreaterThan(0.02)
    expect(delta).toBeLessThan(0.2)
  })

  it('getEcgRhythm("vt") varies beat-to-beat', () => {
    const a = getEcgRhythm('vt').data
    const b = getEcgRhythm('vt').data
    let diff = 0
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i])
    expect(diff).toBeGreaterThan(0.5)
  })

  it('getEcgRhythm returns stable references for non-VT rhythms', () => {
    expect(getEcgRhythm('nsr')).toBe(ECG_RHYTHMS.nsr)
    expect(getEcgRhythm('asystole')).toBe(ECG_RHYTHMS.asystole)
    expect(getEcgRhythm('vf')).toBe(ECG_RHYTHMS.vf)
    expect(getEcgRhythm('pea')).toBe(ECG_RHYTHMS.pea)
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
