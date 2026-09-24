import { describe, expect, it } from 'vitest'

import type { DefibState } from '@/lib/defib/defibMachine'
import { isWagamiAPatientModeLocked, nextWagamiAPatientMode } from '../wagamiAPatientMode'

describe('Wagami A Device Patient mode', () => {
  it('cycles Adult → Pediatric → Neonate → Adult', () => {
    expect(nextWagamiAPatientMode('adult')).toBe('pediatric')
    expect(nextWagamiAPatientMode('pediatric')).toBe('neonate')
    expect(nextWagamiAPatientMode('neonate')).toBe('adult')
  })

  it('locks every active Analyze, Charge and shock-ready state', () => {
    const locked: DefibState[] = [
      'analyzing_ecg', 'analyzing_clear', 'analyzing_result', 'analyzing_halted',
      'shock_advised', 'charge_prompt', 'charging', 'charged',
    ]
    for (const state of locked) expect(isWagamiAPatientModeLocked(state)).toBe(true)
    for (const state of ['idle', 'cpr', 'delivered'] as DefibState[]) {
      expect(isWagamiAPatientModeLocked(state)).toBe(false)
    }
  })
})
