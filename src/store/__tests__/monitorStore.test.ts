import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useMonitorStore, STORAGE_KEY } from '../monitorStore'
import {
  fieldStatus,
  hasDirty,
  hasPending,
  hasVitalActiveDirty,
  hasVitalActivePending,
  vitalStatus,
} from '../fieldState'
import { DEFAULT_VITALS } from '@/types/vitals'
import { DEFAULT_CALLER_INFO } from '@/types/callerInfo'
import { DEFAULT_PATIENT_INFO } from '@/types/patientInfo'
import {
  DEFAULT_DISPATCH_ROUTE,
  JOHN_ABBOTT_ADDRESS,
} from '@/types/dispatchRoute'

const defaultsAsVitals = () => ({
  hr: 0,
  bp_sys: 0,
  bp_dia: 0,
  etco2: 0,
  spo2: 0,
  rhythm: 'off',
  spo2_waveform: 'off',
  etco2_waveform: 'off',
})

const inactiveVitalState = {
  hr: false,
  bp_sys: false,
  bp_dia: false,
  etco2: false,
  spo2: false,
}

describe('monitorStore', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('initial state has inactive monitor vitals and disconnected waveforms', () => {
    const s = useMonitorStore.getState()
    const def = defaultsAsVitals()
    expect(s.draft).toEqual(def)
    expect(s.saved).toEqual(def)
    expect(s.confirmed).toEqual(def)
    expect(s.draftVitalsActive).toBe(false)
    expect(s.savedVitalsActive).toBe(false)
    expect(s.confirmedVitalsActive).toBe(false)
    expect(s.draftVitalActive).toEqual(inactiveVitalState)
    expect(s.savedVitalActive).toEqual(inactiveVitalState)
    expect(s.confirmedVitalActive).toEqual(inactiveVitalState)
    expect(s.callerInfoDraft).toEqual(DEFAULT_CALLER_INFO)
    expect(s.callerInfoSaved).toEqual(DEFAULT_CALLER_INFO)
    expect(s.callerInfoConfirmed).toEqual(DEFAULT_CALLER_INFO)
    expect(s.dispatchRouteDraft.originAddress).toBe(JOHN_ABBOTT_ADDRESS)
    expect(s.dispatchRouteDraft).toEqual(DEFAULT_DISPATCH_ROUTE)
    expect(s.dispatchRouteSaved).toEqual(DEFAULT_DISPATCH_ROUTE)
    expect(s.dispatchRouteConfirmed).toEqual(DEFAULT_DISPATCH_ROUTE)
    expect(s.etco2CalibrationStatus).toBe('idle')
    expect(s.cprOverrideActive).toBe(false)
  })

  it('setDraft updates only draft', () => {
    useMonitorStore.getState().setDraft('hr', 160)
    const s = useMonitorStore.getState()
    expect(s.draft.hr).toBe(160)
    expect(s.draftVitalActive.hr).toBe(false)
    expect(s.saved.hr).toBe(0)
    expect(s.savedVitalActive.hr).toBe(false)
    expect(s.confirmed.hr).toBe(0)
    expect(s.confirmedVitalActive.hr).toBe(false)
  })

  it('save copies draft to saved without touching confirmed', () => {
    useMonitorStore.getState().setDraft('hr', 160)
    useMonitorStore.getState().save()
    const s = useMonitorStore.getState()
    expect(s.saved.hr).toBe(160)
    expect(s.confirmed.hr).toBe(0)
  })

  it('send copies saved to confirmed', () => {
    useMonitorStore.getState().setDraft('hr', 160)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.hr).toBe(160)
  })

  it('reset returns all three slices to inactive vitals and disconnected waveforms', () => {
    useMonitorStore.getState().setDraft('hr', 200)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    useMonitorStore.getState().reset()
    const s = useMonitorStore.getState()
    const def = defaultsAsVitals()
    expect(s.draft).toEqual(def)
    expect(s.saved).toEqual(def)
    expect(s.confirmed).toEqual(def)
    expect(s.draftVitalsActive).toBe(false)
    expect(s.savedVitalsActive).toBe(false)
    expect(s.confirmedVitalsActive).toBe(false)
    expect(s.draftVitalActive).toEqual(inactiveVitalState)
    expect(s.savedVitalActive).toEqual(inactiveVitalState)
    expect(s.confirmedVitalActive).toEqual(inactiveVitalState)
    expect(s.callerInfoDraft).toEqual(DEFAULT_CALLER_INFO)
    expect(s.callerInfoSaved).toEqual(DEFAULT_CALLER_INFO)
    expect(s.callerInfoConfirmed).toEqual(DEFAULT_CALLER_INFO)
    expect(s.dispatchRouteDraft).toEqual(DEFAULT_DISPATCH_ROUTE)
    expect(s.dispatchRouteSaved).toEqual(DEFAULT_DISPATCH_ROUTE)
    expect(s.dispatchRouteConfirmed).toEqual(DEFAULT_DISPATCH_ROUTE)
  })

  it('caller info flows through the same draft → save → send pipeline', () => {
    useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
    useMonitorStore.getState().setCallerInfoDraft('problem', 'Douleur thoracique')
    useMonitorStore.getState().setCallerInfoDraft('extra1Label', 'Acces')
    useMonitorStore.getState().setCallerInfoDraft('extra1', 'Porte cote nord')
    expect(useMonitorStore.getState().callerInfoSaved.address).toBe('')
    expect(useMonitorStore.getState().callerInfoConfirmed.address).toBe('')

    useMonitorStore.getState().save()
    expect(useMonitorStore.getState().callerInfoSaved.address).toBe('123 Rue Principale')
    expect(useMonitorStore.getState().callerInfoConfirmed.address).toBe('')

    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().callerInfoConfirmed.address).toBe('123 Rue Principale')
    expect(useMonitorStore.getState().callerInfoConfirmed.problem).toBe('Douleur thoracique')
    expect(useMonitorStore.getState().callerInfoConfirmed.extra1Label).toBe('Acces')
    expect(useMonitorStore.getState().callerInfoConfirmed.extra1).toBe('Porte cote nord')
    expect(useMonitorStore.getState().confirmedVitalsActive).toBe(false)
  })

  it('dispatch route flows through save and send with a send-time startedAt', () => {
    const now = Date.parse('2026-06-18T14:00:00Z')
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)
    const readyRoute = {
      ...DEFAULT_DISPATCH_ROUTE,
      destinationAddress: '200 Sainte-Anne Street, Sainte-Anne-de-Bellevue, QC',
      destination: { lat: 45.403, lng: -73.951 },
      distanceMeters: 3200,
      durationSeconds: 480,
      geometry: [
        { lat: 45.4068, lng: -73.9412 },
        { lat: 45.403, lng: -73.951 },
      ],
      status: 'ready' as const,
    }

    useMonitorStore.getState().setDispatchRouteDraft(readyRoute)
    expect(useMonitorStore.getState().dispatchRouteSaved.status).toBe('idle')

    useMonitorStore.getState().save()
    expect(useMonitorStore.getState().dispatchRouteSaved).toEqual(readyRoute)
    expect(useMonitorStore.getState().dispatchRouteConfirmed.status).toBe('idle')

    useMonitorStore.getState().send()
    const confirmedRoute = useMonitorStore.getState().dispatchRouteConfirmed
    expect(confirmedRoute.destinationAddress).toBe(readyRoute.destinationAddress)
    expect(confirmedRoute.startedAt).toBe(now)
    expect(confirmedRoute.durationSeconds).toBe(0)
    nowSpy.mockRestore()
  })

  it('uses the dispatch countdown duration for confirmed route movement', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    const readyRoute = {
      ...DEFAULT_DISPATCH_ROUTE,
      destinationAddress: '200 Sainte-Anne Street, Sainte-Anne-de-Bellevue, QC',
      destination: { lat: 45.403, lng: -73.951 },
      distanceMeters: 3200,
      durationSeconds: 480,
      geometry: [
        { lat: 45.4068, lng: -73.9412 },
        { lat: 45.403, lng: -73.951 },
      ],
      status: 'ready' as const,
    }

    useMonitorStore.getState().setDispatchMinutes(3)
    useMonitorStore.getState().setDispatchSeconds(15)
    useMonitorStore.getState().setDispatchRouteDraft(readyRoute)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    const { dispatch, dispatchRouteConfirmed } = useMonitorStore.getState()
    expect(dispatchRouteConfirmed.durationSeconds).toBe(195)
    expect(dispatchRouteConfirmed.startedAt).toBe(1_000_000)
    expect(dispatch.countdownEndsAt).toBe(1_000_000 + 195_000)
  })

  it('updates route duration from the saved dispatch countdown on later sends', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    const readyRoute = {
      ...DEFAULT_DISPATCH_ROUTE,
      destinationAddress: '200 Sainte-Anne Street, Sainte-Anne-de-Bellevue, QC',
      destination: { lat: 45.403, lng: -73.951 },
      distanceMeters: 3200,
      durationSeconds: 480,
      geometry: [
        { lat: 45.4068, lng: -73.9412 },
        { lat: 45.403, lng: -73.951 },
      ],
      status: 'ready' as const,
    }

    useMonitorStore.getState().setDispatchMinutes(5)
    useMonitorStore.getState().setDispatchRouteDraft(readyRoute)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().dispatchRouteConfirmed.durationSeconds).toBe(300)

    useMonitorStore.getState().setDispatchMinutes(8)
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().dispatchRouteConfirmed.durationSeconds).toBe(300)

    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    const { dispatch, dispatchRouteConfirmed } = useMonitorStore.getState()
    expect(dispatchRouteConfirmed.durationSeconds).toBe(480)
    expect(dispatchRouteConfirmed.startedAt).toBe(1_000_000)
    // The changed countdown re-dispatches, so the gate restarts on the new
    // duration rather than staying frozen at the first arm.
    expect(dispatch.countdownEndsAt).toBe(1_000_000 + 480_000)
    expect(useMonitorStore.getState().dispatchSavedSeconds).toBe(480)
    expect(useMonitorStore.getState().dispatchConfirmedSeconds).toBe(480)
  })

  it('a changed countdown re-dispatches: restarts the gate and clears acknowledge/arrival', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    useMonitorStore.getState().setDispatchMinutes(5)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    const firstRunId = useMonitorStore.getState().dispatch.runId
    useMonitorStore.getState().acknowledgeCall('14:05:11')
    expect(useMonitorStore.getState().dispatch.acknowledgedAt).toBe('14:05:11')

    // Instructor saves a new countdown and re-sends from a later wall-clock time.
    nowSpy.mockReturnValue(1_500_000)
    useMonitorStore.getState().setDispatchMinutes(8)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    const { dispatch } = useMonitorStore.getState()
    expect(dispatch.startedAt).toBe(1_500_000)
    expect(dispatch.countdownEndsAt).toBe(1_500_000 + 480_000)
    expect(dispatch.acknowledgedAt).toBeNull()
    expect(dispatch.arrivedAt).toBeNull()
    expect(dispatch.runId).not.toBe(firstRunId)
  })

  it('a later send with the same countdown keeps the gate and acknowledge/arrival', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    useMonitorStore.getState().setDispatchMinutes(5)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    const firstRunId = useMonitorStore.getState().dispatch.runId
    useMonitorStore.getState().acknowledgeCall('14:05:11')

    // Push new caller-info content (a different field) without touching the countdown.
    nowSpy.mockReturnValue(1_500_000)
    useMonitorStore.getState().setDispatchRouteDraft({
      ...DEFAULT_DISPATCH_ROUTE,
      destinationAddress: '200 Sainte-Anne Street',
    })
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    const { dispatch } = useMonitorStore.getState()
    expect(dispatch.startedAt).toBe(1_000_000)
    expect(dispatch.countdownEndsAt).toBe(1_000_000 + 300_000)
    expect(dispatch.acknowledgedAt).toBe('14:05:11')
    expect(dispatch.runId).toBe(firstRunId)
  })

  it('numeric values save and send without changing their inactive state', () => {
    expect(useMonitorStore.getState().confirmedVitalsActive).toBe(false)

    useMonitorStore.getState().setDraft('hr', 160)
    expect(useMonitorStore.getState().draftVitalActive.hr).toBe(false)
    expect(useMonitorStore.getState().draftVitalsActive).toBe(false)
    expect(useMonitorStore.getState().confirmedVitalsActive).toBe(false)

    useMonitorStore.getState().save()
    expect(useMonitorStore.getState().savedVitalsActive).toBe(false)
    expect(useMonitorStore.getState().confirmedVitalsActive).toBe(false)

    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmedVitalActive.hr).toBe(false)
    expect(useMonitorStore.getState().confirmedVitalsActive).toBe(false)
    expect(useMonitorStore.getState().confirmed.hr).toBe(160)
  })

  it('SpO2 and EtCO2 numeric edits preserve disconnected graph state', () => {
    useMonitorStore.getState().setDraft('spo2', 98)
    useMonitorStore.getState().setDraft('etco2', 35)

    let s = useMonitorStore.getState()
    expect(s.draft.spo2).toBe(98)
    expect(s.draftVitalActive.spo2).toBe(false)
    expect(s.draft.spo2_waveform).toBe('off')
    expect(s.draft.etco2).toBe(35)
    expect(s.draftVitalActive.etco2).toBe(false)
    expect(s.draft.etco2_waveform).toBe('off')
    expect(s.saved.spo2_waveform).toBe('off')
    expect(s.confirmed.etco2_waveform).toBe('off')

    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    s = useMonitorStore.getState()
    expect(s.confirmed.spo2).toBe(98)
    expect(s.confirmed.spo2_waveform).toBe('off')
    expect(s.confirmed.etco2).toBe(35)
    expect(s.confirmed.etco2_waveform).toBe('off')
  })

  it('typed zero also preserves disconnected SpO2 and EtCO2 graphs', () => {
    useMonitorStore.getState().setDraft('spo2', 0)
    useMonitorStore.getState().setDraft('etco2', 0)

    const s = useMonitorStore.getState()
    expect(s.draftVitalActive.spo2).toBe(false)
    expect(s.draft.spo2_waveform).toBe('off')
    expect(s.draftVitalActive.etco2).toBe(false)
    expect(s.draft.etco2_waveform).toBe('off')
  })

  it('timed draft vital updates change numbers without turning inactive vitals on', () => {
    useMonitorStore.getState().setTimedDraftVitals({
      hr: 106,
      spo2: 98,
      bp_sys: 112,
      bp_dia: 70,
      etco2: 36,
    })

    const s = useMonitorStore.getState()
    expect(s.draft).toMatchObject({
      hr: 106,
      spo2: 98,
      bp_sys: 112,
      bp_dia: 70,
      etco2: 36,
      spo2_waveform: 'off',
      etco2_waveform: 'off',
    })
    expect(s.draftVitalActive).toEqual(inactiveVitalState)
    expect(s.draftVitalsActive).toBe(false)
  })

  it('timed draft vital updates preserve active vitals and connected SpO2/EtCO2 graphs', () => {
    useMonitorStore.getState().setDraftVitalActive('hr', true)
    useMonitorStore.getState().setDraftVitalActive('spo2', true)
    useMonitorStore.getState().setDraftVitalActive('etco2', true)

    useMonitorStore.getState().setTimedDraftVitals({
      hr: 100,
      spo2: 99,
      etco2: 38,
    })

    const s = useMonitorStore.getState()
    expect(s.draft.hr).toBe(100)
    expect(s.draft.spo2).toBe(99)
    expect(s.draft.etco2).toBe(38)
    expect(s.draftVitalActive.hr).toBe(true)
    expect(s.draftVitalActive.spo2).toBe(true)
    expect(s.draftVitalActive.etco2).toBe(true)
    expect(s.draft.spo2_waveform).toBe('normal')
    expect(s.draft.etco2_waveform).toBe('normal')
    expect(s.draftVitalsActive).toBe(true)
  })

  it('timed draft vital updates keep SpO2 and EtCO2 disconnected after they are turned off', () => {
    useMonitorStore.getState().setDraftVitalActive('spo2', true)
    useMonitorStore.getState().setDraftVitalActive('etco2', true)
    useMonitorStore.getState().setDraftVitalActive('spo2', false)
    useMonitorStore.getState().setDraftVitalActive('etco2', false)

    useMonitorStore.getState().setTimedDraftVitals({
      spo2: 92,
      etco2: 26,
    })

    const s = useMonitorStore.getState()
    expect(s.draft.spo2).toBe(92)
    expect(s.draft.etco2).toBe(26)
    expect(s.draftVitalActive.spo2).toBe(false)
    expect(s.draftVitalActive.etco2).toBe(false)
    expect(s.draft.spo2_waveform).toBe('off')
    expect(s.draft.etco2_waveform).toBe('off')
    expect(s.draftVitalsActive).toBe(false)
  })

  it('bulk draft vital updates fill numbers while preserving every active state', () => {
    useMonitorStore.getState().setDraftVitalActive('hr', true)
    useMonitorStore.getState().setDraftVitalActive('spo2', true)
    useMonitorStore.getState().setDraftVitalActive('etco2', true)

    useMonitorStore.getState().setDraftVitalValues({
      hr: 54,
      spo2: 78,
      bp_sys: 96,
      bp_dia: 58,
      etco2: 62,
    })

    const s = useMonitorStore.getState()
    expect(s.draft).toMatchObject({
      hr: 54,
      spo2: 78,
      bp_sys: 96,
      bp_dia: 58,
      etco2: 62,
      spo2_waveform: 'normal',
      etco2_waveform: 'normal',
    })
    expect(s.draftVitalActive).toEqual({
      hr: true,
      bp_sys: false,
      bp_dia: false,
      etco2: true,
      spo2: true,
    })
    expect(s.draftVitalsActive).toBe(true)
  })

  it('HR and BP numeric edits do not change SpO2 or EtCO2 graph state', () => {
    useMonitorStore.getState().setDraft('hr', 80)
    useMonitorStore.getState().setDraft('bp_sys', 120)
    useMonitorStore.getState().setDraft('bp_dia', 80)

    const s = useMonitorStore.getState()
    expect(s.draftVitalActive.hr).toBe(false)
    expect(s.draftVitalActive.bp_sys).toBe(false)
    expect(s.draftVitalActive.bp_dia).toBe(false)
    expect(s.draft.spo2_waveform).toBe('off')
    expect(s.draft.etco2_waveform).toBe('off')
  })

  it('can turn a stored zero vital on and off independently', () => {
    useMonitorStore.getState().setDraft('hr', 0)
    expect(useMonitorStore.getState().draftVitalActive.hr).toBe(false)
    useMonitorStore.getState().setDraftVitalActive('hr', true)
    expect(useMonitorStore.getState().draft.hr).toBe(0)
    expect(useMonitorStore.getState().draftVitalActive.hr).toBe(true)
    expect(useMonitorStore.getState().draftVitalsActive).toBe(true)

    useMonitorStore.getState().setDraftVitalActive('hr', false)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    expect(useMonitorStore.getState().confirmed.hr).toBe(0)
    expect(useMonitorStore.getState().confirmedVitalActive.hr).toBe(false)
    expect(useMonitorStore.getState().confirmedVitalsActive).toBe(false)

    useMonitorStore.getState().setDraftVitalActive('hr', true)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.hr).toBe(0)
    expect(useMonitorStore.getState().confirmedVitalActive.hr).toBe(true)
    expect(useMonitorStore.getState().confirmedVitalsActive).toBe(true)
  })


  it('resetVitalsToNormal resets only draft vital numbers', () => {
    useMonitorStore.getState().setDraft('hr', 180)
    useMonitorStore.getState().setDraft('bp_sys', 230)
    useMonitorStore.getState().setDraft('bp_dia', 240)
    useMonitorStore.getState().setDraft('etco2', 10)
    useMonitorStore.getState().setDraft('spo2', 80)
    useMonitorStore.getState().setDraft('rhythm', 'vf')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    useMonitorStore.getState().setDraft('rhythm', 'vt')

    useMonitorStore.getState().resetVitalsToNormal()

    const s = useMonitorStore.getState()
    expect(s.draft).toMatchObject({
      hr: DEFAULT_VITALS.hr,
      bp_sys: DEFAULT_VITALS.bp_sys,
      bp_dia: DEFAULT_VITALS.bp_dia,
      etco2: DEFAULT_VITALS.etco2,
      spo2: DEFAULT_VITALS.spo2,
      rhythm: 'vt',
    })
    expect(s.draftVitalsActive).toBe(true)
    expect(s.draftVitalActive).toEqual({
      hr: true,
      bp_sys: true,
      bp_dia: true,
      etco2: true,
      spo2: true,
    })
    expect(s.saved.hr).toBe(180)
    expect(s.confirmed.hr).toBe(180)
  })

  it('resetMonitorVitals clears only monitor vitals back to inactive disconnected state', () => {
    useMonitorStore.getState().setDraft('hr', 180)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    useMonitorStore.getState().acceptBpReading(
      { bp_sys: 120, bp_dia: 80 },
      { bp_sys: true, bp_dia: true },
    )
    useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    useMonitorStore.getState().setDispatchMinutes(5)
    useMonitorStore.getState().send()
    const resetVersion = useMonitorStore.getState().monitorResetVersion

    useMonitorStore.getState().resetMonitorVitals()

    const s = useMonitorStore.getState()
    const def = defaultsAsVitals()
    expect(s.draft).toEqual(def)
    expect(s.saved).toEqual(def)
    expect(s.confirmed).toEqual(def)
    expect(s.draftVitalsActive).toBe(false)
    expect(s.savedVitalsActive).toBe(false)
    expect(s.confirmedVitalsActive).toBe(false)
    expect(s.draftVitalActive).toEqual(inactiveVitalState)
    expect(s.savedVitalActive).toEqual(inactiveVitalState)
    expect(s.confirmedVitalActive).toEqual(inactiveVitalState)
    expect(s.acceptedBp).toEqual({ bp_sys: 0, bp_dia: 0 })
    expect(s.acceptedBpActive).toEqual({ bp_sys: false, bp_dia: false })
    expect(s.etco2CalibrationStatus).toBe('idle')
    expect(s.cprOverrideActive).toBe(false)
    expect(s.monitorResetVersion).toBe(resetVersion + 1)
    expect(s.callerInfoConfirmed.address).toBe('123 Rue Principale')
    expect(s.dispatch.armed).toBe(true)
  })

  it('tracks EtCO2 calibration status and resets it with monitor reset', () => {
    expect(useMonitorStore.getState().etco2CalibrationStatus).toBe('idle')

    useMonitorStore.getState().startEtco2Calibration()
    expect(useMonitorStore.getState().etco2CalibrationStatus).toBe('calibrating')

    useMonitorStore.getState().completeEtco2Calibration()
    expect(useMonitorStore.getState().etco2CalibrationStatus).toBe('calibrated')

    useMonitorStore.getState().resetMonitorVitals()
    expect(useMonitorStore.getState().etco2CalibrationStatus).toBe('idle')
  })

  it('cancels EtCO2 calibration without marking it calibrated', () => {
    useMonitorStore.getState().startEtco2Calibration()
    useMonitorStore.getState().cancelEtco2Calibration()

    expect(useMonitorStore.getState().etco2CalibrationStatus).toBe('idle')
  })

  it('turning EtCO2 off does not clear completed calibration', () => {
    useMonitorStore.getState().startEtco2Calibration()
    useMonitorStore.getState().completeEtco2Calibration()

    useMonitorStore.getState().setDraftVitalActive('etco2', false)

    expect(useMonitorStore.getState().draftVitalActive.etco2).toBe(false)
    expect(useMonitorStore.getState().draft.etco2_waveform).toBe('off')
    expect(useMonitorStore.getState().etco2CalibrationStatus).toBe('calibrated')
  })

  it('tracks CPR override independently from saved vitals and clears it on reset', () => {
    useMonitorStore.getState().setDraft('hr', 80)
    useMonitorStore.getState().setDraft('rhythm', 'nsr')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    useMonitorStore.getState().setCprOverrideActive(true)

    expect(useMonitorStore.getState().cprOverrideActive).toBe(true)
    expect(useMonitorStore.getState().confirmed.hr).toBe(80)
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('nsr')

    useMonitorStore.getState().resetMonitorVitals()

    expect(useMonitorStore.getState().cprOverrideActive).toBe(false)
  })

  it('keeps accepted BP unchanged on send until a completed reading commits it', () => {
    useMonitorStore.getState().acceptBpReading(
      { bp_sys: 120, bp_dia: 80 },
      { bp_sys: true, bp_dia: true },
    )
    useMonitorStore.getState().setDraft('bp_sys', 170)
    useMonitorStore.getState().setDraft('bp_dia', 110)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    expect(useMonitorStore.getState().confirmed.bp_sys).toBe(170)
    expect(useMonitorStore.getState().confirmed.bp_dia).toBe(110)
    expect(useMonitorStore.getState().acceptedBp).toEqual({ bp_sys: 120, bp_dia: 80 })

    useMonitorStore.getState().acceptBpReading(
      { bp_sys: 170, bp_dia: 110 },
      { bp_sys: true, bp_dia: true },
    )

    expect(useMonitorStore.getState().acceptedBp).toEqual({ bp_sys: 170, bp_dia: 110 })
  })

  it('rhythm flows through the same draft → save → send pipeline', () => {
    useMonitorStore.getState().setDraft('rhythm', 'vf')
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('off')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('vf')
  })

  it('re-stamps the dispatch clock when the room opens', () => {
    vi.useFakeTimers()
    const store = () => useMonitorStore.getState()
    store().setDispatchMinutes(2)
    store().save()
    store().send()

    const stampedAtSend = store().dispatch.countdownEndsAt
    expect(stampedAtSend).not.toBeNull()

    // Send stamps the clock, but with Start gated behind a Send the instructor
    // can spend minutes settling the room first — trainees would otherwise
    // arrive with travel time already burned off.
    vi.advanceTimersByTime(90_000)
    store().startDispatchClock()

    expect(store().dispatch.countdownEndsAt).toBeGreaterThan(stampedAtSend as number)
    expect(store().dispatch.startedAt).toBe(Date.now())
    expect(store().dispatch.countdownEndsAt).toBe(Date.now() + 2 * 60 * 1000)
    vi.useRealTimers()
  })

  it('leaves the clock alone when no call has been dispatched', () => {
    const before = useMonitorStore.getState().dispatch
    useMonitorStore.getState().startDispatchClock()
    expect(useMonitorStore.getState().dispatch).toEqual(before)
  })

  it('clears acknowledge and arrival when the room opens', () => {
    const store = () => useMonitorStore.getState()
    store().save()
    store().send()
    store().acknowledgeCall('10:00:00')
    expect(store().dispatch.acknowledgedAt).toBe('10:00:00')

    store().startDispatchClock()

    expect(store().dispatch.acknowledgedAt).toBeNull()
    expect(store().dispatch.arrivedAt).toBeNull()
  })

  it('restores the last chosen rhythm when ECG is switched back on', () => {
    // The ECG toggle writes rhythm 'off', which overwrites the selection, so the
    // store remembers it separately. Previously switching back on hardcoded NSR.
    useMonitorStore.getState().setDraft('rhythm', 'vf')
    expect(useMonitorStore.getState().lastRhythm).toBe('vf')

    useMonitorStore.getState().setDraft('rhythm', 'off')
    expect(useMonitorStore.getState().draft.rhythm).toBe('off')
    expect(useMonitorStore.getState().lastRhythm).toBe('vf')

    const { lastRhythm } = useMonitorStore.getState()
    useMonitorStore.getState().setDraft('rhythm', lastRhythm)
    expect(useMonitorStore.getState().draft.rhythm).toBe('vf')
  })

  it('defaults lastRhythm to NSR until a rhythm is chosen', () => {
    expect(useMonitorStore.getState().lastRhythm).toBe('nsr')
    useMonitorStore.getState().setDraft('rhythm', 'off')
    expect(useMonitorStore.getState().lastRhythm).toBe('nsr')
  })

  it('tracks the most recent rhythm across several changes', () => {
    for (const rhythm of ['vt', 'third-degree', 'anterior-mi'] as const) {
      useMonitorStore.getState().setDraft('rhythm', rhythm)
      expect(useMonitorStore.getState().lastRhythm).toBe(rhythm)
    }
    useMonitorStore.getState().setDraft('rhythm', 'off')
    expect(useMonitorStore.getState().lastRhythm).toBe('anterior-mi')
  })

  it('clears the remembered rhythm on reset', () => {
    useMonitorStore.getState().setDraft('rhythm', 'torsades')
    useMonitorStore.getState().reset()
    expect(useMonitorStore.getState().lastRhythm).toBe('nsr')
  })

  it('Anterior MI flows through the same draft save send pipeline', () => {
    useMonitorStore.getState().setDraft('rhythm', 'anterior-mi')
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('off')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('anterior-mi')
  })

  it('Inferior MI flows through the same draft save send pipeline', () => {
    useMonitorStore.getState().setDraft('rhythm', 'inferior-mi')
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('off')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('inferior-mi')
  })

  it('1st Degree flows through the same draft save send pipeline', () => {
    useMonitorStore.getState().setDraft('rhythm', 'first-degree')
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('off')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('first-degree')
  })

  it('2nd Degree Type 1 flows through the same draft save send pipeline', () => {
    useMonitorStore.getState().setDraft('rhythm', 'second-degree-type-1')
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('off')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('second-degree-type-1')
  })

  it('2nd Degree Type 2 flows through the same draft save send pipeline', () => {
    useMonitorStore.getState().setDraft('rhythm', 'second-degree-type-2')
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('off')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('second-degree-type-2')
  })

  it('3rd Degree flows through the same draft save send pipeline', () => {
    useMonitorStore.getState().setDraft('rhythm', 'third-degree')
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('off')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('third-degree')
  })

  it('spo2_waveform defaults to off and flows through save → send', () => {
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('off')
    useMonitorStore.getState().setDraft('spo2_waveform', 'weak')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('weak')
  })

  it('etco2_waveform defaults to off and flows through save → send', () => {
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('off')
    useMonitorStore.getState().setDraft('etco2_waveform', 'obstructed')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('obstructed')
  })

  it('SpO2 and EtCO2 active toggles stage matching graph connection state', () => {
    useMonitorStore.getState().setDraftVitalActive('spo2', true)
    useMonitorStore.getState().setDraftVitalActive('etco2', true)

    let s = useMonitorStore.getState()
    expect(s.draftVitalActive.spo2).toBe(true)
    expect(s.draft.spo2_waveform).toBe('normal')
    expect(s.draftVitalActive.etco2).toBe(true)
    expect(s.draft.etco2_waveform).toBe('normal')
    expect(s.saved.spo2_waveform).toBe('off')
    expect(s.confirmed.etco2_waveform).toBe('off')

    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    s = useMonitorStore.getState()
    expect(s.confirmedVitalActive.spo2).toBe(true)
    expect(s.confirmed.spo2_waveform).toBe('normal')
    expect(s.confirmedVitalActive.etco2).toBe(true)
    expect(s.confirmed.etco2_waveform).toBe('normal')

    useMonitorStore.getState().setDraftVitalActive('spo2', false)
    useMonitorStore.getState().setDraftVitalActive('etco2', false)
    s = useMonitorStore.getState()
    expect(s.draftVitalActive.spo2).toBe(false)
    expect(s.draft.spo2_waveform).toBe('off')
    expect(s.draftVitalActive.etco2).toBe(false)
    expect(s.draft.etco2_waveform).toBe('off')
  })

  it('unrelated vital active toggles do not change SpO2 or EtCO2 graph state', () => {
    useMonitorStore.getState().setDraft('spo2_waveform', 'weak')
    useMonitorStore.getState().setDraft('etco2_waveform', 'obstructed')
    useMonitorStore.getState().setDraftVitalActive('hr', true)
    useMonitorStore.getState().setDraftVitalActive('bp_sys', true)
    useMonitorStore.getState().setDraftVitalActive('bp_dia', true)

    const s = useMonitorStore.getState()
    expect(s.draft.spo2_waveform).toBe('weak')
    expect(s.draft.etco2_waveform).toBe('obstructed')
  })

  it('off channel modes flow through save → send without activating vital alarms', () => {
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('off')

    useMonitorStore.getState().setDraft('rhythm', 'nsr')
    useMonitorStore.getState().setDraft('spo2_waveform', 'normal')
    expect(useMonitorStore.getState().draftVitalsActive).toBe(false)

    useMonitorStore.getState().save()
    expect(useMonitorStore.getState().saved.rhythm).toBe('nsr')
    expect(useMonitorStore.getState().saved.spo2_waveform).toBe('normal')
    expect(useMonitorStore.getState().saved.etco2_waveform).toBe('off')
    expect(useMonitorStore.getState().savedVitalsActive).toBe(false)

    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('nsr')
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('normal')
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('off')
    expect(useMonitorStore.getState().confirmedVitalsActive).toBe(false)
  })

  it('patientInfo defaults, then setPatientAge clamps and setPatientSex updates', () => {
    expect(useMonitorStore.getState().patientInfo).toEqual(DEFAULT_PATIENT_INFO)

    useMonitorStore.getState().setPatientAge(63)
    expect(useMonitorStore.getState().patientInfo.age).toBe(63)

    useMonitorStore.getState().setPatientAge(999)
    expect(useMonitorStore.getState().patientInfo.age).toBe(120)
    useMonitorStore.getState().setPatientAge(-3)
    expect(useMonitorStore.getState().patientInfo.age).toBe(0)

    useMonitorStore.getState().setPatientSex('F')
    expect(useMonitorStore.getState().patientInfo.sex).toBe('F')
  })

  it('reset restores patientInfo to defaults', () => {
    useMonitorStore.getState().setPatientAge(80)
    useMonitorStore.getState().setPatientSex('F')
    useMonitorStore.getState().reset()
    expect(useMonitorStore.getState().patientInfo).toEqual(DEFAULT_PATIENT_INFO)
  })
})

describe('dispatch gate', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts disarmed with empty caller events', () => {
    const { dispatch, dispatchMinutes, dispatchSeconds } = useMonitorStore.getState()
    expect(dispatch.armed).toBe(false)
    expect(dispatch.startedAt).toBeNull()
    expect(dispatch.countdownEndsAt).toBeNull()
    expect(dispatch.callerEvents).toEqual([])
    expect(dispatchMinutes).toBe(0)
    expect(dispatchSeconds).toBe(0)
  })

  it('first send arms the gate with an absolute countdown end from minutes + seconds', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    useMonitorStore.getState().setDispatchMinutes(5)
    useMonitorStore.getState().setDispatchSeconds(30)
    useMonitorStore.getState().send()

    const { dispatch } = useMonitorStore.getState()
    expect(dispatch.armed).toBe(true)
    expect(dispatch.runId).not.toBe('')
    expect(dispatch.startedAt).toBe(1_000_000)
    expect(dispatch.countdownEndsAt).toBe(1_000_000 + (5 * 60 + 30) * 1000)
  })

  it('creates a fresh dispatch run id after a full reset and re-arm', () => {
    useMonitorStore.getState().send()
    const firstRunId = useMonitorStore.getState().dispatch.runId

    useMonitorStore.getState().reset()
    useMonitorStore.getState().send()

    const secondRunId = useMonitorStore.getState().dispatch.runId
    expect(firstRunId).not.toBe('')
    expect(secondRunId).not.toBe('')
    expect(secondRunId).not.toBe(firstRunId)
  })

  it('clamps dispatch seconds to 0–59', () => {
    useMonitorStore.getState().setDispatchSeconds(90)
    expect(useMonitorStore.getState().dispatchSeconds).toBe(59)
    useMonitorStore.getState().setDispatchSeconds(-5)
    expect(useMonitorStore.getState().dispatchSeconds).toBe(0)
  })

  it('later sends do not re-arm or move the countdown', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    useMonitorStore.getState().setDispatchMinutes(5)
    useMonitorStore.getState().send()
    const firstEnd = useMonitorStore.getState().dispatch.countdownEndsAt
    const firstRunId = useMonitorStore.getState().dispatch.runId
    const firstStart = useMonitorStore.getState().dispatch.startedAt

    useMonitorStore.getState().setDispatchMinutes(99)
    useMonitorStore.getState().send()

    expect(useMonitorStore.getState().dispatch.countdownEndsAt).toBe(firstEnd)
    expect(useMonitorStore.getState().dispatch.runId).toBe(firstRunId)
    expect(useMonitorStore.getState().dispatch.startedAt).toBe(firstStart)
  })

  it('acknowledge/arrive/transport log once and append EST entries', () => {
    const s = useMonitorStore.getState()
    s.acknowledgeCall('14:05:11')
    s.acknowledgeCall('14:06:00') // ignored — already acknowledged
    s.arriveCall('14:10:14')
    s.transportCall('15:20:30')

    const { dispatch } = useMonitorStore.getState()
    expect(dispatch.acknowledgedAt).toBe('14:05:11')
    expect(dispatch.arrivedAt).toBe('14:10:14')
    expect(dispatch.transportedAt).toBe('15:20:30')
    expect(dispatch.callerEvents).toEqual([
      { name: 'Call - Acknowledge', time: '14:05:11' },
      { name: 'Call - Arrival', time: '14:10:14' },
      { name: 'Call - Transport', time: '15:20:30' },
    ])
  })

  it('reset clears the dispatch gate', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    useMonitorStore.getState().setDispatchMinutes(5)
    useMonitorStore.getState().send()
    useMonitorStore.getState().acknowledgeCall('14:05:11')

    useMonitorStore.getState().reset()

    const { dispatch, dispatchMinutes, dispatchSeconds } = useMonitorStore.getState()
    expect(dispatch.armed).toBe(false)
    expect(dispatch.runId).toBe('')
    expect(dispatch.startedAt).toBeNull()
    expect(dispatch.countdownEndsAt).toBeNull()
    expect(dispatch.acknowledgedAt).toBeNull()
    expect(dispatch.callerEvents).toEqual([])
    expect(dispatchMinutes).toBe(0)
    expect(dispatchSeconds).toBe(0)
  })
})

describe('persist migration', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    useMonitorStore.getState().reset()
    vi.restoreAllMocks()
  })

  it('migrates a version-2 payload without error and seeds patientInfo', async () => {
    // Persisted state from before patientInfo existed (version 2).
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        state: {
          confirmed: { ...DEFAULT_VITALS, hr: 137 },
          callerInfoConfirmed: { ...DEFAULT_CALLER_INFO, address: '5 Rue Test' },
        },
      }),
    )

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await useMonitorStore.persist.rehydrate()

    const migrationErrors = errorSpy.mock.calls.filter((args) =>
      String(args[0]).includes("couldn't be migrated"),
    )
    expect(migrationErrors).toHaveLength(0)

    const s = useMonitorStore.getState()
    expect(s.confirmed.hr).toBe(137) // preserved from the old payload
    expect(s.callerInfoConfirmed.address).toBe('5 Rue Test')
    expect(s.patientInfo).toEqual(DEFAULT_PATIENT_INFO) // seeded by merge
    expect(s.confirmedVitalsActive).toBe(false)
  })

  it('normalizes removed PEA rhythms in persisted vitals', async () => {
    const def = defaultsAsVitals()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        state: {
          draft: { ...def, rhythm: 'pea' },
          saved: { ...def, rhythm: 'pea' },
          confirmed: { ...def, rhythm: 'pea' },
        },
      }),
    )

    await useMonitorStore.persist.rehydrate()

    const s = useMonitorStore.getState()
    expect(s.draft.rhythm).toBe(DEFAULT_VITALS.rhythm)
    expect(s.saved.rhythm).toBe(DEFAULT_VITALS.rhythm)
    expect(s.confirmed.rhythm).toBe(DEFAULT_VITALS.rhythm)
  })

  it('preserves Anterior MI rhythms in persisted vitals', async () => {
    const def = defaultsAsVitals()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        state: {
          draft: { ...def, rhythm: 'anterior-mi' },
          saved: { ...def, rhythm: 'anterior-mi' },
          confirmed: { ...def, rhythm: 'anterior-mi' },
        },
      }),
    )

    await useMonitorStore.persist.rehydrate()

    const s = useMonitorStore.getState()
    expect(s.draft.rhythm).toBe('anterior-mi')
    expect(s.saved.rhythm).toBe('anterior-mi')
    expect(s.confirmed.rhythm).toBe('anterior-mi')
  })

  it('preserves Inferior MI rhythms in persisted vitals', async () => {
    const def = defaultsAsVitals()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        state: {
          draft: { ...def, rhythm: 'inferior-mi' },
          saved: { ...def, rhythm: 'inferior-mi' },
          confirmed: { ...def, rhythm: 'inferior-mi' },
        },
      }),
    )

    await useMonitorStore.persist.rehydrate()

    const s = useMonitorStore.getState()
    expect(s.draft.rhythm).toBe('inferior-mi')
    expect(s.saved.rhythm).toBe('inferior-mi')
    expect(s.confirmed.rhythm).toBe('inferior-mi')
  })

  it('seeds a default dispatch slice for a payload without one', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        state: { confirmed: { ...DEFAULT_VITALS, hr: 99 } },
      }),
    )

    await useMonitorStore.persist.rehydrate()

    const s = useMonitorStore.getState()
    expect(s.confirmed.hr).toBe(99)
    expect(s.dispatch).toEqual({
      runId: '',
      armed: false,
      startedAt: null,
      countdownEndsAt: null,
      acknowledgedAt: null,
      arrivedAt: null,
      transportedAt: null,
      callerEvents: [],
    })
    expect(s.dispatchMinutes).toBe(0)
    expect(s.dispatchSeconds).toBe(0)
  })

  it('seeds a legacy run id for an armed persisted dispatch without one', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 7,
        state: {
          dispatch: {
            armed: true,
            countdownEndsAt: 1_234_567,
            acknowledgedAt: '14:05:11',
            arrivedAt: '14:10:14',
            transportedAt: null,
            callerEvents: [],
          },
          dispatchMinutes: 5,
          dispatchSeconds: 0,
        },
      }),
    )

    await useMonitorStore.persist.rehydrate()

    const dispatch = useMonitorStore.getState().dispatch
    expect(dispatch.runId).toBe('legacy-1234567')
    expect(dispatch.startedAt).toBe(1_234_567 - 5 * 60_000)
  })
})

describe('fieldStatus + has* helpers', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('clean initially', () => {
    const s = useMonitorStore.getState()
    expect(fieldStatus('hr', s.draft, s.saved, s.confirmed)).toBe('clean')
    expect(
      vitalStatus(
        'hr',
        s.draft,
        s.saved,
        s.confirmed,
        s.draftVitalActive,
        s.savedVitalActive,
        s.confirmedVitalActive,
      ),
    ).toBe('clean')
    expect(hasDirty(s.draft, s.saved)).toBe(false)
    expect(hasVitalActiveDirty(s.draftVitalActive, s.savedVitalActive)).toBe(false)
    expect(hasPending(s.saved, s.confirmed)).toBe(false)
    expect(hasVitalActivePending(s.savedVitalActive, s.confirmedVitalActive)).toBe(false)
  })

  it('dirty after setDraft, pending after save, clean after send', () => {
    useMonitorStore.getState().setDraft('hr', 150)
    let s = useMonitorStore.getState()
    expect(fieldStatus('hr', s.draft, s.saved, s.confirmed)).toBe('dirty')
    expect(hasDirty(s.draft, s.saved)).toBe(true)
    expect(hasPending(s.saved, s.confirmed)).toBe(false)

    useMonitorStore.getState().save()
    s = useMonitorStore.getState()
    expect(fieldStatus('hr', s.draft, s.saved, s.confirmed)).toBe('pending')
    expect(hasDirty(s.draft, s.saved)).toBe(false)
    expect(hasPending(s.saved, s.confirmed)).toBe(true)

    useMonitorStore.getState().send()
    s = useMonitorStore.getState()
    expect(fieldStatus('hr', s.draft, s.saved, s.confirmed)).toBe('clean')
    expect(hasDirty(s.draft, s.saved)).toBe(false)
    expect(hasPending(s.saved, s.confirmed)).toBe(false)
  })

  it('tracks active-state dirty and pending changes', () => {
    useMonitorStore.getState().setDraftVitalActive('spo2', true)
    let s = useMonitorStore.getState()
    expect(
      vitalStatus(
        'spo2',
        s.draft,
        s.saved,
        s.confirmed,
        s.draftVitalActive,
        s.savedVitalActive,
        s.confirmedVitalActive,
      ),
    ).toBe('dirty')
    expect(hasVitalActiveDirty(s.draftVitalActive, s.savedVitalActive)).toBe(true)

    useMonitorStore.getState().save()
    s = useMonitorStore.getState()
    expect(
      vitalStatus(
        'spo2',
        s.draft,
        s.saved,
        s.confirmed,
        s.draftVitalActive,
        s.savedVitalActive,
        s.confirmedVitalActive,
      ),
    ).toBe('pending')
    expect(hasVitalActivePending(s.savedVitalActive, s.confirmedVitalActive)).toBe(true)
  })
})
