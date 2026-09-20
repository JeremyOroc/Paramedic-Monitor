import type { DefibState } from '@/lib/defib/defibMachine'
import type { PatientMode } from '@/types/vitals'

const MODE_ORDER: readonly PatientMode[] = ['adult', 'pediatric', 'neonate']

export function nextWagamiAPatientMode(mode: PatientMode): PatientMode {
  const index = MODE_ORDER.indexOf(mode)
  return MODE_ORDER[(index + 1) % MODE_ORDER.length]
}

export function isWagamiAPatientModeLocked(state: DefibState): boolean {
  return state.startsWith('analyzing') ||
    state === 'shock_advised' ||
    state === 'charge_prompt' ||
    state === 'charging' ||
    state === 'charged'
}
