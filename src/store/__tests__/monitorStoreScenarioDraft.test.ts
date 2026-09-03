import { beforeEach, describe, expect, it } from 'vitest'

import { createEmptyScenarioSnapshot } from '@/lib/scenarioSnapshot'
import { useMonitorStore } from '@/store/monitorStore'

describe('monitorStore scenario drafts', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('applies reusable draft fields without touching runtime or Save/Send layers', () => {
    const store = useMonitorStore.getState()
    store.setDraft('hr', 80)
    store.save()
    store.send()
    store.setCprMode('weak')
    store.startEtco2Calibration()
    store.completeEtco2Calibration()
    const confirmedBefore = useMonitorStore.getState().confirmed
    const dispatchBefore = useMonitorStore.getState().dispatch

    const snapshot = createEmptyScenarioSnapshot()
    snapshot.monitor.draft.hr = 155
    snapshot.monitor.draft.rhythm = 'vf'
    snapshot.monitor.draftVitalActive.hr = true
    snapshot.monitor.lastRhythm = 'vf'
    snapshot.callerInfo.address = '123 Rue Principale'
    snapshot.dispatch.minutes = 3
    snapshot.dispatch.seconds = 15
    snapshot.dispatch.originAddress = 'Station 9'

    useMonitorStore.getState().applyScenarioDraft(snapshot)
    const state = useMonitorStore.getState()

    expect(state.draft.hr).toBe(190)
    expect(state.draft.rhythm).toBe('vf')
    expect(state.draftVitalActive.hr).toBe(true)
    expect(state.lastRhythm).toBe('vf')
    expect(state.callerInfoDraft.address).toBe('123 Rue Principale')
    expect(state.dispatchMinutes).toBe(3)
    expect(state.dispatchSeconds).toBe(15)
    expect(state.dispatchRouteDraft.originAddress).toBe('Station 9')
    expect(state.confirmed).toEqual(confirmedBefore)
    expect(state.dispatch).toEqual(dispatchBefore)
    expect(state.cprMode).toBe('weak')
    expect(state.etco2CalibrationStatus).toBe('calibrated')

    useMonitorStore.getState().setDraft('rhythm', 'nsr')
    expect(useMonitorStore.getState().draft.hr).toBe(80)
  })

  it('applies Asystole with FC fixed at zero and active', () => {
    const snapshot = createEmptyScenarioSnapshot()
    snapshot.monitor.draft.hr = 155
    snapshot.monitor.draft.rhythm = 'asystole'
    snapshot.monitor.draftVitalActive.hr = false

    useMonitorStore.getState().applyScenarioDraft(snapshot)

    const state = useMonitorStore.getState()
    expect(state.draft.hr).toBe(0)
    expect(state.draftVitalActive.hr).toBe(true)
  })
})
