import { describe, expect, it } from 'vitest'

import type { DefibState } from '@/hooks/useDefibSequence'
import { isWagamiACallInfoBlocked } from '@/lib/wagamiACallInfo'

describe('Wagami A Call Info entry guard', () => {
  it.each<DefibState>([
    'analyzing_ecg', 'analyzing_clear', 'analyzing_result',
    'shock_advised', 'charging', 'charged',
  ])('blocks %s before hiding the shell', (state) => {
    expect(isWagamiACallInfoBlocked(state)).toBe(true)
  })

  it.each<DefibState>(['idle', 'cpr', 'charge_prompt', 'delivered'])(
    'allows %s',
    (state) => expect(isWagamiACallInfoBlocked(state)).toBe(false),
  )
})
