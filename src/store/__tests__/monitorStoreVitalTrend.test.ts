import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMonitorStore } from '@/store/monitorStore'
import type { Rhythm } from '@/types/vitals'

function sendVitals(hr = 120, spo2 = 98) {
  const store = useMonitorStore.getState()
  store.setDraft('hr', hr)
  store.setDraft('spo2', spo2)
  store.setDraftVitalActive('hr', true)
  store.setDraftVitalActive('spo2', true)
  store.save()
  store.send()
}

function sendTrend(values: { hr?: number; spo2?: number }, seconds: number) {
  const store = useMonitorStore.getState()
  if (values.hr !== undefined) store.setDraft('hr', values.hr)
  if (values.spo2 !== undefined) store.setDraft('spo2', values.spo2)
  store.setVitalTrendSeconds(seconds)
  store.save()
  store.send()
}

describe('monitor store fused vital Trends', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-19T12:00:00.000Z'))
    useMonitorStore.getState().reset()
  })

  it('uses staged fused values as shared-duration targets after Save and Send', () => {
    sendVitals()
    const store = useMonitorStore.getState()
    store.setDraft('hr', 150)
    store.setDraft('spo2', 90)
    store.setVitalTrendSeconds(30)

    expect(useMonitorStore.getState().activeVitalTrend?.status).not.toBe('running')
    store.save()
    expect(useMonitorStore.getState().activeVitalTrend?.status).not.toBe('running')
    store.send()

    expect(useMonitorStore.getState().activeVitalTrend).toMatchObject({
      status: 'running',
      participants: {
        hr: { start: 120, target: 150 },
        spo2: { start: 98, target: 90 },
      },
    })
    expect(useMonitorStore.getState().draft.hr).toBe(150)
    expect(useMonitorStore.getState().confirmed.hr).toBe(120)
    expect(useMonitorStore.getState().confirmedAuthored.hr).toBe(150)
  })

  it('derives synchronized values, reaches exact targets, and disarms the duration', () => {
    sendVitals()
    sendTrend({ hr: 150, spo2: 90 }, 30)

    vi.setSystemTime(new Date('2026-09-19T12:00:15.000Z'))
    useMonitorStore.getState().advanceVitalTrend()
    expect(useMonitorStore.getState().confirmed.hr).toBe(135)
    expect(useMonitorStore.getState().confirmed.spo2).toBe(94)

    vi.setSystemTime(new Date('2026-09-19T12:00:30.000Z'))
    useMonitorStore.getState().advanceVitalTrend()
    const state = useMonitorStore.getState()
    expect(state.confirmed.hr).toBe(150)
    expect(state.confirmed.spo2).toBe(90)
    expect(state.draft.hr).toBe(150)
    expect(state.vitalTrendDraft.durationSeconds).toBe(0)
    expect(state.vitalTrendSaved.durationSeconds).toBe(0)
    expect(state.vitalTrendDraftRevision).toBe(state.vitalTrendConsumedRevision)
    expect(state.activeVitalTrend).toMatchObject({
      status: 'complete',
      completionPublished: false,
    })
  })

  it('does not restart a consumed Trend on an unrelated Save and Send', () => {
    sendVitals()
    sendTrend({ hr: 150 }, 30)
    const first = useMonitorStore.getState().activeVitalTrend

    vi.setSystemTime(new Date('2026-09-19T12:00:10.000Z'))
    useMonitorStore.getState().setCallerInfoDraft('callNumber', '42')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    expect(useMonitorStore.getState().activeVitalTrend?.id).toBe(first?.id)
    expect(useMonitorStore.getState().activeVitalTrend?.startsAt).toBe(first?.startsAt)
  })

  it('replaces all applicable participation from current live values', () => {
    sendVitals()
    sendTrend({ hr: 150, spo2: 90 }, 30)
    vi.setSystemTime(new Date('2026-09-19T12:00:10.000Z'))
    useMonitorStore.getState().advanceVitalTrend()

    sendTrend({ hr: 180 }, 20)
    expect(useMonitorStore.getState().activeVitalTrend?.participants).toEqual({
      hr: { start: 130, target: 180 },
      spo2: { start: 95, target: 90 },
    })
  })

  it('can replace only the duration while retaining the authored targets', () => {
    sendVitals()
    sendTrend({ hr: 150 }, 30)
    vi.setSystemTime(new Date('2026-09-19T12:00:10.000Z'))
    useMonitorStore.getState().advanceVitalTrend()

    const store = useMonitorStore.getState()
    store.setVitalTrendSeconds(20)
    store.save()
    store.send()

    expect(useMonitorStore.getState().activeVitalTrend?.participants.hr).toEqual({
      start: 130,
      target: 150,
    })
  })

  it('a zero-duration Send applies every staged value immediately and ends the Trend', () => {
    sendVitals()
    sendTrend({ hr: 150, spo2: 90 }, 30)
    vi.setSystemTime(new Date('2026-09-19T12:00:10.000Z'))
    useMonitorStore.getState().advanceVitalTrend()

    const store = useMonitorStore.getState()
    store.setDraft('hr', 80)
    store.setVitalTrendSeconds(0)
    store.save()
    store.send()

    expect(useMonitorStore.getState().confirmed.hr).toBe(80)
    expect(useMonitorStore.getState().confirmed.spo2).toBe(90)
    expect(useMonitorStore.getState().activeVitalTrend).toMatchObject({
      status: 'immediate',
      participants: {},
      completionPublished: true,
    })
  })

  it.each<Rhythm>(['vf', 'vt'])(
    '%s excludes FC without restarting other participation',
    (rhythm) => {
      sendVitals()
      sendTrend({ hr: 150, spo2: 90 }, 30)
      vi.setSystemTime(new Date('2026-09-19T12:00:10.000Z'))
      useMonitorStore.getState().advanceVitalTrend()
      const originalId = useMonitorStore.getState().activeVitalTrend?.id

      useMonitorStore.getState().setDraft('rhythm', rhythm)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()

      const state = useMonitorStore.getState()
      expect(state.activeVitalTrend?.id).toBe(originalId)
      expect(state.activeVitalTrend?.participants.hr).toBeUndefined()
      expect(state.activeVitalTrend?.participants.spo2).toBeDefined()
      expect(state.confirmed.hr).toBe(rhythm === 'vf' ? 190 : 220)

      useMonitorStore.getState().setDraft('rhythm', 'nsr')
      expect(useMonitorStore.getState().draft.hr).toBe(130)
    },
  )

  it('consumes and disarms a positive no-op without starting a countdown', () => {
    sendVitals()
    const store = useMonitorStore.getState()
    store.setVitalTrendSeconds(30)
    store.save()
    store.send()

    const state = useMonitorStore.getState()
    expect(state.activeVitalTrend).toBeNull()
    expect(state.vitalTrendDraft.durationSeconds).toBe(0)
    expect(state.vitalTrendSaved.durationSeconds).toBe(0)
    expect(state.vitalTrendSavedRevision).toBe(state.vitalTrendConsumedRevision)
  })

  it('shares timestamps so a receiving monitor catches up without interval writes', () => {
    sendVitals()
    sendTrend({ hr: 150 }, 30)
    const shared = useMonitorStore.getState().getSharedState()

    useMonitorStore.getState().reset()
    vi.setSystemTime(new Date('2026-09-19T12:00:15.000Z'))
    useMonitorStore.getState().applySharedState(shared)

    expect(useMonitorStore.getState().confirmed.hr).toBe(135)
    expect(useMonitorStore.getState().activeVitalTrend?.endsAt).toBe(
      shared.activeVitalTrend?.endsAt,
    )
  })

  it('monitor reset cancels and clears Trend configuration', () => {
    sendVitals()
    sendTrend({ hr: 150 }, 30)

    useMonitorStore.getState().resetMonitorVitals()

    expect(useMonitorStore.getState().activeVitalTrend).toBeNull()
    expect(useMonitorStore.getState().vitalTrendDraft.durationSeconds).toBe(0)
  })
})
