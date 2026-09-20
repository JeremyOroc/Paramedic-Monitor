import { describe, expect, it } from 'vitest'

import { DEFAULT_VITALS, type VitalActiveState } from '@/types/vitals'
import type { Vitals } from '@/store/monitorStore'
import { resolveWagamiAPreviewState } from '../wagamiAPreviewState'

const blank: Vitals = {
  hr: 0, bp_sys: 0, bp_dia: 0, etco2: 0, spo2: 0,
  rhythm: 'off', spo2_waveform: 'off', etco2_waveform: 'off',
}
const inactive: VitalActiveState = {
  hr: false, bp_sys: false, bp_dia: false, etco2: false, spo2: false,
}

describe('Wagami A Room-free preview state', () => {
  it('uses existing normal vitals only when no confirmed channel is active', () => {
    const result = resolveWagamiAPreviewState(blank, inactive)

    expect(result.simulated).toBe(true)
    expect(result.vitals.hr).toBe(DEFAULT_VITALS.hr)
    expect(result.vitals.spo2).toBe(DEFAULT_VITALS.spo2)
    expect(result.active.etco2).toBe(true)
    expect(result.alarms).toEqual([])
  })

  it('displays confirmed patient data and real alarm conditions once active', () => {
    const confirmed = { ...blank, hr: 155, spo2: 86, rhythm: 'nsr' as const }
    const active = { ...inactive, hr: true, spo2: true }
    const result = resolveWagamiAPreviewState(confirmed, active)

    expect(result.simulated).toBe(false)
    expect(result.vitals).toEqual(confirmed)
    expect(result.active).toEqual(active)
    expect(result.alarms).toEqual(['hr', 'spo2'])
  })
})
