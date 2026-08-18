'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import { PATIENT_MODE_OPTIONS } from '@/components/monitor/PatientModeModal'
import {
  EVENT_LOG_ITEMS_PER_PAGE,
  type EventLogEntry,
  type EventLogHighlightedButton,
} from '@/components/monitor/EventLogModal'
import type { PatientInfoField } from '@/components/monitor/PatientInfoPanel'
import type { VitalLogHighlightedButton } from '@/components/monitor/VitalLogModal'
import type { Vitals } from '@/store/monitorStore'
import type { MonitorSelection } from '@/types/monitorSelection'
import { clampAge, toggleSex, type PatientInfo, type PatientSex } from '@/types/patientInfo'
import { DEFAULT_VITALS, type PatientMode, type Rhythm } from '@/types/vitals'
import { setAudioMuted } from '@/lib/audio'
import { buildEventLogEntry } from '@/lib/eventLog'
import { NEXT_MED_PAGE, type MedicationPage } from '@/lib/monitor/medications'
import type { EventLogStamp } from '@/types/eventLog'
import {
  NIBP_AUTO_INTERVALS,
  NIBP_MODAL_ROWS,
  type NibpAutoInterval,
  type NibpModalRow,
  type NibpMode,
} from '@/types/nibp'

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

const PATIENT_INFO_FIELDS: readonly PatientInfoField[] = ['age', 'sex', 'exit']
const EVENT_LOG_BUTTONS: readonly EventLogHighlightedButton[] = ['exit', 'prev', 'next']
const EVENT_LOG_EXIT_ONLY: readonly EventLogHighlightedButton[] = ['exit']
const VITAL_LOG_BUTTONS: readonly VitalLogHighlightedButton[] = ['exit', 'prev', 'next']
const VITAL_LOG_EXIT_ONLY: readonly VitalLogHighlightedButton[] = ['exit']

type MonitorControllerState = {
  view: MonitorView
  secondary: SecondaryChannel
  patientMode: PatientMode
  patientModalOpen: boolean
  patientModeHighlightedIndex: number
  nibpModalOpen: boolean
  nibpHighlightedRow: NibpModalRow
  nibpMode: NibpMode
  nibpAutoInterval: NibpAutoInterval
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
  eventLogPage: number
  eventLogHighlightedButton: EventLogHighlightedButton
  vitalLogOpen: boolean
  vitalLogPage: number
  vitalLogHighlightedButton: VitalLogHighlightedButton
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
 * `patientModalOpen`, `nibpModalOpen`, and `patientInfoOpen` are deliberately
 * excluded — they consume the nav keys themselves to move within their own
 * contents.
 *
 * Event-log navigation is handled before this guard. Medication mode is not a
 * blocking overlay: its left soft-key labels remain visible while the right
 * cluster continues to navigate the monitor normally.
 */
function hasBlockingOverlay(state: MonitorControllerState): boolean {
  return (
    state.eventLogOpen ||
    state.vitalLogOpen ||
    state.callerInfoOpen ||
    state.printPreviewOpen ||
    state.captureState === 'acquiring' ||
    state.captureState === 'result'
  )
}

function hasAnyModalOrOverlay(state: MonitorControllerState): boolean {
  return (
    state.patientModalOpen ||
    state.nibpModalOpen ||
    state.callerInfoOpen ||
    state.patientInfoOpen ||
    state.eventLogOpen ||
    state.vitalLogOpen ||
    state.printPreviewOpen ||
    state.captureState === 'acquiring' ||
    state.captureState === 'result'
  )
}

type Action =
  | { type: 'selectPatientMode'; mode: PatientMode }
  | { type: 'closePatientModal' }
  | { type: 'movePatientModeHighlight'; direction: 1 | -1 }
  | { type: 'closeNibpModal' }
  | { type: 'moveNibpHighlight'; direction: 1 | -1 }
  | { type: 'selectionEnter'; activeSelectedControl: MonitorSelection }
  | { type: 'moveSelectedControl'; direction: 1 | -1 }
  | { type: 'toggleBottomStatus' }
  | { type: 'enterMedicationMode' }
  | { type: 'addMedicationEvent'; name: string; stamp: EventLogStamp | string }
  | { type: 'clearMedicationFlash'; name: string }
  | { type: 'nextMedicationPage' }
  | { type: 'exitMedicationMode' }
  | { type: 'openEventLog' }
  | { type: 'closeEventLog' }
  | { type: 'moveEventLogHighlight'; direction: 1 | -1; hasPagination: boolean }
  | { type: 'activateEventLogButton'; totalPages: number }
  | { type: 'toggleVitalLog' }
  | { type: 'closeVitalLog' }
  | { type: 'moveVitalLogHighlight'; direction: 1 | -1; hasPagination: boolean }
  | { type: 'activateVitalLogButton'; totalPages: number }
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
  | { type: 'addAnalyzeEvent'; result: 'shock' | 'no_shock'; stamp: EventLogStamp | string }

type UseMonitorControllerOptions = {
  confirmed: Vitals
  patientInfo: PatientInfo
  setPatientAge: (age: number) => void
  setPatientSex: (sex: PatientSex) => void
  // Normal users boot locked-off; the dispatch gate flips this on. Defaults to
  // true so existing callers (and the dev bypass) keep the always-on behavior.
  initialPoweredOn?: boolean
  callerEventCount?: number
}

const initialState: MonitorControllerState = {
  view: 'main',
  secondary: 'spo2',
  patientMode: DEFAULT_VITALS.patient_mode,
  patientModalOpen: false,
  patientModeHighlightedIndex: 0,
  nibpModalOpen: false,
  nibpHighlightedRow: 'systolicAlarm',
  nibpMode: 'manual',
  nibpAutoInterval: 2,
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
  eventLogPage: 1,
  eventLogHighlightedButton: 'exit',
  vitalLogOpen: false,
  vitalLogPage: 1,
  vitalLogHighlightedButton: 'exit',
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
    case 'closeNibpModal':
      return { ...state, nibpModalOpen: false }
    case 'moveNibpHighlight': {
      const currentIndex = NIBP_MODAL_ROWS.indexOf(state.nibpHighlightedRow)
      const safeIndex = currentIndex === -1 ? 0 : currentIndex
      return {
        ...state,
        nibpHighlightedRow:
          NIBP_MODAL_ROWS[
            (safeIndex + action.direction + NIBP_MODAL_ROWS.length) % NIBP_MODAL_ROWS.length
          ],
      }
    }
    case 'selectionEnter': {
      if (state.nibpModalOpen) {
        if (state.nibpHighlightedRow === 'mode') {
          return {
            ...state,
            nibpMode: state.nibpMode === 'manual' ? 'automatic' : 'manual',
          }
        }
        if (state.nibpHighlightedRow === 'autoInterval') {
          const currentIndex = NIBP_AUTO_INTERVALS.indexOf(state.nibpAutoInterval)
          const safeIndex = currentIndex === -1 ? 0 : currentIndex
          return {
            ...state,
            nibpAutoInterval:
              NIBP_AUTO_INTERVALS[(safeIndex + 1) % NIBP_AUTO_INTERVALS.length],
          }
        }
        if (state.nibpHighlightedRow === 'exit') {
          return { ...state, nibpModalOpen: false }
        }
        return state
      }
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
      if (action.activeSelectedControl === 'nibpVital') {
        return {
          ...state,
          nibpModalOpen: true,
          nibpHighlightedRow: 'systolicAlarm',
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
      if (state.nibpModalOpen) return state
      return {
        ...state,
        selectedControl: 'bottomStatusToggle',
        bottomStatusVisible: !state.bottomStatusVisible,
      }
    case 'enterMedicationMode':
      if (state.nibpModalOpen) return state
      return { ...state, medicationMode: true }
    case 'addMedicationEvent':
      return {
        ...state,
        eventLog: [
          ...state.eventLog,
          buildEventLogEntry(action.name, action.stamp),
        ],
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
      if (state.vitalLogOpen) return { ...state, vitalLogOpen: false }
      return { ...state, medicationMode: false }
    case 'openEventLog':
      if (state.vitalLogOpen || state.nibpModalOpen) return state
      return {
        ...state,
        eventLogOpen: true,
        eventLogPage: 1,
        eventLogHighlightedButton: 'exit',
      }
    case 'closeEventLog':
      return { ...state, eventLogOpen: false }
    case 'moveEventLogHighlight': {
      const buttons = action.hasPagination ? EVENT_LOG_BUTTONS : EVENT_LOG_EXIT_ONLY
      const currentIndex = buttons.indexOf(state.eventLogHighlightedButton)
      const safeIndex = currentIndex === -1 ? 0 : currentIndex
      return {
        ...state,
        eventLogHighlightedButton:
          buttons[(safeIndex + action.direction + buttons.length) % buttons.length],
      }
    }
    case 'activateEventLogButton':
      if (state.eventLogHighlightedButton === 'exit') {
        return { ...state, eventLogOpen: false }
      }
      return {
        ...state,
        eventLogPage:
          state.eventLogHighlightedButton === 'prev'
            ? Math.max(1, state.eventLogPage - 1)
            : Math.min(action.totalPages, state.eventLogPage + 1),
      }
    case 'toggleVitalLog':
      if (state.vitalLogOpen) return { ...state, vitalLogOpen: false }
      if (hasAnyModalOrOverlay(state)) return state
      return {
        ...state,
        vitalLogOpen: true,
        vitalLogPage: 1,
        vitalLogHighlightedButton: 'exit',
      }
    case 'closeVitalLog':
      return { ...state, vitalLogOpen: false }
    case 'moveVitalLogHighlight': {
      const buttons = action.hasPagination ? VITAL_LOG_BUTTONS : VITAL_LOG_EXIT_ONLY
      const currentIndex = buttons.indexOf(state.vitalLogHighlightedButton)
      const safeIndex = currentIndex === -1 ? 0 : currentIndex
      return {
        ...state,
        vitalLogHighlightedButton:
          buttons[(safeIndex + action.direction + buttons.length) % buttons.length],
      }
    }
    case 'activateVitalLogButton':
      if (state.vitalLogHighlightedButton === 'exit') {
        return { ...state, vitalLogOpen: false }
      }
      return {
        ...state,
        vitalLogPage:
          state.vitalLogHighlightedButton === 'prev'
            ? Math.max(1, state.vitalLogPage - 1)
            : Math.min(action.totalPages, state.vitalLogPage + 1),
      }
    case 'openCallerInfo':
      if (state.vitalLogOpen || state.nibpModalOpen) return state
      return { ...state, callerInfoOpen: true }
    case 'closeCallerInfo':
      return { ...state, callerInfoOpen: false }
    case 'openPatientInfo':
      if (state.vitalLogOpen || state.nibpModalOpen) return state
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
        const currentIndex = PATIENT_INFO_FIELDS.indexOf(state.selectedField)
        const safeIndex = currentIndex === -1 ? 0 : currentIndex
        const delta = action.direction === 'up' ? -1 : 1
        return {
          ...state,
          selectedField:
            PATIENT_INFO_FIELDS[
              (safeIndex + delta + PATIENT_INFO_FIELDS.length) % PATIENT_INFO_FIELDS.length
            ],
        }
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
      if (!state.patientInfoOpen || state.editing || state.selectedField === 'exit') return state
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
      if (state.nibpModalOpen) return state
      return { ...state, view: '12lead' }
    case 'toggleEtco2':
      if (state.nibpModalOpen) return state
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
      if (state.vitalLogOpen || state.nibpModalOpen) return state
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
      if (state.vitalLogOpen || state.nibpModalOpen) return state
      return state.lastCapture ? { ...state, printPreviewOpen: true } : state
    case 'back':
      if (state.vitalLogOpen) return { ...state, vitalLogOpen: false }
      if (state.callerInfoOpen) return { ...state, callerInfoOpen: false }
      if (state.nibpModalOpen) return { ...state, nibpModalOpen: false }
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
        nibpModalOpen: false,
        nibpHighlightedRow: 'systolicAlarm',
        nibpMode: 'manual',
        nibpAutoInterval: 2,
        callerInfoOpen: false,
        eventLogOpen: false,
        eventLogPage: 1,
        eventLogHighlightedButton: 'exit',
        vitalLogOpen: false,
        vitalLogPage: 1,
        vitalLogHighlightedButton: 'exit',
        selectedControl: 'dateTime',
        bottomStatusVisible: true,
      }
    case 'setJumpscareActive':
      return { ...state, jumpscareActive: action.active }
    case 'addAnalyzeEvent': {
      const name = action.result === 'shock' ? 'Analyze - Shock' : 'Analyze - No Shock'
      return {
        ...state,
        eventLog: [...state.eventLog, buildEventLogEntry(name, action.stamp)],
      }
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
  callerEventCount = 0,
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
  const eventLogTotalPages = Math.max(
    1,
    Math.ceil((callerEventCount + state.eventLog.length) / EVENT_LOG_ITEMS_PER_PAGE),
  )
  const eventLogHasPagination = eventLogTotalPages > 1

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

  const onEnter = useCallback((vitalLogTotalPages = 1) => {
    if (state.vitalLogOpen) {
      dispatch({ type: 'activateVitalLogButton', totalPages: vitalLogTotalPages })
      return
    }
    if (state.eventLogOpen) {
      dispatch({ type: 'activateEventLogButton', totalPages: eventLogTotalPages })
      return
    }
    if (blockingOverlay) return
    if (!state.patientModalOpen && !state.nibpModalOpen && state.patientInfoOpen) {
      if (!state.editing) {
        if (state.selectedField === 'exit') {
          dispatch({ type: 'back' })
          return
        }
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
    eventLogTotalPages,
    patientInfo,
    setPatientAge,
    setPatientSex,
    state.editing,
    state.eventLogOpen,
    state.editValue,
    state.patientInfoOpen,
    state.patientModalOpen,
    state.nibpModalOpen,
    state.selectedField,
    state.vitalLogOpen,
  ])

  const onMoveUp = useCallback((vitalLogHasPagination = false) => {
    if (state.vitalLogOpen) {
      dispatch({
        type: 'moveVitalLogHighlight',
        direction: -1,
        hasPagination: vitalLogHasPagination,
      })
      return
    }
    if (state.eventLogOpen) {
      dispatch({
        type: 'moveEventLogHighlight',
        direction: -1,
        hasPagination: eventLogHasPagination,
      })
      return
    }
    if (blockingOverlay) return
    if (state.nibpModalOpen) {
      dispatch({ type: 'moveNibpHighlight', direction: -1 })
    } else if (state.patientModalOpen) {
      dispatch({ type: 'movePatientModeHighlight', direction: -1 })
    } else if (state.patientInfoOpen) {
      dispatch({ type: 'movePatientInfo', direction: 'up', patientInfo })
    } else {
      dispatch({ type: 'moveSelectedControl', direction: 1 })
    }
  }, [
    blockingOverlay,
    eventLogHasPagination,
    patientInfo,
    state.eventLogOpen,
    state.patientInfoOpen,
    state.patientModalOpen,
    state.nibpModalOpen,
    state.vitalLogOpen,
  ])

  const onMoveDown = useCallback((vitalLogHasPagination = false) => {
    if (state.vitalLogOpen) {
      dispatch({
        type: 'moveVitalLogHighlight',
        direction: 1,
        hasPagination: vitalLogHasPagination,
      })
      return
    }
    if (state.eventLogOpen) {
      dispatch({
        type: 'moveEventLogHighlight',
        direction: 1,
        hasPagination: eventLogHasPagination,
      })
      return
    }
    if (blockingOverlay) return
    if (state.nibpModalOpen) {
      dispatch({ type: 'moveNibpHighlight', direction: 1 })
    } else if (state.patientModalOpen) {
      dispatch({ type: 'movePatientModeHighlight', direction: 1 })
    } else if (state.patientInfoOpen) {
      dispatch({ type: 'movePatientInfo', direction: 'down', patientInfo })
    } else {
      dispatch({ type: 'moveSelectedControl', direction: -1 })
    }
  }, [
    blockingOverlay,
    eventLogHasPagination,
    patientInfo,
    state.eventLogOpen,
    state.patientInfoOpen,
    state.patientModalOpen,
    state.nibpModalOpen,
    state.vitalLogOpen,
  ])

  const onCaptureTwelveLead = useCallback(() => {
    if (state.vitalLogOpen) return
    clearCaptureTimer()
    const snapshot = { rhythm: confirmed.rhythm, hr: confirmed.hr }
    dispatch({ type: 'startCapture', snapshot })
    captureTimerRef.current = setTimeout(() => {
      captureTimerRef.current = null
      dispatch({ type: 'completeCapture', snapshot })
    }, ACQUIRE_MS)
  }, [clearCaptureTimer, confirmed.hr, confirmed.rhythm, state.vitalLogOpen])

  const onMedClick = useCallback((name: string, stamp: EventLogStamp | string) => {
    clearFlashTimer()
    dispatch({ type: 'addMedicationEvent', name, stamp })
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
    onHome: () => dispatch({ type: 'toggleVitalLog' }),
    onCloseVitalLog: () => dispatch({ type: 'closeVitalLog' }),
    onEnter,
    onMoveUp,
    onMoveDown,
    onCloseNibpModal: () => dispatch({ type: 'closeNibpModal' }),
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
    onAnalyzeResult: (result: 'shock' | 'no_shock', stamp: EventLogStamp | string) =>
      dispatch({ type: 'addAnalyzeEvent', result, stamp }),
    onToggleBottomStatus: () => dispatch({ type: 'toggleBottomStatus' }),
    onSetJumpscareActive: (active: boolean) =>
      dispatch({ type: 'setJumpscareActive', active }),
    onSelectPatientMode: (mode: PatientMode) => dispatch({ type: 'selectPatientMode', mode }),
    onClosePatientModal: () => dispatch({ type: 'closePatientModal' }),
  }
}
