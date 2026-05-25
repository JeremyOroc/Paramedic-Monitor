import { describe, it, expect, beforeEach } from 'vitest'
import { useMonitorStore } from '../monitorStore'
import { fieldStatus, hasDirty, hasPending } from '../fieldState'
import { DEFAULT_VITALS } from '@/types/vitals'
import { DEFAULT_CALLER_INFO } from '@/types/callerInfo'

const defaultsAsVitals = () => ({
  hr: DEFAULT_VITALS.hr,
  bp_sys: DEFAULT_VITALS.bp_sys,
  bp_dia: DEFAULT_VITALS.bp_dia,
  etco2: DEFAULT_VITALS.etco2,
  spo2: DEFAULT_VITALS.spo2,
  rhythm: DEFAULT_VITALS.rhythm,
  spo2_waveform: DEFAULT_VITALS.spo2_waveform,
  etco2_waveform: DEFAULT_VITALS.etco2_waveform,
})

describe('monitorStore', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('initial state has draft = saved = confirmed = DEFAULT_VITALS', () => {
    const s = useMonitorStore.getState()
    const def = defaultsAsVitals()
    expect(s.draft).toEqual(def)
    expect(s.saved).toEqual(def)
    expect(s.confirmed).toEqual(def)
    expect(s.callerInfoDraft).toEqual(DEFAULT_CALLER_INFO)
    expect(s.callerInfoSaved).toEqual(DEFAULT_CALLER_INFO)
    expect(s.callerInfoConfirmed).toEqual(DEFAULT_CALLER_INFO)
  })

  it('setDraft updates only draft', () => {
    useMonitorStore.getState().setDraft('hr', 160)
    const s = useMonitorStore.getState()
    expect(s.draft.hr).toBe(160)
    expect(s.saved.hr).toBe(DEFAULT_VITALS.hr)
    expect(s.confirmed.hr).toBe(DEFAULT_VITALS.hr)
  })

  it('save copies draft to saved without touching confirmed', () => {
    useMonitorStore.getState().setDraft('hr', 160)
    useMonitorStore.getState().save()
    const s = useMonitorStore.getState()
    expect(s.saved.hr).toBe(160)
    expect(s.confirmed.hr).toBe(DEFAULT_VITALS.hr)
  })

  it('send copies saved to confirmed', () => {
    useMonitorStore.getState().setDraft('hr', 160)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.hr).toBe(160)
  })

  it('reset returns all three slices to defaults', () => {
    useMonitorStore.getState().setDraft('hr', 200)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    useMonitorStore.getState().reset()
    const s = useMonitorStore.getState()
    const def = defaultsAsVitals()
    expect(s.draft).toEqual(def)
    expect(s.saved).toEqual(def)
    expect(s.confirmed).toEqual(def)
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
    expect(s.saved.hr).toBe(180)
    expect(s.confirmed.hr).toBe(180)
  })

  it('rhythm flows through the same draft → save → send pipeline', () => {
    useMonitorStore.getState().setDraft('rhythm', 'vf')
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('nsr')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('vf')
  })

  it('spo2_waveform defaults to normal and flows through save → send', () => {
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('normal')
    useMonitorStore.getState().setDraft('spo2_waveform', 'weak')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('weak')
  })

  it('etco2_waveform defaults to normal and flows through save → send', () => {
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('normal')
    useMonitorStore.getState().setDraft('etco2_waveform', 'obstructed')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('obstructed')
  })
})

describe('fieldStatus + has* helpers', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('clean initially', () => {
    const s = useMonitorStore.getState()
    expect(fieldStatus('hr', s.draft, s.saved, s.confirmed)).toBe('clean')
    expect(hasDirty(s.draft, s.saved)).toBe(false)
    expect(hasPending(s.saved, s.confirmed)).toBe(false)
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
})
