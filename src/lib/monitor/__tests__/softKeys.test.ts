import { describe, it, expect, vi } from 'vitest'
import { MED_PAGES, NEXT_MED_PAGE } from '../medications'
import {
  buildMainSoftKeys,
  buildMedicationSoftKeys,
  buildTwelveLeadSoftKeys,
} from '../softKeys'

function noop() {}

const mainActions = {
  onTwelveLead: noop,
  onToggleEtco2: noop,
  onTreatment: noop,
  onLeftAnalyse: noop,
  onPrint: noop,
  onBack: noop,
}

describe('medication pages', () => {
  it('cycles 1 → 2 → 3 → 1', () => {
    expect(NEXT_MED_PAGE[1]).toBe(2)
    expect(NEXT_MED_PAGE[2]).toBe(3)
    expect(NEXT_MED_PAGE[3]).toBe(1)
  })

  it('has four medications per page', () => {
    expect(MED_PAGES[1]).toHaveLength(4)
    expect(MED_PAGES[2]).toHaveLength(4)
    expect(MED_PAGES[3]).toHaveLength(4)
  })
})

describe('buildMainSoftKeys', () => {
  it('returns 7 keys with an inert brightness slot and a wired Back', () => {
    const keys = buildMainSoftKeys(mainActions)
    expect(keys.map((k) => k.id)).toEqual([
      'brightness', '12lead', 'etco2', 'treatment', 'analyse', 'printer', 'back',
    ])
    expect(keys[0].onClick).toBeUndefined()
    expect(keys[6].ariaLabel).toBe('Back')
    expect(keys[6].onClick).toBeTypeOf('function')
  })

  it('wires each action to the matching slot', () => {
    const onTwelveLead = vi.fn()
    const onPrint = vi.fn()
    const keys = buildMainSoftKeys({ ...mainActions, onTwelveLead, onPrint })
    keys.find((k) => k.id === '12lead')?.onClick?.()
    keys.find((k) => k.id === 'printer')?.onClick?.()
    expect(onTwelveLead).toHaveBeenCalledTimes(1)
    expect(onPrint).toHaveBeenCalledTimes(1)
  })
})

describe('buildTwelveLeadSoftKeys', () => {
  it('gates the transmission key on a completed capture', () => {
    const onTransmitTwelveLead = vi.fn()
    const keys = buildTwelveLeadSoftKeys({
      onCaptureTwelveLead: noop,
      onPatientInfo: noop,
      onTransmitTwelveLead,
      onBack: noop,
      transmissionReady: false,
      transmissionOpen: false,
    })
    expect(keys.map((k) => k.id)).toEqual([
      'capture', 'patient-info', 'twelve-lead-transmission', 'slot4', 'slot5', 'slot6', 'back',
    ])
    expect(keys[0].onClick).toBeTypeOf('function')
    expect(keys[1].onClick).toBeTypeOf('function')
    expect(keys[2].onClick).toBeUndefined()
    for (const id of ['slot4', 'slot5', 'slot6']) {
      expect(keys.find((k) => k.id === id)?.onClick).toBeUndefined()
    }

    const readyKeys = buildTwelveLeadSoftKeys({
      onCaptureTwelveLead: noop,
      onPatientInfo: noop,
      onTransmitTwelveLead,
      onBack: noop,
      transmissionReady: true,
      transmissionOpen: true,
    })
    readyKeys[2].onClick?.()
    expect(onTransmitTwelveLead).toHaveBeenCalledTimes(1)
    expect(readyKeys[2].active).toBe(true)
  })
})

describe('buildMedicationSoftKeys', () => {
  it('labels keys from the current page and dispatches the right medication', () => {
    const onMedClick = vi.fn()
    const keys = buildMedicationSoftKeys(2, {
      onMedClick,
      onMedInfo: noop,
      onMedPageChange: noop,
      onMedBack: noop,
    })
    expect(keys[0].ariaLabel).toBe(`Administer ${MED_PAGES[2][0]}`)
    keys[0].onClick?.()
    expect(onMedClick).toHaveBeenCalledWith(MED_PAGES[2][0])
    expect(keys.map((k) => k.id)).toEqual([
      'med1', 'med2', 'med3', 'med4', 'med-info', 'med-page', 'med-back',
    ])
  })
})
