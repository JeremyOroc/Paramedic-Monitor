'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import { PATIENT_MODE_OPTIONS } from '@/components/monitor/PatientModeModal'
import type { EventLogEntry } from '@/components/monitor/EventLogModal'
import type { PatientInfoField } from '@/components/monitor/PatientInfoPanel'
import type { Vitals } from '@/store/monitorStore'
import type { MonitorSelection } from '@/types/monitorSelection'
import { clampAge, toggleSex, type PatientInfo, type PatientSex } from '@/types/patientInfo'
import { DEFAULT_VITALS, type PatientMode, type Rhythm } from '@/types/vitals'
import { setAudioMuted } from '@/lib/audio'
import { NEXT_MED_PAGE, type MedicationPage } from '@/lib/monitor/medications'

export type MonitorView = 'main' | '12lead'
export type SecondaryChannel = 'spo2' | 'etco2'
export type CaptureState = 'idle' | 'acquiring' | 'result'
export type { MedicationPage }

export type CaptureSnapshot = {
  rhythm: Rhythm
  hr: number
}

export const ACQUIRE_MS = 4000

const TOP_SELECTIONS: MonitorSelection[] = [
  'dateTime',
  'patientMode',
  'beacon',
  'battery',
  'hrVital',
  'nibpVital',
  'etco2Vital',
  'spo2Vital',
]


type MonitorControllerState = {
  view: MonitorView
  secondary: SecondaryChannel
  patientMode: PatientMode
  patientModalOpen: boolean
  patientModeHighlightedIndex: number
  callerInfoOpen: boolean
  patientInfoOpen: boolean
  selectedField: PatientInfoField
  editing: boolean
  editValue: number | PatientSex | null
  isTimerRunning: boolean
  medicationMode: boolean
  medicationPage: MedicationPage
  eventLog: EventLogEntry[]
  eventLogOpen: boolean
  flashedMed: string | null
  isPoweredOn: boolean
  isMuted: boolean
  selectedControl: MonitorSelection
  bottomStatusVisible: boolean
  jumpscareActive: boolean
  captureState: CaptureState
  capturedRhythm: Rhythm
  capturedHr: number
  lastCapture: CaptureSnapshot | null
  printPreviewOpen: boolean
}

/**
 * Overlays that take over the screen while they are up. The nav cluster must not
 * reach the background through them: moving the highlight, toggling the status
 * bar, or opening the patient-mode modal *behind* an open menu all happen out of
 * the trainee's sight and leave the monitor somewhere they never chose to be.
 *
 * `patientModalOpen` and `patientInfoOpen` are deliberately excluded — they
 * consume the nav keys themselves to move within their own contents.
 *
 * Each of these is closed by a soft key (Back, Med Back, Close Log), never by
 * the nav cluster, so swallowing nav here cannot strand anyone in a menu.
 */
function hasBlockingOverlay(state: MonitorControllerState): boolean {
  return (
    state.eventLogOpen ||
    state.medicationMode ||
    state.callerInfoOpen ||
    state.printPreviewOpen ||
    state.captureState === 'acquiring' ||
    state.captureState === 'result'
  )
}

type Action =
  | { type: 'selectPatientMode'; mode: PatientMode }
  | { type: 'closePatientModal' }
  | { type: 'movePatientModeHighlight'; direction: 1 | -1 }
  | { type: 'selectionEnter'; activeSelectedControl: MonitorSelection }
  | { type: 'moveSelectedControl'; direction: 1 | -1 }
  | { type: 'toggleBottomStatus' }
  | { type: 'enterMedicationMode' }
  | { type: 'addMedicationEvent'; name: string; time: string }
  | { type: 'clearMedicationFlash'; name: string }
  | { type: 'nextMedicationPage' }
  | { type: 'exitMedicationMode' }
  | { type: 'openEventLog' }
  | { type: 'closeEventLog' }
  | { type: 'openCallerInfo' }
  | { type: 'closeCallerInfo' }
  | { type: 'openPatientInfo' }
  | { type: 'movePatientInfo'; direction: 'up' | 'down'; patientInfo: PatientInfo }
  | { type: 'beginPatientInfoEdit'; patientInfo: PatientInfo }
  | { type: 'finishPatientInfoEdit' }
  | { type: 'cancelPatientInfoEdit' }
  | { type: 'enterTwelveLead' }
  | { type: 'toggleEtco2' }
  | { type: 'resetMonitorUi' }
  | { type: 'startCapture'; snapshot: CaptureSnapshot }
  | { type: 'completeCapture'; snapshot: CaptureSnapshot }
  | { type: 'openPrintPreview' }
  | { type: 'back' }
  | { type: 'toggleMute' }
  | { type: 'powerOn' }
  | { type: 'powerOff' }
  | { type: 'setJumpscareActive'; active: boolean }
  | { type: 'addAnalyzeEvent'; result: 'shock' | 'no_shock'; time: string }

type UseMonitorControllerOptions = {
  confirmed: Vitals
  patientInfo: PatientInfo
  setPatientAge: (age: number) => void
  setPatientSex: (sex: PatientSex) => void
  // Normal users boot locked-off; the dispatch gate flips this on. Defaults to
  // true so existing callers (and the dev bypass) keep the always-on behavior.
  initialPoweredOn?: boolean
}

const initialState: MonitorControllerState = {
  view: 'main',
  secondary: 'spo2',
  patientMode: DEFAULT_VITALS.patient_mode,
  patientModalOpen: false,
  patientModeHighlightedIndex: 0,
  callerInfoOpen: false,
  patientInfoOpen: false,
  selectedField: 'age',
  editing: false,
  editValue: null,
  isTimerRunning: true,
  medicationMode: false,
  medicationPage: 1,
  eventLog: [],
  eventLogOpen: false,
  flashedMed: null,
  isPoweredOn: true,
  isMuted: false,
  selectedControl: 'dateTime',
  bottomStatusVisible: true,
  jumpscareActive: false,
  captureState: 'idle',
  capturedRhythm: DEFAULT_VITALS.rhythm,
  capturedHr: DEFAULT_VITALS.hr,
  lastCapture: null,
  printPreviewOpen: false,
}

function getSelectableControls(state: MonitorControllerState): MonitorSelection[] {
  const waveformControls: MonitorSelection[] = []

  if (state.view !== '12lead') {
    const spo2Visible = !state.bottomStatusVisible || state.secondary === 'spo2'
    const etco2Visible = !state.bottomStatusVisible || state.secondary === 'etco2'

    if (spo2Visible) waveformControls.push('spo2Scale', 'spo2Label')
    if (etco2Visible) waveformControls.push('etco2Scale', 'etco2Label')
    waveformControls.push('ecgGain', 'padsLabel')
  }

  return [...TOP_SELECTIONS, ...waveformControls, 'bottomStatusToggle']
}

function getActiveSelectedControl(state: MonitorControllerState): MonitorSelection {
  const selectableControls = getSelectableControls(state)
  return selectableControls.includes(state.selectedControl) ? state.selectedControl : 'dateTime'
}

function reducer(
  state: MonitorControllerState,
  action: Action,
): MonitorControllerState {
  switch (action.type) {
    case 'selectPatientMode':
      return { ...state, patientMode: action.mode, patientModalOpen: false }
    case 'closePatientModal':
      return { ...state, patientModalOpen: false }
    case 'movePatientModeHighlight':
      return {
        ...state,
        patientModeHighlightedIndex:
          (
            state.patientModeHighlightedIndex +
            action.direction +
            PATIENT_MODE_OPTIONS.length
          ) % PATIENT_MODE_OPTIONS.length,
      }
    case 'selectionEnter': {
      if (state.patientModalOpen) {
        const mode = PATIENT_MODE_OPTIONS[state.patientModeHighlightedIndex].value
        return { ...state, patientMode: mode, patientModalOpen: false }
      }
      if (action.activeSelectedControl === 'bottomStatusToggle') {
        return { ...state, bottomStatusVisible: !state.bottomStatusVisible }
      }
      if (action.activeSelectedControl === 'battery') {
        // Removed jumpscare: battery selection no longer triggers the Chica overlay.
        // return { ...state, jumpscareActive: true }
        return state
      }
      if (action.activeSelectedControl === 'patientMode') {
        const currentIndex = PATIENT_MODE_OPTIONS.findIndex((o) => o.value === state.patientMode)
        return {
          ...state,
          patientModeHighlightedIndex: currentIndex === -1 ? 0 : currentIndex,
          patientModalOpen: true,
        }
      }
      return state
    }
    case 'moveSelectedControl': {
      const selectableControls = getSelectableControls(state)
      const currentIndex = selectableControls.indexOf(state.selectedControl)
      const safeIndex = currentIndex === -1 ? 0 : currentIndex
      return {
        ...state,
        selectedControl:
          selectableControls[
            (safeIndex + action.direction + selectableControls.length) %
              selectableControls.length
          ],
      }
    }
    case 'toggleBottomStatus':
      return {
        ...state,
        selectedControl: 'bottomStatusToggle',
        bottomStatusVisible: !state.bottomStatusVisible,
      }
    case 'enterMedicationMode':
      return { ...state, medicationMode: true }
    case 'addMedicationEvent':
      return {
        ...state,
        eventLog: [...state.eventLog, { name: action.name, time: action.time }],
        flashedMed: action.name,
      }
    case 'clearMedicationFlash':
      return state.flashedMed === action.name ? { ...state, flashedMed: null } : state
    case 'nextMedicationPage':
      return { ...state, medicationPage: NEXT_MED_PAGE[state.medicationPage] }
    case 'exitMedicationMode':
      // Two-step Back: close the event log first if it's open, otherwise leave
      // medication mode. Mirrors the pre-refactor handleMedBack behavior.
      if (state.eventLogOpen) return { ...state, eventLogOpen: false }
      return { ...state, medicationMode: false }
    case 'openEventLog':
      return { ...state, eventLogOpen: true }
    case 'closeEventLog':
      return { ...state, eventLogOpen: false }
    case 'openCallerInfo':
      return { ...state, callerInfoOpen: true }
    case 'closeCallerInfo':
      return { ...state, callerInfoOpen: false }
    case 'openPatientInfo':
      return {
        ...state,
        patientInfoOpen: true,
        selectedField: 'age',
        editing: false,
        editValue: null,
      }
    case 'movePatientInfo': {
      if (!state.patientInfoOpen) return state
      if (!state.editing) {
        return { ...state, selectedField: action.direction === 'up' ? 'age' : 'sex' }
      }
      if (state.selectedField === 'age') {
        const delta = action.direction === 'up' ? 1 : -1
        const current = typeof state.editValue === 'number'
          ? state.editValue
          : action.patientInfo.age
        return { ...state, editValue: clampAge(current + delta) }
      }
      const currentSex =
        state.editValue === 'M' || state.editValue === 'F'
          ? state.editValue
          : action.patientInfo.sex
      return { ...state, editValue: toggleSex(currentSex) }
    }
    case 'beginPatientInfoEdit':
      if (!state.patientInfoOpen || state.editing) return state
      return {
        ...state,
        editing: true,
        editValue:
          state.selectedField === 'age'
            ? action.patientInfo.age
            : action.patientInfo.sex,
      }
    case 'finishPatientInfoEdit':
      return { ...state, editing: false, editValue: null }
    case 'cancelPatientInfoEdit':
      return { ...state, editing: false, editValue: null }
    case 'enterTwelveLead':
      return { ...state, view: '12lead' }
    case 'toggleEtco2':
      return { ...state, secondary: state.secondary === 'spo2' ? 'etco2' : 'spo2' }
    case 'resetMonitorUi':
      // A drill reset has to clear everything the previous run produced —
      // medication timestamps, analyze entries, captured 12-leads, open menus,
      // where the highlight was parked — or the next trainee inherits the last
      // run's history. This used to reset only `secondary`, so the med log
      // survived every reset and the room had to be recreated to clear it.
      //
      // Power, the elapsed timer, and mute deliberately survive: they are device
      // state the trainee set, not results of the drill, and the dispatch gate
      // already governs when the next run begins.
      return {
        ...initialState,
        isPoweredOn: state.isPoweredOn,
        isTimerRunning: state.isTimerRunning,
        isMuted: state.isMuted,
      }
    case 'startCapture':
      return {
        ...state,
        patientInfoOpen: false,
        capturedRhythm: action.snapshot.rhythm,
        capturedHr: action.snapshot.hr,
        captureState: 'acquiring',
      }
    case 'completeCapture':
      return {
        ...state,
        captureState: 'result',
        lastCapture: action.snapshot,
      }
    case 'openPrintPreview':
      return state.lastCapture ? { ...state, printPreviewOpen: true } : state
    case 'back':
      if (state.callerInfoOpen) return { ...state, callerInfoOpen: false }
      if (state.patientModalOpen) return { ...state, patientModalOpen: false }
      if (state.printPreviewOpen) return { ...state, printPreviewOpen: false }
      if (state.editing) return { ...state, editing: false, editValue: null }
      if (state.captureState === 'acquiring') return { ...state, captureState: 'idle' }
      if (state.captureState === 'result') return { ...state, captureState: 'idle' }
      if (state.patientInfoOpen) return { ...state, patientInfoOpen: false }
      return { ...state, captureState: 'idle', view: 'main' }
    case 'toggleMute':
      return { ...state, isMuted: !state.isMuted }
    case 'powerOn':
      return { ...state, isTimerRunning: true, isPoweredOn: true }
    case 'powerOff':
      return {
        ...state,
        isTimerRunning: false,
        isPoweredOn: false,
        isMuted: false,
        eventLog: [],
        lastCapture: null,
        printPreviewOpen: false,
        medicationMode: false,
        medicationPage: 1,
        flashedMed: null,
        patientModalOpen: false,
        callerInfoOpen: false,
        eventLogOpen: false,
        selectedControl: 'dateTime',
        bottomStatusVisible: true,
      }
    case 'setJumpscareActive':
      return { ...state, jumpscareActive: action.active }
    case 'addAnalyzeEvent': {
      const name = action.result === 'shock' ? 'Analyze - Shock' : 'Analyze - No Shock'
      return { ...state, eventLog: [...state.eventLog, { name, time: action.time }] }
    }
    default:
      return state
  }
}

export function useMonitorController({
  confirmed,
  patientInfo,
  setPatientAge,
  setPatientSex,
  initialPoweredOn = true,
}: UseMonitorControllerOptions) {
  const [state, dispatch] = useReducer(reducer, initialPoweredOn, (poweredOn) => ({
    ...initialState,
    isPoweredOn: poweredOn,
    isTimerRunning: poweredOn,
  }))
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCaptureTimer = useCallback(() => {
    if (captureTimerRef.current) {
      clearTimeout(captureTimerRef.current)
      captureTimerRef.current = null
    }
  }, [])

  const clearFlashTimer = useCallback(() => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearCaptureTimer()
      clearFlashTimer()
    }
  }, [clearCaptureTimer, clearFlashTimer])

  const selectableControls = useMemo(() => getSelectableControls(state), [state])
  const activeSelectedControl = useMemo(() => getActiveSelectedControl(state), [state])

  const displayAge =
    state.editing && state.selectedField === 'age' && typeof state.editValue === 'number'
      ? state.editValue
      : patientInfo.age
  const displaySex: PatientSex =
    state.editing && state.selectedField === 'sex' &&
    (state.editValue === 'M' || state.editValue === 'F')
      ? state.editValue
      : patientInfo.sex

  const onBack = useCallback(() => {
    if (state.captureState === 'acquiring') clearCaptureTimer()
    dispatch({ type: 'back' })
  }, [clearCaptureTimer, state.captureState])

  const blockingOverlay = hasBlockingOverlay(state)

  const onEnter = useCallback(() => {
    if (blockingOverlay) return
    if (!state.patientModalOpen && state.patientInfoOpen) {
      if (!state.editing) {
        dispatch({ type: 'beginPatientInfoEdit', patientInfo })
        return
      }
      if (state.selectedField === 'age' && typeof state.editValue === 'number') {
        setPatientAge(state.editValue)
      } else if (
        state.selectedField === 'sex' &&
        (state.editValue === 'M' || state.editValue === 'F')
      ) {
        setPatientSex(state.editValue)
      }
      dispatch({ type: 'finishPatientInfoEdit' })
      return
    }
    dispatch({ type: 'selectionEnter', activeSelectedControl })
  }, [
    activeSelectedControl,
    blockingOverlay,
    patientInfo,
    setPatientAge,
    setPatientSex,
    state.editing,
    state.editValue,
    state.patientInfoOpen,
    state.patientModalOpen,
    state.selectedField,
  ])

  const onMoveUp = useCallback(() => {
    if (blockingOverlay) return
    if (state.patientModalOpen) {
      dispatch({ type: 'movePatientModeHighlight', direction: -1 })
    } else if (state.patientInfoOpen) {
      dispatch({ type: 'movePatientInfo', direction: 'up', patientInfo })
    } else {
      dispatch({ type: 'moveSelectedControl', direction: 1 })
    }
  }, [blockingOverlay, patientInfo, state.patientInfoOpen, state.patientModalOpen])

  const onMoveDown = useCallback(() => {
    if (blockingOverlay) return
    if (state.patientModalOpen) {
      dispatch({ type: 'movePatientModeHighlight', direction: 1 })
    } else if (state.patientInfoOpen) {
      dispatch({ type: 'movePatientInfo', direction: 'down', patientInfo })
    } else {
      dispatch({ type: 'moveSelectedControl', direction: -1 })
    }
  }, [blockingOverlay, patientInfo, state.patientInfoOpen, state.patientModalOpen])

  const onCaptureTwelveLead = useCallback(() => {
    clearCaptureTimer()
    const snapshot = { rhythm: confirmed.rhythm, hr: confirmed.hr }
    dispatch({ type: 'startCapture', snapshot })
    captureTimerRef.current = setTimeout(() => {
      captureTimerRef.current = null
      dispatch({ type: 'completeCapture', snapshot })
    }, ACQUIRE_MS)
  }, [clearCaptureTimer, confirmed.hr, confirmed.rhythm])

  const onMedClick = useCallback((name: string, time: string) => {
    clearFlashTimer()
    dispatch({ type: 'addMedicationEvent', name, time })
    flashTimerRef.current = setTimeout(() => {
      flashTimerRef.current = null
      dispatch({ type: 'clearMedicationFlash', name })
    }, 400)
  }, [clearFlashTimer])

  const onToggleMute = useCallback(() => {
    setAudioMuted(!state.isMuted)
    dispatch({ type: 'toggleMute' })
  }, [state.isMuted])

  const onResetMonitorUi = useCallback(() => {
    dispatch({ type: 'resetMonitorUi' })
  }, [])

  const onPowerOff = useCallback(() => {
    clearCaptureTimer()
    clearFlashTimer()
    setAudioMuted(false)
    dispatch({ type: 'powerOff' })
  }, [clearCaptureTimer, clearFlashTimer])

  return {
    ...state,
    selectableControls,
    activeSelectedControl,
    isTwelveLead: state.view === '12lead',
    captureLock: (state.view === '12lead' && state.captureState !== 'idle') ||
      state.printPreviewOpen,
    displayAge,
    displaySex,
    onBack,
    onEnter,
    onMoveUp,
    onMoveDown,
    onTwelveLead: () => dispatch({ type: 'enterTwelveLead' }),
    onToggleEtco2: () => dispatch({ type: 'toggleEtco2' }),
    onResetMonitorUi,
    onTreatment: () => dispatch({ type: 'enterMedicationMode' }),
    onLeftAnalyse: () => dispatch({ type: 'openCallerInfo' }),
    onCloseCallerInfo: () => dispatch({ type: 'closeCallerInfo' }),
    onPatientInfo: () => dispatch({ type: 'openPatientInfo' }),
    onCaptureTwelveLead,
    onPrint: () => dispatch({ type: 'openPrintPreview' }),
    onMedClick,
    onMedPageChange: () => dispatch({ type: 'nextMedicationPage' }),
    onMedInfo: () => dispatch({ type: 'openEventLog' }),
    onMedBack: () => dispatch({ type: 'exitMedicationMode' }),
    onCloseEventLog: () => dispatch({ type: 'closeEventLog' }),
    onToggleMute,
    onPowerOn: () => dispatch({ type: 'powerOn' }),
    onPowerOff,
    onAnalyzeResult: (result: 'shock' | 'no_shock', time: string) =>
      dispatch({ type: 'addAnalyzeEvent', result, time }),
    onToggleBottomStatus: () => dispatch({ type: 'toggleBottomStatus' }),
    onSetJumpscareActive: (active: boolean) =>
      dispatch({ type: 'setJumpscareActive', active }),
    onSelectPatientMode: (mode: PatientMode) => dispatch({ type: 'selectPatientMode', mode }),
    onClosePatientModal: () => dispatch({ type: 'closePatientModal' }),
  }
}
