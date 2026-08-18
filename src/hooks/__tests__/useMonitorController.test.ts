import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PatientInfo, PatientSex } from '@/types/patientInfo'
import type { Vitals } from '@/store/monitorStore'

import { ACQUIRE_MS, useMonitorController } from '../useMonitorController'

vi.mock('@/lib/audio', () => ({
  setAudioMuted: vi.fn(),
}))

const confirmed: Vitals = {
  hr: 80,
  bp_sys: 120,
  bp_dia: 80,
  etco2: 35,
  spo2: 98,
  rhythm: 'nsr',
  spo2_waveform: 'normal',
  etco2_waveform: 'normal',
}

const patientInfo: PatientInfo = {
  age: 40,
  sex: 'M',
}

function setup(overrides: Partial<{
  confirmed: Vitals
  patientInfo: PatientInfo
  setPatientAge: (age: number) => void
  setPatientSex: (sex: PatientSex) => void
  initialPoweredOn: boolean
  callerEventCount: number
}> = {}) {
  const setPatientAge = overrides.setPatientAge ?? vi.fn()
  const setPatientSex = overrides.setPatientSex ?? vi.fn()
  const rendered = renderHook(() =>
    useMonitorController({
      confirmed: overrides.confirmed ?? confirmed,
      patientInfo: overrides.patientInfo ?? patientInfo,
      setPatientAge,
      setPatientSex,
      initialPoweredOn: overrides.initialPoweredOn,
      callerEventCount: overrides.callerEventCount,
    }),
  )
  return { ...rendered, setPatientAge, setPatientSex }
}

describe('useMonitorController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in the main monitor state', () => {
    const { result } = setup()

    expect(result.current.view).toBe('main')
    expect(result.current.secondary).toBe('spo2')
    expect(result.current.activeSelectedControl).toBe('dateTime')
    expect(result.current.captureState).toBe('idle')
    expect(result.current.captureLock).toBe(false)
    expect(result.current.lastCapture).toBeNull()
    expect(result.current.eventLogPage).toBe(1)
    expect(result.current.eventLogHighlightedButton).toBe('exit')
    expect(result.current.vitalLogOpen).toBe(false)
    expect(result.current.vitalLogPage).toBe(1)
    expect(result.current.vitalLogHighlightedButton).toBe('exit')

    act(() => result.current.onPrint())
    expect(result.current.printPreviewOpen).toBe(false)
  })

  it('resets the selected secondary graph back to SpO2', () => {
    const { result } = setup()

    act(() => result.current.onToggleEtco2())
    expect(result.current.secondary).toBe('etco2')

    act(() => result.current.onResetMonitorUi())
    expect(result.current.secondary).toBe('spo2')
  })

  it('cycles to the bottom status toggle and toggles it on Enter', () => {
    const { result } = setup()

    act(() => result.current.onMoveDown())
    expect(result.current.activeSelectedControl).toBe('bottomStatusToggle')

    act(() => result.current.onEnter())
    expect(result.current.bottomStatusVisible).toBe(false)
    expect(result.current.activeSelectedControl).toBe('bottomStatusToggle')
  })

  it('does not activate a jumpscare when battery is selected on Enter', () => {
    const { result } = setup()

    act(() => result.current.onMoveUp())
    act(() => result.current.onMoveUp())
    act(() => result.current.onMoveUp())
    expect(result.current.activeSelectedControl).toBe('battery')

    act(() => result.current.onEnter())

    expect(result.current.jumpscareActive).toBe(false)
  })

  it('edits patient info through a draft and commits on Enter', () => {
    const { result, setPatientAge, setPatientSex } = setup()

    act(() => result.current.onPatientInfo())
    expect(result.current.patientInfoOpen).toBe(true)
    expect(result.current.selectedField).toBe('age')

    act(() => result.current.onEnter())
    act(() => result.current.onMoveUp())
    act(() => result.current.onMoveUp())
    expect(result.current.displayAge).toBe(42)
    expect(setPatientAge).not.toHaveBeenCalled()

    act(() => result.current.onEnter())
    expect(setPatientAge).toHaveBeenCalledWith(42)

    act(() => result.current.onMoveDown())
    act(() => result.current.onEnter())
    act(() => result.current.onMoveUp())
    expect(result.current.displaySex).toBe('F')

    act(() => result.current.onEnter())
    expect(setPatientSex).toHaveBeenCalledWith('F')
  })

  it('cancels a patient info edit with Back without closing the panel', () => {
    const { result, setPatientAge } = setup()

    act(() => result.current.onPatientInfo())
    act(() => result.current.onEnter())
    act(() => result.current.onMoveDown())
    expect(result.current.displayAge).toBe(39)

    act(() => result.current.onBack())
    expect(result.current.patientInfoOpen).toBe(true)
    expect(result.current.editing).toBe(false)
    expect(result.current.displayAge).toBe(40)
    expect(setPatientAge).not.toHaveBeenCalled()
  })

  it('cycles Patient Info in both directions and exits back to live 12-lead', () => {
    const { result } = setup()

    act(() => result.current.onTwelveLead())
    act(() => result.current.onPatientInfo())

    act(() => result.current.onMoveDown())
    expect(result.current.selectedField).toBe('sex')
    act(() => result.current.onMoveDown())
    expect(result.current.selectedField).toBe('exit')
    act(() => result.current.onMoveDown())
    expect(result.current.selectedField).toBe('age')

    act(() => result.current.onMoveUp())
    expect(result.current.selectedField).toBe('exit')
    act(() => result.current.onEnter())

    expect(result.current.patientInfoOpen).toBe(false)
    expect(result.current.isTwelveLead).toBe(true)
  })

  it('captures a 12-lead after the acquire timer completes', () => {
    const { result } = setup({
      confirmed: { ...confirmed, hr: 72, rhythm: 'torsades' },
    })

    act(() => result.current.onTwelveLead())
    act(() => result.current.onCaptureTwelveLead())

    expect(result.current.captureState).toBe('acquiring')
    expect(result.current.captureLock).toBe(true)
    expect(result.current.capturedRhythm).toBe('torsades')
    expect(result.current.capturedHr).toBe(72)
    expect(result.current.lastCapture).toBeNull()

    act(() => vi.advanceTimersByTime(4000))

    expect(result.current.captureState).toBe('result')
    expect(result.current.lastCapture).toEqual({ rhythm: 'torsades', hr: 72 })
  })

  it('cancels an acquiring capture without saving a late result', () => {
    const { result } = setup()

    act(() => result.current.onTwelveLead())
    act(() => result.current.onCaptureTwelveLead())
    act(() => vi.advanceTimersByTime(2000))
    act(() => result.current.onBack())

    expect(result.current.captureState).toBe('idle')

    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.lastCapture).toBeNull()
  })

  it('applies Back precedence across modal, edit, capture, print, and view state', () => {
    const { result } = setup()

    act(() => result.current.onMoveUp())
    act(() => result.current.onEnter())
    expect(result.current.patientModalOpen).toBe(true)
    act(() => result.current.onBack())
    expect(result.current.patientModalOpen).toBe(false)

    act(() => result.current.onTwelveLead())
    act(() => result.current.onPatientInfo())
    act(() => result.current.onEnter())
    act(() => result.current.onBack())
    expect(result.current.patientInfoOpen).toBe(true)
    expect(result.current.editing).toBe(false)

    act(() => result.current.onBack())
    expect(result.current.patientInfoOpen).toBe(false)
    expect(result.current.isTwelveLead).toBe(true)

    act(() => result.current.onCaptureTwelveLead())
    act(() => vi.advanceTimersByTime(4000))
    act(() => result.current.onBack())
    expect(result.current.captureState).toBe('idle')
    expect(result.current.isTwelveLead).toBe(true)

    act(() => result.current.onBack())
    expect(result.current.isTwelveLead).toBe(false)

    act(() => result.current.onPrint())
    expect(result.current.printPreviewOpen).toBe(true)
    act(() => result.current.onBack())
    expect(result.current.printPreviewOpen).toBe(false)
  })

  it('power-off cleanup resets transient monitor UI state', () => {
    const { result } = setup()

    act(() => result.current.onTwelveLead())
    act(() => result.current.onCaptureTwelveLead())
    act(() => vi.advanceTimersByTime(4000))
    act(() => result.current.onBack())
    act(() => result.current.onBack())
    act(() => result.current.onPrint())
    act(() => result.current.onTreatment())
    act(() => result.current.onMedClick('O2', '00:10'))
    act(() => result.current.onLeftAnalyse())
    act(() => result.current.onMoveDown())
    act(() => result.current.onEnter())
    act(() => result.current.onToggleMute())

    expect(result.current.printPreviewOpen).toBe(true)
    expect(result.current.medicationMode).toBe(true)
    expect(result.current.eventLog).toHaveLength(1)
    expect(result.current.isMuted).toBe(true)

    act(() => result.current.onPowerOff())

    expect(result.current.isTimerRunning).toBe(false)
    expect(result.current.isPoweredOn).toBe(false)
    expect(result.current.isMuted).toBe(false)
    expect(result.current.eventLog).toEqual([])
    expect(result.current.lastCapture).toBeNull()
    expect(result.current.printPreviewOpen).toBe(false)
    expect(result.current.medicationMode).toBe(false)
    expect(result.current.callerInfoOpen).toBe(false)
    expect(result.current.selectedControl).toBe('dateTime')
    expect(result.current.bottomStatusVisible).toBe(true)
  })

  it('closes the caller info panel on Back', () => {
    const { result } = setup()

    act(() => result.current.onLeftAnalyse())
    expect(result.current.callerInfoOpen).toBe(true)

    act(() => result.current.onBack())
    expect(result.current.callerInfoOpen).toBe(false)
  })

  it('starts powered-off when initialPoweredOn is false', () => {
    const { result } = setup({ initialPoweredOn: false })

    expect(result.current.isPoweredOn).toBe(false)
    expect(result.current.isTimerRunning).toBe(false)

    act(() => result.current.onPowerOn())
    expect(result.current.isPoweredOn).toBe(true)
    expect(result.current.isTimerRunning).toBe(true)
  })

  it('closes the medication event log on Back before exiting medication mode', () => {
    const { result } = setup()

    act(() => result.current.onTreatment())
    expect(result.current.medicationMode).toBe(true)

    act(() => result.current.onMedInfo())
    expect(result.current.eventLogOpen).toBe(true)

    // First Back closes the log but stays in medication mode.
    act(() => result.current.onMedBack())
    expect(result.current.eventLogOpen).toBe(false)
    expect(result.current.medicationMode).toBe(true)

    const before = result.current.selectedControl
    act(() => result.current.onMoveUp())
    expect(result.current.selectedControl).not.toBe(before)

    // Second Back exits medication mode.
    act(() => result.current.onMedBack())
    expect(result.current.medicationMode).toBe(false)
  })

  it('clears medication history and timestamps on a drill reset', () => {
    const { result } = setup()

    act(() => result.current.onTreatment())
    act(() => result.current.onMedClick('Epinephrine', '10:00:00'))
    act(() => result.current.onAnalyzeResult('shock', '10:01:00'))
    expect(result.current.eventLog).toHaveLength(2)

    act(() => result.current.onResetMonitorUi())

    expect(result.current.eventLog).toEqual([])
    expect(result.current.medicationMode).toBe(false)
    expect(result.current.medicationPage).toBe(1)
    expect(result.current.eventLogOpen).toBe(false)
  })

  it('clears a captured 12-lead and open menus on a drill reset', () => {
    const { result } = setup()

    act(() => result.current.onTwelveLead())
    act(() => result.current.onCaptureTwelveLead())
    act(() => vi.advanceTimersByTime(20000))
    expect(result.current.lastCapture).not.toBeNull()

    act(() => result.current.onResetMonitorUi())

    expect(result.current.lastCapture).toBeNull()
    expect(result.current.captureState).toBe('idle')
    expect(result.current.printPreviewOpen).toBe(false)
    expect(result.current.view).toBe('main')
    expect(result.current.selectedControl).toBe('dateTime')
  })

  it('keeps power and mute across a drill reset', () => {
    const { result } = setup()

    act(() => result.current.onToggleMute())
    const { isPoweredOn, isMuted, isTimerRunning } = result.current

    act(() => result.current.onResetMonitorUi())

    expect(result.current.isPoweredOn).toBe(isPoweredOn)
    expect(result.current.isMuted).toBe(isMuted)
    expect(result.current.isTimerRunning).toBe(isTimerRunning)
  })

  it('nav still moves the background selection when nothing is open', () => {
    const { result } = setup()

    const before = result.current.selectedControl
    act(() => result.current.onMoveUp())
    expect(result.current.selectedControl).not.toBe(before)
  })

  it('opens Vital Log from Home and closes it with Back without changing the background', () => {
    const { result } = setup()

    act(() => result.current.onTreatment())
    const before = result.current.selectedControl
    act(() => result.current.onHome())

    expect(result.current.vitalLogOpen).toBe(true)
    expect(result.current.vitalLogPage).toBe(1)
    expect(result.current.vitalLogHighlightedButton).toBe('exit')

    act(() => result.current.onBack())

    expect(result.current.vitalLogOpen).toBe(false)
    expect(result.current.medicationMode).toBe(true)
    expect(result.current.selectedControl).toBe(before)
  })

  it('toggles Vital Log closed with Home and resets navigation when reopened', () => {
    const { result } = setup()

    act(() => result.current.onTreatment())
    const before = result.current.selectedControl
    act(() => result.current.onHome())
    act(() => result.current.onMoveUp(true))
    act(() => result.current.onEnter(2))
    expect(result.current.vitalLogPage).toBe(2)
    expect(result.current.vitalLogHighlightedButton).toBe('next')

    act(() => result.current.onHome())
    expect(result.current.vitalLogOpen).toBe(false)
    expect(result.current.medicationMode).toBe(true)
    expect(result.current.selectedControl).toBe(before)

    act(() => result.current.onHome())
    expect(result.current.vitalLogOpen).toBe(true)
    expect(result.current.vitalLogPage).toBe(1)
    expect(result.current.vitalLogHighlightedButton).toBe('exit')
  })

  it('uses cyclic Exit, Prev, and Next navigation for a paginated Vital Log', () => {
    const { result } = setup()

    act(() => result.current.onHome())
    act(() => result.current.onMoveUp(true))
    expect(result.current.vitalLogHighlightedButton).toBe('next')

    act(() => result.current.onEnter(2))
    expect(result.current.vitalLogPage).toBe(2)
    act(() => result.current.onEnter(2))
    expect(result.current.vitalLogPage).toBe(2)

    act(() => result.current.onMoveDown(true))
    expect(result.current.vitalLogHighlightedButton).toBe('exit')
    act(() => result.current.onMoveDown(true))
    expect(result.current.vitalLogHighlightedButton).toBe('prev')
    act(() => result.current.onEnter(2))
    expect(result.current.vitalLogPage).toBe(1)
    act(() => result.current.onEnter(2))
    expect(result.current.vitalLogPage).toBe(1)

    act(() => result.current.onMoveUp(true))
    expect(result.current.vitalLogHighlightedButton).toBe('exit')
    act(() => result.current.onEnter(2))
    expect(result.current.vitalLogOpen).toBe(false)
  })

  it('keeps single-page Vital Log navigation on Exit', () => {
    const { result } = setup()

    act(() => result.current.onHome())
    act(() => result.current.onMoveDown(false))
    act(() => result.current.onMoveUp(false))
    expect(result.current.vitalLogHighlightedButton).toBe('exit')

    act(() => result.current.onEnter(1))
    expect(result.current.vitalLogOpen).toBe(false)
  })

  it('makes Vital Log mutually exclusive with existing modal flows', () => {
    const { result } = setup()

    act(() => result.current.onPatientInfo())
    act(() => result.current.onHome())
    expect(result.current.patientInfoOpen).toBe(true)
    expect(result.current.vitalLogOpen).toBe(false)
    act(() => result.current.onBack())

    act(() => result.current.onLeftAnalyse())
    act(() => result.current.onHome())
    expect(result.current.callerInfoOpen).toBe(true)
    expect(result.current.vitalLogOpen).toBe(false)
    act(() => result.current.onBack())

    act(() => result.current.onTreatment())
    act(() => result.current.onMedInfo())
    act(() => result.current.onHome())
    expect(result.current.eventLogOpen).toBe(true)
    expect(result.current.vitalLogOpen).toBe(false)
    act(() => result.current.onMedBack())

    act(() => result.current.onHome())
    act(() => result.current.onPatientInfo())
    act(() => result.current.onLeftAnalyse())
    act(() => result.current.onMedInfo())
    expect(result.current.vitalLogOpen).toBe(true)
    expect(result.current.patientInfoOpen).toBe(false)
    expect(result.current.callerInfoOpen).toBe(false)
    expect(result.current.eventLogOpen).toBe(false)
  })

  it('does not open Vital Log over patient mode, capture, or print overlays', () => {
    const patientMode = setup()
    act(() => patientMode.result.current.onMoveUp())
    act(() => patientMode.result.current.onEnter())
    expect(patientMode.result.current.patientModalOpen).toBe(true)
    act(() => patientMode.result.current.onHome())
    expect(patientMode.result.current.vitalLogOpen).toBe(false)

    const capture = setup()
    act(() => capture.result.current.onTwelveLead())
    act(() => capture.result.current.onCaptureTwelveLead())
    expect(capture.result.current.captureState).toBe('acquiring')
    act(() => capture.result.current.onHome())
    expect(capture.result.current.vitalLogOpen).toBe(false)

    act(() => vi.advanceTimersByTime(ACQUIRE_MS))
    act(() => capture.result.current.onBack())
    act(() => capture.result.current.onBack())
    act(() => capture.result.current.onPrint())
    expect(capture.result.current.printPreviewOpen).toBe(true)
    act(() => capture.result.current.onHome())
    expect(capture.result.current.vitalLogOpen).toBe(false)
  })

  it('closes Vital Log before leaving medication mode from the medication Back key', () => {
    const { result } = setup()

    act(() => result.current.onTreatment())
    act(() => result.current.onHome())
    act(() => result.current.onMedBack())

    expect(result.current.vitalLogOpen).toBe(false)
    expect(result.current.medicationMode).toBe(true)
  })

  it('closes Vital Log during power-off cleanup', () => {
    const { result } = setup()

    act(() => result.current.onHome())
    expect(result.current.vitalLogOpen).toBe(true)
    act(() => result.current.onPowerOff())

    expect(result.current.vitalLogOpen).toBe(false)
    expect(result.current.vitalLogPage).toBe(1)
    expect(result.current.vitalLogHighlightedButton).toBe('exit')
  })

  it('nav does not reach the background while the event log is open', () => {
    const { result } = setup()

    act(() => result.current.onTreatment())
    act(() => result.current.onMedInfo())
    expect(result.current.eventLogOpen).toBe(true)

    const before = result.current.selectedControl
    act(() => result.current.onMoveUp())
    act(() => result.current.onMoveDown())
    act(() => result.current.onMoveUp())
    expect(result.current.selectedControl).toBe(before)
  })

  it('keeps normal monitor navigation active while medication mode is up', () => {
    const { result } = setup()

    act(() => result.current.onMoveDown())
    expect(result.current.selectedControl).toBe('bottomStatusToggle')
    act(() => result.current.onTreatment())
    expect(result.current.medicationMode).toBe(true)

    act(() => result.current.onMoveUp())
    expect(result.current.selectedControl).not.toBe('bottomStatusToggle')
    act(() => result.current.onMoveDown())
    expect(result.current.selectedControl).toBe('bottomStatusToggle')

    act(() => result.current.onEnter())
    expect(result.current.bottomStatusVisible).toBe(false)
  })

  it('uses the merged caller and local event count for event-log pagination', () => {
    const { result } = setup({ callerEventCount: 3 })

    act(() => result.current.onTreatment())
    for (let i = 0; i < 6; i += 1) {
      act(() => result.current.onMedClick(`Medication ${i + 1}`, `10:00:0${i}`))
    }
    act(() => result.current.onMedInfo())

    expect(result.current.eventLogPage).toBe(1)
    expect(result.current.eventLogHighlightedButton).toBe('exit')

    // Move Up wraps Exit to Next.
    act(() => result.current.onMoveUp())
    expect(result.current.eventLogHighlightedButton).toBe('next')
    act(() => result.current.onEnter())
    expect(result.current.eventLogPage).toBe(2)

    // Next remains selectable but is disabled at the last-page boundary.
    act(() => result.current.onEnter())
    expect(result.current.eventLogPage).toBe(2)

    // Move Down wraps Next to Exit, then advances to Prev.
    act(() => result.current.onMoveDown())
    expect(result.current.eventLogHighlightedButton).toBe('exit')
    act(() => result.current.onMoveDown())
    expect(result.current.eventLogHighlightedButton).toBe('prev')
    act(() => result.current.onEnter())
    expect(result.current.eventLogPage).toBe(1)

    // Prev is disabled at the first-page boundary.
    act(() => result.current.onEnter())
    expect(result.current.eventLogPage).toBe(1)

    act(() => result.current.onMoveDown())
    act(() => result.current.onEnter())
    expect(result.current.eventLogPage).toBe(2)
    act(() => result.current.onMedBack())
    act(() => result.current.onMedInfo())
    expect(result.current.eventLogPage).toBe(1)
    expect(result.current.eventLogHighlightedButton).toBe('exit')
  })

  it('keeps single-page event-log navigation on Exit and preserves medication mode', () => {
    const { result } = setup()

    act(() => result.current.onTreatment())
    act(() => result.current.onMedInfo())

    expect(result.current.eventLogOpen).toBe(true)
    expect(result.current.eventLogHighlightedButton).toBe('exit')
    act(() => result.current.onMoveDown())
    act(() => result.current.onMoveUp())
    expect(result.current.eventLogHighlightedButton).toBe('exit')

    act(() => result.current.onEnter())
    expect(result.current.eventLogOpen).toBe(false)
    expect(result.current.medicationMode).toBe(true)
  })

  it('Enter does not act on the background control while a menu is up', () => {
    const { result } = setup()

    // Park the background selection on a control Enter would visibly change.
    for (let i = 0; i < 12; i += 1) {
      if (result.current.selectedControl === 'bottomStatusToggle') break
      act(() => result.current.onMoveUp())
    }
    expect(result.current.selectedControl).toBe('bottomStatusToggle')
    const before = result.current.bottomStatusVisible

    act(() => result.current.onTreatment())
    act(() => result.current.onMedInfo())
    act(() => result.current.onEnter())

    expect(result.current.bottomStatusVisible).toBe(before)
    expect(result.current.selectedControl).toBe('bottomStatusToggle')
  })

  it('still lets nav move within the patient mode modal', () => {
    const { result } = setup()

    for (let i = 0; i < 12; i += 1) {
      if (result.current.selectedControl === 'patientMode') break
      act(() => result.current.onMoveUp())
    }
    expect(result.current.selectedControl).toBe('patientMode')

    act(() => result.current.onEnter())
    expect(result.current.patientModalOpen).toBe(true)

    const before = result.current.patientModeHighlightedIndex
    act(() => result.current.onMoveDown())
    expect(result.current.patientModeHighlightedIndex).not.toBe(before)
  })

  it('opens NIBP on the Systolic label and enters/exits every right-side value', () => {
    const { result } = setup()

    for (let i = 0; i < 12 && result.current.selectedControl !== 'nibpVital'; i += 1) {
      act(() => result.current.onMoveUp())
    }
    expect(result.current.selectedControl).toBe('nibpVital')

    act(() => result.current.onEnter())
    expect(result.current.nibpModalOpen).toBe(true)
    expect(result.current.nibpHighlightedRow).toBe('systolicAlarm')
    expect(result.current.nibpFocusSide).toBe('label')
    expect(result.current.nibpMode).toBe('manual')
    expect(result.current.nibpAutoInterval).toBe(2)

    const rows = [
      'systolicAlarm',
      'diastolicAlarm',
      'mapAlarm',
      'mode',
      'autoInterval',
      'smartCuf',
    ] as const
    const readOnlyRows = new Set(['systolicAlarm', 'diastolicAlarm', 'mapAlarm', 'smartCuf'])

    rows.forEach((row, index) => {
      expect(result.current.nibpHighlightedRow).toBe(row)
      expect(result.current.nibpFocusSide).toBe('label')
      act(() => result.current.onEnter())
      expect(result.current.nibpFocusSide).toBe('value')

      if (readOnlyRows.has(row)) {
        const before = {
          row: result.current.nibpHighlightedRow,
          mode: result.current.nibpMode,
          interval: result.current.nibpAutoInterval,
        }
        act(() => result.current.onMoveUp())
        act(() => result.current.onMoveDown())
        expect(result.current.nibpHighlightedRow).toBe(before.row)
        expect(result.current.nibpMode).toBe(before.mode)
        expect(result.current.nibpAutoInterval).toBe(before.interval)
      }

      act(() => result.current.onEnter())
      expect(result.current.nibpFocusSide).toBe('label')
      if (index < rows.length - 1) act(() => result.current.onMoveDown())
    })
  })

  it('cycles NIBP labels and edits Mode with either arrow', () => {
    const { result } = setup()

    for (let i = 0; i < 12 && result.current.selectedControl !== 'nibpVital'; i += 1) {
      act(() => result.current.onMoveUp())
    }
    act(() => result.current.onEnter())

    act(() => result.current.onMoveUp())
    expect(result.current.nibpHighlightedRow).toBe('exit')
    act(() => result.current.onMoveDown())
    expect(result.current.nibpHighlightedRow).toBe('systolicAlarm')

    act(() => result.current.onMoveDown())
    act(() => result.current.onMoveDown())
    act(() => result.current.onMoveDown())
    expect(result.current.nibpHighlightedRow).toBe('mode')
    act(() => result.current.onEnter())
    expect(result.current.nibpFocusSide).toBe('value')
    act(() => result.current.onMoveUp())
    expect(result.current.nibpMode).toBe('automatic')
    act(() => result.current.onMoveDown())
    expect(result.current.nibpMode).toBe('manual')
    expect(result.current.nibpHighlightedRow).toBe('mode')
    act(() => result.current.onEnter())
    expect(result.current.nibpFocusSide).toBe('label')
  })

  it('edits the automatic interval directionally with wrap-around', () => {
    const { result } = setup()

    for (let i = 0; i < 12 && result.current.selectedControl !== 'nibpVital'; i += 1) {
      act(() => result.current.onMoveUp())
    }
    act(() => result.current.onEnter())
    for (let i = 0; i < 4; i += 1) act(() => result.current.onMoveDown())
    expect(result.current.nibpHighlightedRow).toBe('autoInterval')
    act(() => result.current.onEnter())

    for (const expected of [5, 15, 30, 60, 1, 2] as const) {
      act(() => result.current.onMoveUp())
      expect(result.current.nibpAutoInterval).toBe(expected)
    }
    act(() => result.current.onMoveDown())
    expect(result.current.nibpAutoInterval).toBe(1)
    act(() => result.current.onMoveDown())
    expect(result.current.nibpAutoInterval).toBe(60)
  })

  it('gives value-focused Enter/Back precedence, then closes with Exit or Back', () => {
    const { result } = setup()

    for (let i = 0; i < 12 && result.current.selectedControl !== 'nibpVital'; i += 1) {
      act(() => result.current.onMoveUp())
    }
    act(() => result.current.onEnter())
    act(() => result.current.onEnter())
    expect(result.current.nibpFocusSide).toBe('value')
    act(() => result.current.onBack())
    expect(result.current.nibpModalOpen).toBe(true)
    expect(result.current.nibpFocusSide).toBe('label')
    act(() => result.current.onEnter())
    expect(result.current.nibpFocusSide).toBe('value')
    act(() => result.current.onEnter())
    expect(result.current.nibpFocusSide).toBe('label')
    act(() => result.current.onMoveUp())
    expect(result.current.nibpHighlightedRow).toBe('exit')
    act(() => result.current.onEnter())
    expect(result.current.nibpModalOpen).toBe(false)

    act(() => result.current.onEnter())
    expect(result.current.nibpHighlightedRow).toBe('systolicAlarm')
    expect(result.current.nibpFocusSide).toBe('label')
    act(() => result.current.onMoveDown())
    act(() => result.current.onBack())
    expect(result.current.nibpModalOpen).toBe(false)

    act(() => result.current.onEnter())
    expect(result.current.nibpHighlightedRow).toBe('systolicAlarm')
    expect(result.current.nibpFocusSide).toBe('label')
  })

  it('makes NIBP modal exclusive with competing monitor menus and navigation', () => {
    const { result } = setup()

    for (let i = 0; i < 12 && result.current.selectedControl !== 'nibpVital'; i += 1) {
      act(() => result.current.onMoveUp())
    }
    act(() => result.current.onEnter())
    const beforeBottomStatus = result.current.bottomStatusVisible

    act(() => result.current.onHome())
    act(() => result.current.onPatientInfo())
    act(() => result.current.onLeftAnalyse())
    act(() => result.current.onTreatment())
    act(() => result.current.onTwelveLead())
    act(() => result.current.onToggleEtco2())
    act(() => result.current.onToggleBottomStatus())

    expect(result.current.nibpModalOpen).toBe(true)
    expect(result.current.vitalLogOpen).toBe(false)
    expect(result.current.patientInfoOpen).toBe(false)
    expect(result.current.callerInfoOpen).toBe(false)
    expect(result.current.medicationMode).toBe(false)
    expect(result.current.view).toBe('main')
    expect(result.current.secondary).toBe('spo2')
    expect(result.current.bottomStatusVisible).toBe(beforeBottomStatus)
  })

  it('restores NIBP defaults on monitor reset and power-off', () => {
    const { result } = setup()

    const configureAutomatic = () => {
      for (let i = 0; i < 12 && result.current.selectedControl !== 'nibpVital'; i += 1) {
        act(() => result.current.onMoveUp())
      }
      act(() => result.current.onEnter())
      act(() => result.current.onMoveDown())
      act(() => result.current.onMoveDown())
      act(() => result.current.onMoveDown())
      act(() => result.current.onEnter())
      act(() => result.current.onMoveUp())
      act(() => result.current.onEnter())
      act(() => result.current.onMoveDown())
      act(() => result.current.onEnter())
      act(() => result.current.onMoveUp())
      act(() => result.current.onEnter())
    }

    configureAutomatic()
    expect(result.current.nibpMode).toBe('automatic')
    expect(result.current.nibpAutoInterval).toBe(5)
    act(() => result.current.onResetMonitorUi())
    expect(result.current.nibpModalOpen).toBe(false)
    expect(result.current.nibpFocusSide).toBe('label')
    expect(result.current.nibpMode).toBe('manual')
    expect(result.current.nibpAutoInterval).toBe(2)

    configureAutomatic()
    act(() => result.current.onPowerOff())
    expect(result.current.nibpModalOpen).toBe(false)
    expect(result.current.nibpHighlightedRow).toBe('systolicAlarm')
    expect(result.current.nibpFocusSide).toBe('label')
    expect(result.current.nibpMode).toBe('manual')
    expect(result.current.nibpAutoInterval).toBe(2)
  })
})
