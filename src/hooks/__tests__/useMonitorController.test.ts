import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PatientInfo, PatientSex } from '@/types/patientInfo'
import type { Vitals } from '@/store/monitorStore'

import { useMonitorController } from '../useMonitorController'

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

    act(() => result.current.onPrint())
    expect(result.current.printPreviewOpen).toBe(false)
  })

  it('cycles to the bottom status toggle and toggles it on Enter', () => {
    const { result } = setup()

    act(() => result.current.onMoveDown())
    expect(result.current.activeSelectedControl).toBe('bottomStatusToggle')

    act(() => result.current.onEnter())
    expect(result.current.bottomStatusVisible).toBe(false)
    expect(result.current.activeSelectedControl).toBe('bottomStatusToggle')
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

    // Second Back exits medication mode.
    act(() => result.current.onMedBack())
    expect(result.current.medicationMode).toBe(false)
  })
})
