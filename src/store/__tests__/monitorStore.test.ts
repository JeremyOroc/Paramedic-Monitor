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
  })

  it('setDraft updates only draft', () => {
    useMonitorStore.getState().setDraft('hr', 160)
    const s = useMonitorStore.getState()
    expect(s.draft.hr).toBe(160)
    expect(s.draftVitalActive.hr).toBe(true)
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

  it('numeric vitals stay inactive until a vitals edit is saved and sent', () => {
    expect(useMonitorStore.getState().confirmedVitalsActive).toBe(false)

    useMonitorStore.getState().setDraft('hr', 160)
    expect(useMonitorStore.getState().draftVitalActive.hr).toBe(true)
    expect(useMonitorStore.getState().draftVitalsActive).toBe(true)
    expect(useMonitorStore.getState().confirmedVitalsActive).toBe(false)

    useMonitorStore.getState().save()
    expect(useMonitorStore.getState().savedVitalsActive).toBe(true)
    expect(useMonitorStore.getState().confirmedVitalsActive).toBe(false)

    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmedVitalActive.hr).toBe(true)
    expect(useMonitorStore.getState().confirmedVitalsActive).toBe(true)
    expect(useMonitorStore.getState().confirmed.hr).toBe(160)
  })

  it('SpO2 and EtCO2 numeric edits stage their matching graph connection state', () => {
    useMonitorStore.getState().setDraft('spo2', 98)
    useMonitorStore.getState().setDraft('etco2', 35)

    let s = useMonitorStore.getState()
    expect(s.draft.spo2).toBe(98)
    expect(s.draftVitalActive.spo2).toBe(true)
    expect(s.draft.spo2_waveform).toBe('normal')
    expect(s.draft.etco2).toBe(35)
    expect(s.draftVitalActive.etco2).toBe(true)
    expect(s.draft.etco2_waveform).toBe('normal')
    expect(s.saved.spo2_waveform).toBe('off')
    expect(s.confirmed.etco2_waveform).toBe('off')

    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    s = useMonitorStore.getState()
    expect(s.confirmed.spo2).toBe(98)
    expect(s.confirmed.spo2_waveform).toBe('normal')
    expect(s.confirmed.etco2).toBe(35)
    expect(s.confirmed.etco2_waveform).toBe('normal')
  })

  it('typed zero still stages SpO2 and EtCO2 graphs as connected', () => {
    useMonitorStore.getState().setDraft('spo2', 0)
    useMonitorStore.getState().setDraft('etco2', 0)

    const s = useMonitorStore.getState()
    expect(s.draftVitalActive.spo2).toBe(true)
    expect(s.draft.spo2_waveform).toBe('normal')
    expect(s.draftVitalActive.etco2).toBe(true)
    expect(s.draft.etco2_waveform).toBe('normal')
  })

  it('HR and BP numeric edits do not change SpO2 or EtCO2 graph state', () => {
    useMonitorStore.getState().setDraft('hr', 80)
    useMonitorStore.getState().setDraft('bp_sys', 120)
    useMonitorStore.getState().setDraft('bp_dia', 80)

    const s = useMonitorStore.getState()
    expect(s.draftVitalActive.hr).toBe(true)
    expect(s.draftVitalActive.bp_sys).toBe(true)
    expect(s.draftVitalActive.bp_dia).toBe(true)
    expect(s.draft.spo2_waveform).toBe('off')
    expect(s.draft.etco2_waveform).toBe('off')
  })

  it('can turn a stored zero vital on and off independently', () => {
    useMonitorStore.getState().setDraft('hr', 0)
    expect(useMonitorStore.getState().draftVitalActive.hr).toBe(true)
    useMonitorStore.getState().setDraftVitalActive('hr', false)
    expect(useMonitorStore.getState().draft.hr).toBe(0)
    expect(useMonitorStore.getState().draftVitalActive.hr).toBe(false)
    expect(useMonitorStore.getState().draftVitalsActive).toBe(false)

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
    useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    useMonitorStore.getState().setDispatchMinutes(5)
    useMonitorStore.getState().send()

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
    expect(s.callerInfoConfirmed.address).toBe('123 Rue Principale')
    expect(s.dispatch.armed).toBe(true)
  })

  it('rhythm flows through the same draft → save → send pipeline', () => {
    useMonitorStore.getState().setDraft('rhythm', 'vf')
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('off')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('vf')
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
