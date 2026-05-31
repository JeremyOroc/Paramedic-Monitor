// Pure defibrillator state machine: the transition table, guards, and energy
// math. No React, timers, or audio — those stay in `useDefibSequence`, which
// drives this module. Kept side-effect-free so transitions are unit-testable.

import { JOULE_DEFAULTS, type PatientMode, type Rhythm } from '@/types/vitals'

export type DefibState =
  | 'idle'
  | 'analyzing_ecg'
  | 'analyzing_clear'
  | 'analyzing_result'
  | 'shock_advised'
  | 'cpr'
  | 'charge_prompt'
  | 'charging'
  | 'charged'
  | 'delivered'

export const SHOCKABLE_RHYTHMS: ReadonlySet<Rhythm> = new Set(['vf', 'vt', 'torsades'])

export const ANALYZE_ECG_MS = 2500
export const ANALYZE_CLEAR_MS = 2500
export const ANALYZE_RESULT_MS = 4000
export const CHARGE_DURATION_MS = 4000
export const ENERGY_STEP = 10

export function isShockable(rhythm: Rhythm): boolean {
  return SHOCKABLE_RHYTHMS.has(rhythm)
}

// --- Guards (which controls are enabled in a given state) --------------------

export function canAnalyse(state: DefibState): boolean {
  return (
    state === 'idle' ||
    state === 'cpr' ||
    state === 'charge_prompt' ||
    state === 'delivered'
  )
}

export function canCharge(state: DefibState): boolean {
  return (
    state === 'idle' ||
    state === 'cpr' ||
    state === 'charge_prompt' ||
    state === 'delivered'
  )
}

export function canShock(state: DefibState): boolean {
  return state === 'charged' || state === 'shock_advised'
}

export function canAdjustEnergy(state: DefibState): boolean {
  return (
    !state.startsWith('analyzing') &&
    state !== 'charging' &&
    state !== 'shock_advised'
  )
}

// --- Energy math -------------------------------------------------------------

export type EnergyState = { patientMode: PatientMode; energy: number }

export function defaultEnergy(patientMode: PatientMode): number {
  return JOULE_DEFAULTS[patientMode]
}

/** Current energy, falling back to the patient-mode default after a mode change. */
export function resolveEnergy(state: EnergyState, patientMode: PatientMode): number {
  return state.patientMode === patientMode ? state.energy : JOULE_DEFAULTS[patientMode]
}

export function energyUp(state: EnergyState, patientMode: PatientMode): EnergyState {
  return { patientMode, energy: resolveEnergy(state, patientMode) + ENERGY_STEP }
}

export function energyDown(state: EnergyState, patientMode: PatientMode): EnergyState {
  return {
    patientMode,
    energy: Math.max(ENERGY_STEP, resolveEnergy(state, patientMode) - ENERGY_STEP),
  }
}

// --- Button transitions ------------------------------------------------------

/** CHARGE press: 'charging' starts the timed charge, 'charge_prompt' arms it, null ignores. */
export function chargeTransition(state: DefibState): 'charging' | 'charge_prompt' | null {
  if (state === 'charge_prompt') return 'charging'
  if (
    state === 'cpr' ||
    state === 'idle' ||
    state === 'analyzing_result' ||
    state === 'delivered'
  ) {
    return 'charge_prompt'
  }
  return null
}

/** SHOCK press: 'advised' delivers from AED advice, 'charged' delivers a manual charge, null ignores. */
export function shockTransition(state: DefibState): 'advised' | 'charged' | null {
  if (state === 'shock_advised') return 'advised'
  if (state === 'charged') return 'charged'
  return null
}
