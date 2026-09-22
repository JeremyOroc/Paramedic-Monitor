import type { DefibState } from '@/hooks/useDefibSequence'

export function isWagamiACallInfoBlocked(state: DefibState): boolean {
  return state === 'analyzing_ecg'
    || state === 'analyzing_clear'
    || state === 'analyzing_result'
    || state === 'shock_advised'
    || state === 'charging'
    || state === 'charged'
}
