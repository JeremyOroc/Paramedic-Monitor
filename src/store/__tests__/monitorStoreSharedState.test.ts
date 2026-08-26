import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_DISPATCH,
  useMonitorStore,
  type DispatchState,
  type SharedMonitorState,
  type Vitals,
} from '../monitorStore'
import { DEFAULT_CALLER_INFO } from '@/types/callerInfo'
import { DEFAULT_DISPATCH_ROUTE } from '@/types/dispatchRoute'

const sharedVitals = (): Vitals => ({
  hr: 80,
  bp_sys: 120,
  bp_dia: 80,
  etco2: 35,
  spo2: 98,
  rhythm: 'nsr',
  spo2_waveform: 'normal',
  etco2_waveform: 'normal',
})

const allActive = {
  hr: true,
  bp_sys: true,
  bp_dia: true,
  etco2: true,
  spo2: true,
}

const armedDispatch = (runId: string): DispatchState => ({
  runId,
  armed: true,
  startedAt: 1_000,
  countdownEndsAt: 61_000,
  acknowledgedAt: null,
  arrivedAt: null,
  transportedAt: null,
  callerEvents: [],
})

function makeShared(overrides: Partial<SharedMonitorState> = {}): SharedMonitorState {
  return {
    defibrillatorModelConfirmed: 'wagamiX',
    confirmed: sharedVitals(),
    confirmedVitalActive: { ...allActive },
    callerInfoConfirmed: { ...DEFAULT_CALLER_INFO },
    dispatchRouteConfirmed: { ...DEFAULT_DISPATCH_ROUTE },
    dispatch: { ...DEFAULT_DISPATCH },
    dispatchConfirmedSeconds: 60,
    cprMode: 'off',
    cprOverrideActive: false,
    monitorResetVersion: useMonitorStore.getState().monitorResetVersion,
    ...overrides,
  }
}

describe('monitorStore shared session state', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('getSharedState excludes trainee-local progress fields', () => {
    const shared = useMonitorStore.getState().getSharedState()
    expect(shared).not.toHaveProperty('patientInfo')
    expect(shared).not.toHaveProperty('etco2CalibrationStatus')
    expect(shared).not.toHaveProperty('acceptedBp')
    expect(shared).not.toHaveProperty('acceptedBpActive')
    expect(shared.monitorResetVersion).toBe(
      useMonitorStore.getState().monitorResetVersion,
    )
    expect(shared.cprMode).toBe('off')
    expect(shared.cprOverrideActive).toBe(false)
    expect(shared.defibrillatorModelConfirmed).toBe('wagamiX')
  })

  it('keeps trainee dispatch progress when the same run is re-applied', () => {
    const s = useMonitorStore.getState()
    s.applySharedState(makeShared({ dispatch: armedDispatch('run-1') }))
    useMonitorStore.getState().acknowledgeCall('10:00:00')
    useMonitorStore.getState().arriveCall('10:01:00')

    useMonitorStore
      .getState()
      .applySharedState(makeShared({ dispatch: armedDispatch('run-1') }))

    const dispatch = useMonitorStore.getState().dispatch
    expect(dispatch.acknowledgedAt).toBe('10:00:00')
    expect(dispatch.arrivedAt).toBe('10:01:00')
    expect(dispatch.callerEvents).toHaveLength(2)
  })

  it('clears Acknowledge/Arrival but keeps Transport and events on a new run', () => {
    const s = useMonitorStore.getState()
    s.applySharedState(makeShared({ dispatch: armedDispatch('run-1') }))
    useMonitorStore.getState().acknowledgeCall('10:00:00')
    useMonitorStore.getState().arriveCall('10:01:00')
    useMonitorStore.getState().transportCall('10:05:00')

    useMonitorStore
      .getState()
      .applySharedState(makeShared({ dispatch: armedDispatch('run-2') }))

    const dispatch = useMonitorStore.getState().dispatch
    expect(dispatch.runId).toBe('run-2')
    expect(dispatch.acknowledgedAt).toBeNull()
    expect(dispatch.arrivedAt).toBeNull()
    expect(dispatch.transportedAt).toBe('10:05:00')
    expect(dispatch.callerEvents).toHaveLength(3)
  })

  it('clears all dispatch progress when the gate disarms (full reset)', () => {
    const s = useMonitorStore.getState()
    s.applySharedState(makeShared({ dispatch: armedDispatch('run-1') }))
    useMonitorStore.getState().acknowledgeCall('10:00:00')

    useMonitorStore.getState().applySharedState(makeShared())

    expect(useMonitorStore.getState().dispatch).toEqual(DEFAULT_DISPATCH)
  })

  it('leaves patient info, EtCO2 calibration, and accepted BP untouched', () => {
    const s = useMonitorStore.getState()
    s.setPatientAge(63)
    s.setPatientSex('F')
    s.startEtco2Calibration()
    s.completeEtco2Calibration()
    s.acceptBpReading(
      { bp_sys: 130, bp_dia: 85 },
      { bp_sys: true, bp_dia: true },
    )

    useMonitorStore.getState().applySharedState(makeShared())

    const after = useMonitorStore.getState()
    expect(after.patientInfo.age).toBe(63)
    expect(after.patientInfo.sex).toBe('F')
    expect(after.etco2CalibrationStatus).toBe('calibrated')
    expect(after.acceptedBp).toEqual({ bp_sys: 130, bp_dia: 85 })
    expect(after.acceptedBpActive).toEqual({ bp_sys: true, bp_dia: true })
  })

  it('resets trainee-local reading layers when the instructor reset version changes', () => {
    const s = useMonitorStore.getState()
    s.startEtco2Calibration()
    s.completeEtco2Calibration()
    s.acceptBpReading(
      { bp_sys: 130, bp_dia: 85 },
      { bp_sys: true, bp_dia: true },
    )
    const nextVersion = useMonitorStore.getState().monitorResetVersion + 1

    useMonitorStore
      .getState()
      .applySharedState(makeShared({ monitorResetVersion: nextVersion }))

    const after = useMonitorStore.getState()
    expect(after.monitorResetVersion).toBe(nextVersion)
    expect(after.etco2CalibrationStatus).toBe('idle')
    expect(after.acceptedBp).toEqual({ bp_sys: 0, bp_dia: 0 })
    expect(after.acceptedBpActive).toEqual({ bp_sys: false, bp_dia: false })
  })

  it('applies the instructor CPR mode and other authoritative fields', () => {
    useMonitorStore.getState().applySharedState(
      makeShared({ cprMode: 'weak', cprOverrideActive: true }),
    )

    const after = useMonitorStore.getState()
    expect(after.confirmed).toEqual(sharedVitals())
    expect(after.confirmedVitalActive).toEqual(allActive)
    expect(after.dispatchConfirmedSeconds).toBe(60)
    expect(after.cprMode).toBe('weak')
  })

  it('applies the confirmed defibrillator model and defaults missing legacy values', () => {
    useMonitorStore.getState().applySharedState(
      makeShared({ defibrillatorModelConfirmed: 'wagamiZ' }),
    )
    expect(useMonitorStore.getState().defibrillatorModelConfirmed).toBe('wagamiZ')

    const legacy: Partial<SharedMonitorState> = makeShared()
    delete legacy.defibrillatorModelConfirmed
    useMonitorStore.getState().applySharedState(legacy)
    expect(useMonitorStore.getState().defibrillatorModelConfirmed).toBe('wagamiX')
  })

  it('maps a legacy active CPR snapshot to Regular CPR', () => {
    const legacy = makeShared({ cprOverrideActive: true })
    delete legacy.cprMode

    useMonitorStore.getState().applySharedState(legacy)

    expect(useMonitorStore.getState().cprMode).toBe('regular')
  })
})
