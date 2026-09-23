'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ETCO2_CALIBRATION_MS } from '@/components/monitor/SecondaryChannel'
import { ACQUIRE_MS } from '@/hooks/useMonitorController'
import { useWagamiAPreferences } from '@/hooks/useWagamiAPreferences'
import { createEventLogStamp } from '@/lib/eventLog'
import { TWELVE_LEAD_SENT_MS } from '@/lib/twelveLeadTransmission'
import type { WagamiAClinicalEvent } from '@/hooks/useWagamiAClinicalCore'
import type { NibpAutoInterval, NibpMode } from '@/types/nibp'
import type { Rhythm } from '@/types/vitals'
import type {
  WagamiAEtco2CalibrationStatus,
  WagamiAMedicationEvent,
  WagamiATwelveLeadState,
  WagamiAView,
} from '@/types/wagamiA'
import type { WagamiATask } from '@/components/monitor/WagamiATaskDock'

type Options = {
  scope: string
  rhythm: Rhythm
  hr: number
  monitorResetVersion?: number
  onStudentEvent?: (event: WagamiAClinicalEvent) => void
}

type WorkspaceOptions = Omit<Options, 'scope'> & {
  preferenceState: ReturnType<typeof useWagamiAPreferences>
}

const INITIAL_TWELVE_LEAD: WagamiATwelveLeadState = {
  captureState: 'idle',
  lastCapture: null,
  printOpen: false,
  transmissionOpen: false,
  sentDestination: null,
  sentUntil: null,
}

export const MEDICATION_CONFIRMATION_MS = 400
export const ETCO2_CANCELLATION_CONFIRMATION_MS = 3000

const TASK_VIEW: Record<Exclude<WagamiATask, 'etco2'>, WagamiAView> = {
  twelveLead: 'twelveLead',
  medications: 'medications',
  callInfo: 'callInfo',
  vitalLog: 'vitalLog',
  configure: 'configure',
}

export function useWagamiAWorkspace({
  scope,
  rhythm,
  hr,
  monitorResetVersion = 0,
  onStudentEvent,
}: Options) {
  const preferenceState = useWagamiAPreferences(scope)
  return useWagamiAWorkspaceState({
    rhythm,
    hr,
    monitorResetVersion,
    onStudentEvent,
    preferenceState,
  })
}

/** Shares an already-created preference controller with live monitor state. */
export function useWagamiAWorkspaceWithPreferences({
  rhythm,
  hr,
  monitorResetVersion = 0,
  onStudentEvent,
  preferenceState,
}: WorkspaceOptions) {
  return useWagamiAWorkspaceState({
    rhythm,
    hr,
    monitorResetVersion,
    onStudentEvent,
    preferenceState,
  })
}

function useWagamiAWorkspaceState({
  rhythm,
  hr,
  monitorResetVersion = 0,
  onStudentEvent,
  preferenceState,
}: WorkspaceOptions) {
  const [view, setView] = useState<WagamiAView>('monitor')
  const [etco2Calibration, setEtco2Calibration] = useState<{
    status: WagamiAEtco2CalibrationStatus
    startedAt: number | null
    endsAt: number | null
    cancellationEndsAt: number | null
  }>({
    status: 'idle',
    startedAt: null,
    endsAt: null,
    cancellationEndsAt: null,
  })
  const [medicationEvents, setMedicationEvents] = useState<WagamiAMedicationEvent[]>([])
  const [flashedMedication, setFlashedMedication] = useState<string | null>(null)
  const [twelveLead, setTwelveLead] = useState<WagamiATwelveLeadState>(INITIAL_TWELVE_LEAD)
  const [nibpMode, setNibpMode] = useState<NibpMode>('manual')
  const [nibpAutoInterval, setNibpAutoInterval] = useState<NibpAutoInterval>(5)
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calibrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calibrationCancellationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transmissionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const medicationFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback((ref: { current: ReturnType<typeof setTimeout> | null }) => {
    if (ref.current !== null) clearTimeout(ref.current)
    ref.current = null
  }, [])

  useEffect(() => () => {
    clearTimer(captureTimerRef)
    clearTimer(calibrationTimerRef)
    clearTimer(calibrationCancellationTimerRef)
    clearTimer(transmissionTimerRef)
    clearTimer(medicationFlashTimerRef)
  }, [clearTimer])

  const workflowBusy = twelveLead.captureState === 'acquiring' || twelveLead.sentUntil !== null

  const resetEtco2Calibration = useCallback(() => {
    clearTimer(calibrationTimerRef)
    clearTimer(calibrationCancellationTimerRef)
    setEtco2Calibration({
      status: 'idle',
      startedAt: null,
      endsAt: null,
      cancellationEndsAt: null,
    })
  }, [clearTimer])

  const resetVersionRef = useRef(monitorResetVersion)
  useEffect(() => {
    if (resetVersionRef.current === monitorResetVersion) return
    resetVersionRef.current = monitorResetVersion
    resetEtco2Calibration()
  }, [monitorResetVersion, resetEtco2Calibration])

  function openTask(task: WagamiATask) {
    if (workflowBusy) return
    if (task === 'etco2') {
      if (etco2Calibration.status === 'idle') startEtco2Calibration()
      else if (etco2Calibration.status === 'calibrating') cancelEtco2Calibration()
      return
    }
    setView(TASK_VIEW[task])
  }

  function goBack() {
    if (view === 'medicationLog') setView('medications')
    else setView('monitor')
  }

  function startEtco2Calibration() {
    if (etco2Calibration.status !== 'idle' || workflowBusy) return
    const startedAt = Date.now()
    const endsAt = startedAt + ETCO2_CALIBRATION_MS
    clearTimer(calibrationTimerRef)
    clearTimer(calibrationCancellationTimerRef)
    setEtco2Calibration({
      status: 'calibrating',
      startedAt,
      endsAt,
      cancellationEndsAt: null,
    })
    calibrationTimerRef.current = setTimeout(() => {
      calibrationTimerRef.current = null
      setEtco2Calibration({
        status: 'calibrated',
        startedAt: null,
        endsAt: null,
        cancellationEndsAt: null,
      })
      onStudentEvent?.({
        kind: 'etco2_calibration',
        label: 'EtCO2 Calibrated',
        payload: { monitorResetVersion },
      })
    }, ETCO2_CALIBRATION_MS)
  }

  function cancelEtco2Calibration() {
    if (etco2Calibration.status !== 'calibrating') return
    clearTimer(calibrationTimerRef)
    clearTimer(calibrationCancellationTimerRef)
    const cancellationEndsAt = Date.now() + ETCO2_CANCELLATION_CONFIRMATION_MS
    setEtco2Calibration({
      status: 'cancelled',
      startedAt: null,
      endsAt: null,
      cancellationEndsAt,
    })
    calibrationCancellationTimerRef.current = setTimeout(() => {
      calibrationCancellationTimerRef.current = null
      setEtco2Calibration({
        status: 'idle',
        startedAt: null,
        endsAt: null,
        cancellationEndsAt: null,
      })
    }, ETCO2_CANCELLATION_CONFIRMATION_MS)
  }

  function recordMedication(medication: string) {
    if (workflowBusy) return
    clearTimer(medicationFlashTimerRef)
    setFlashedMedication(medication)
    medicationFlashTimerRef.current = setTimeout(() => {
      medicationFlashTimerRef.current = null
      setFlashedMedication(null)
    }, MEDICATION_CONFIRMATION_MS)
    const stamp = createEventLogStamp()
    setMedicationEvents((current) => [
      ...current,
      { medication, occurredAtMs: stamp.occurredAtMs, time: stamp.time },
    ])
    onStudentEvent?.({
      kind: 'medication',
      label: medication,
      payload: { medication, time: stamp.time },
    })
  }

  function startTwelveLeadCapture() {
    if (twelveLead.captureState === 'acquiring' || twelveLead.sentUntil !== null) return
    const snapshot = { rhythm, hr }
    clearTimer(captureTimerRef)
    setTwelveLead((current) => ({
      ...current,
      captureState: 'acquiring',
      printOpen: false,
      transmissionOpen: false,
    }))
    captureTimerRef.current = setTimeout(() => {
      captureTimerRef.current = null
      setTwelveLead((current) => ({
        ...current,
        captureState: 'result',
        lastCapture: snapshot,
      }))
      onStudentEvent?.({ kind: 'twelve_lead_capture', label: '12-Lead Capture', payload: snapshot })
    }, ACQUIRE_MS)
  }

  function closeTwelveLeadResult() {
    setTwelveLead((current) => ({ ...current, captureState: 'idle' }))
  }

  function openPrint() {
    if (!twelveLead.lastCapture || workflowBusy) return
    setTwelveLead((current) => ({ ...current, printOpen: true }))
  }

  function openTransmission() {
    if (!twelveLead.lastCapture || workflowBusy) return
    setTwelveLead((current) => ({ ...current, transmissionOpen: true }))
  }

  function sendTwelveLead(destination: string) {
    if (!twelveLead.transmissionOpen || twelveLead.sentUntil !== null) return
    const sentUntil = Date.now() + TWELVE_LEAD_SENT_MS
    clearTimer(transmissionTimerRef)
    setTwelveLead((current) => ({ ...current, sentDestination: destination, sentUntil }))
    onStudentEvent?.({
      kind: 'twelve_lead_transmit',
      label: '12-Lead Transmit',
      payload: { destination },
    })
    transmissionTimerRef.current = setTimeout(() => {
      transmissionTimerRef.current = null
      setTwelveLead((current) => ({
        ...current,
        transmissionOpen: false,
        sentDestination: null,
        sentUntil: null,
      }))
    }, TWELVE_LEAD_SENT_MS)
  }

  function closeTwelveLeadOverlay() {
    if (twelveLead.sentUntil !== null) return
    setTwelveLead((current) => ({
      ...current,
      captureState: current.captureState === 'result' ? 'idle' : current.captureState,
      printOpen: false,
      transmissionOpen: false,
    }))
  }

  function onDevicePowerOff() {
    clearTimer(captureTimerRef)
    clearTimer(transmissionTimerRef)
    clearTimer(calibrationTimerRef)
    clearTimer(calibrationCancellationTimerRef)
    clearTimer(medicationFlashTimerRef)
    setFlashedMedication(null)
    setEtco2Calibration((current) => current.status === 'calibrated'
      ? current
      : {
          status: 'idle',
          startedAt: null,
          endsAt: null,
          cancellationEndsAt: null,
        })
    setView('monitor')
    setTwelveLead(INITIAL_TWELVE_LEAD)
  }

  return {
    view,
    preferences: preferenceState.preferences,
    setLocale: preferenceState.setLocale,
    setShellAlarmLedEnabled: preferenceState.setShellAlarmLedEnabled,
    setVitalLogInterval: preferenceState.setVitalLogInterval,
    etco2Status: etco2Calibration.status,
    etco2StartedAt: etco2Calibration.startedAt,
    etco2EndsAt: etco2Calibration.endsAt,
    etco2CancellationEndsAt: etco2Calibration.cancellationEndsAt,
    medicationEvents,
    flashedMedication,
    twelveLead,
    nibpMode,
    nibpAutoInterval,
    workflowBusy,
    openTask,
    goBack,
    setView,
    startEtco2Calibration,
    cancelEtco2Calibration,
    resetEtco2Calibration,
    recordMedication,
    startTwelveLeadCapture,
    closeTwelveLeadResult,
    openPrint,
    openTransmission,
    sendTwelveLead,
    closeTwelveLeadOverlay,
    setNibpMode,
    setNibpAutoInterval,
    onDevicePowerOff,
  }
}

export type WagamiAWorkspaceController = ReturnType<typeof useWagamiAWorkspace>
