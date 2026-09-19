import { describe, expect, it } from 'vitest'

import {
  buildVitalTrendParticipants,
  createEmptyVitalTrendConfiguration,
  deriveVitalTrendValues,
  normalizeVitalTrendConfiguration,
  vitalTrendSecondsLeft,
} from '@/lib/vitalTrend'
import type { ActiveVitalTrend, VitalTrendTargets } from '@/types/vitalTrend'

const targets = (overrides: Partial<VitalTrendTargets> = {}): VitalTrendTargets => ({
  hr: null,
  spo2: null,
  bp_sys: null,
  bp_dia: null,
  etco2: null,
  ...overrides,
})

function running(
  participants: ActiveVitalTrend['participants'],
  durationSeconds = 30,
): ActiveVitalTrend {
  return {
    id: 'trend-1',
    participants,
    startsAt: 1_000,
    endsAt: 1_000 + durationSeconds * 1_000,
    status: 'running',
    completedAt: null,
    completionPublished: false,
  }
}

describe('vital trend', () => {
  it('builds only populated, changed, non-excluded participants', () => {
    const participants = buildVitalTrendParticipants(
      targets({ hr: 150, spo2: 98, bp_sys: 0 }),
      { hr: 120, spo2: 98, bp_sys: 110, bp_dia: 70, etco2: 35 },
      new Set(['bp_sys']),
    )

    expect(participants).toEqual({ hr: { start: 120, target: 150 } })
  })

  it('derives rising and falling integer values from elapsed whole seconds', () => {
    const trend = running({
      hr: { start: 120, target: 150 },
      spo2: { start: 100, target: 90 },
    })

    expect(deriveVitalTrendValues(trend, 1_999)).toEqual({ hr: 120, spo2: 100 })
    expect(deriveVitalTrendValues(trend, 16_000)).toEqual({ hr: 135, spo2: 95 })
    expect(deriveVitalTrendValues(trend, 31_000)).toEqual({ hr: 150, spo2: 90 })
  })

  it('forces exact targets for zero-duration and delayed completion', () => {
    expect(
      deriveVitalTrendValues(running({ hr: { start: 120, target: 121 } }, 0), 1_000),
    ).toEqual({ hr: 121 })
    expect(
      deriveVitalTrendValues(running({ hr: { start: 120, target: 121 } }, 30), 90_000),
    ).toEqual({ hr: 121 })
  })

  it('reports countdown time only while running', () => {
    const trend = running({ hr: { start: 120, target: 150 } })
    expect(vitalTrendSecondsLeft(trend, 1_001)).toBe(30)
    expect(vitalTrendSecondsLeft(trend, 30_001)).toBe(1)
    expect(vitalTrendSecondsLeft({ ...trend, status: 'complete' }, 2_000)).toBe(0)
  })

  it('normalizes persisted configuration and drops invalid targets', () => {
    expect(
      normalizeVitalTrendConfiguration({
        durationSeconds: 45,
        targets: { hr: 150, spo2: 101, bp_sys: 0, bp_dia: '70' },
      }),
    ).toEqual({
      durationSeconds: 45,
      targets: targets({ hr: 150, bp_sys: 0 }),
    })
    expect(normalizeVitalTrendConfiguration(null)).toEqual(
      createEmptyVitalTrendConfiguration(),
    )
  })
})
