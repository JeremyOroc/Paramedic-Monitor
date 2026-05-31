import { describe, it, expect } from 'vitest'
import {
  ENERGY_STEP,
  type DefibState,
  type EnergyState,
  canAdjustEnergy,
  canAnalyse,
  canCharge,
  canShock,
  chargeTransition,
  defaultEnergy,
  energyDown,
  energyUp,
  isShockable,
  resolveEnergy,
  shockTransition,
} from '../defibMachine'

const ALL_STATES: DefibState[] = [
  'idle',
  'analyzing_ecg',
  'analyzing_clear',
  'analyzing_result',
  'shock_advised',
  'cpr',
  'charge_prompt',
  'charging',
  'charged',
  'delivered',
]

describe('guards', () => {
  it('canAnalyse / canCharge are true only in idle, cpr, charge_prompt, delivered', () => {
    const enabled = new Set<DefibState>(['idle', 'cpr', 'charge_prompt', 'delivered'])
    for (const s of ALL_STATES) {
      expect(canAnalyse(s)).toBe(enabled.has(s))
      expect(canCharge(s)).toBe(enabled.has(s))
    }
  })

  it('canShock is true only in charged and shock_advised', () => {
    for (const s of ALL_STATES) {
      expect(canShock(s)).toBe(s === 'charged' || s === 'shock_advised')
    }
  })

  it('canAdjustEnergy is false while analyzing, charging, or shock_advised', () => {
    for (const s of ALL_STATES) {
      const blocked = s.startsWith('analyzing') || s === 'charging' || s === 'shock_advised'
      expect(canAdjustEnergy(s)).toBe(!blocked)
    }
  })
})

describe('isShockable', () => {
  it('treats vf / vt / torsades as shockable and others not', () => {
    expect(isShockable('vf')).toBe(true)
    expect(isShockable('vt')).toBe(true)
    expect(isShockable('torsades')).toBe(true)
    expect(isShockable('nsr')).toBe(false)
    expect(isShockable('asystole')).toBe(false)
  })
})

describe('energy math', () => {
  it('uses patient-mode joule defaults', () => {
    expect(defaultEnergy('adult')).toBe(120)
    expect(defaultEnergy('pediatric')).toBe(50)
    expect(defaultEnergy('neonate')).toBe(10)
  })

  it('resolves to the default after a patient-mode change', () => {
    const s = { patientMode: 'adult' as const, energy: 200 }
    expect(resolveEnergy(s, 'adult')).toBe(200)
    expect(resolveEnergy(s, 'pediatric')).toBe(50)
  })

  it('steps up/down by ENERGY_STEP and clamps at the minimum', () => {
    let s: EnergyState = { patientMode: 'pediatric', energy: 50 }
    s = energyUp(s, 'pediatric')
    expect(s.energy).toBe(60)
    s = energyDown(s, 'pediatric')
    s = energyDown(s, 'pediatric')
    expect(s.energy).toBe(40)
    for (let i = 0; i < 10; i++) s = energyDown(s, 'pediatric')
    expect(s.energy).toBe(ENERGY_STEP)
  })

  it('re-bases on the new mode default before stepping', () => {
    const s = { patientMode: 'adult' as const, energy: 200 }
    expect(energyUp(s, 'neonate')).toEqual({ patientMode: 'neonate', energy: 20 })
  })
})

describe('chargeTransition', () => {
  it('arms from idle/cpr/analyzing_result/delivered and starts charging from charge_prompt', () => {
    expect(chargeTransition('charge_prompt')).toBe('charging')
    for (const s of ['idle', 'cpr', 'analyzing_result', 'delivered'] as DefibState[]) {
      expect(chargeTransition(s)).toBe('charge_prompt')
    }
    for (const s of ['analyzing_ecg', 'charging', 'charged', 'shock_advised'] as DefibState[]) {
      expect(chargeTransition(s)).toBeNull()
    }
  })
})

describe('shockTransition', () => {
  it('delivers from shock_advised and charged, ignores everything else', () => {
    expect(shockTransition('shock_advised')).toBe('advised')
    expect(shockTransition('charged')).toBe('charged')
    for (const s of ALL_STATES.filter((s) => s !== 'shock_advised' && s !== 'charged')) {
      expect(shockTransition(s)).toBeNull()
    }
  })
})
