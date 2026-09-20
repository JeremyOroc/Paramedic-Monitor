import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMonitorStore } from '@/store/monitorStore'

function sendVitals(hr = 120, spo2 = 98) {
  const store = useMonitorStore.getState()
  store.setDraft('hr', hr)
  store.setDraft('spo2', spo2)
  store.setDraftVitalActive('hr', true)
  store.setDraftVitalActive('spo2', true)
  store.save()
  store.send()
}

function sendTrend(
  targets: { hr?: number | null; spo2?: number | null },
  seconds: number,
) {
  const store = useMonitorStore.getState()
  if ('hr' in targets) store.setVitalTrendTarget('hr', targets.hr ?? null)
  if ('spo2' in targets) store.setVitalTrendTarget('spo2', targets.spo2 ?? null)
  store.setVitalTrendSeconds(seconds)
  store.save()
  store.send()
}

describe('monitor store vital Trends', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-19T12:00:00.000Z'))
    useMonitorStore.getState().reset()
  })

  it('stages targets with Save and starts all populated targets with Send', () => {
    sendVitals()
    const store = useMonitorStore.getState()
    store.setVitalTrendTarget('hr', 150)
    store.setVitalTrendTarget('spo2', 90)
    store.setVitalTrendSeconds(30)

    expect(useMonitorStore.getState().activeVitalTrend).toBeNull()
    store.save()
    expect(useMonitorStore.getState().activeVitalTrend).toBeNull()
    store.send()

    expect(useMonitorStore.getState().activeVitalTrend).toMatchObject({
      status: 'running',
      participants: {
        hr: { start: 120, target: 150 },
        spo2: { start: 98, target: 90 },
      },
    })
  })

  it('derives synchronized intermediate values and completes at exact targets', () => {
    sendVitals()
    sendTrend({ hr: 150, spo2: 90 }, 30)

    vi.setSystemTime(new Date('2026-09-19T12:00:15.000Z'))
    useMonitorStore.getState().advanceVitalTrend()
    expect(useMonitorStore.getState().confirmed.hr).toBe(135)
    expect(useMonitorStore.getState().confirmed.spo2).toBe(94)

    vi.setSystemTime(new Date('2026-09-19T12:00:30.000Z'))
    useMonitorStore.getState().advanceVitalTrend()
    expect(useMonitorStore.getState().confirmed.hr).toBe(150)
    expect(useMonitorStore.getState().confirmed.spo2).toBe(90)
    expect(useMonitorStore.getState().draft.hr).toBe(150)
    expect(useMonitorStore.getState().activeVitalTrend).toMatchObject({
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

  it('replaces a running Trend from its current intermediate value', () => {
    sendVitals()
    sendTrend({ hr: 150 }, 30)
    vi.setSystemTime(new Date('2026-09-19T12:00:10.000Z'))
    useMonitorStore.getState().advanceVitalTrend()

    sendTrend({ hr: 180 }, 20)
    expect(useMonitorStore.getState().activeVitalTrend?.participants.hr).toEqual({
      start: 130,
      target: 180,
    })
  })

  it('a direct sent value cancels only that vital while others continue', () => {
    sendVitals()
    sendTrend({ hr: 150, spo2: 90 }, 30)
    vi.setSystemTime(new Date('2026-09-19T12:00:10.000Z'))
    useMonitorStore.getState().advanceVitalTrend()

    useMonitorStore.getState().setDraft('hr', 80)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    expect(useMonitorStore.getState().confirmed.hr).toBe(80)
    expect(useMonitorStore.getState().activeVitalTrend?.participants.hr).toBeUndefined()
    expect(useMonitorStore.getState().activeVitalTrend?.participants.spo2).toBeDefined()
  })

  it('Automatic FC lock cancels FC participation without pausing other vitals', () => {
    sendVitals()
    sendTrend({ hr: 150, spo2: 90 }, 30)
    vi.setSystemTime(new Date('2026-09-19T12:00:10.000Z'))
    useMonitorStore.getState().advanceVitalTrend()

    useMonitorStore.getState().setDraft('rhythm', 'asystole')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    expect(useMonitorStore.getState().confirmed.hr).toBe(0)
    expect(useMonitorStore.getState().activeVitalTrend?.participants.hr).toBeUndefined()
    expect(useMonitorStore.getState().activeVitalTrend?.participants.spo2).toBeDefined()

    useMonitorStore.getState().setDraft('rhythm', 'nsr')
    expect(useMonitorStore.getState().draft.hr).toBe(130)
  })

  it('applies zero-duration targets immediately and leaves a completion to publish', () => {
    sendVitals()
    sendTrend({ hr: 150 }, 0)

    expect(useMonitorStore.getState().confirmed.hr).toBe(150)
    expect(useMonitorStore.getState().draft.hr).toBe(150)
    expect(useMonitorStore.getState().activeVitalTrend).toMatchObject({
      status: 'complete',
      completionPublished: false,
    })
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
    expect(useMonitorStore.getState().vitalTrendDraft.targets.hr).toBeNull()
  })
})
