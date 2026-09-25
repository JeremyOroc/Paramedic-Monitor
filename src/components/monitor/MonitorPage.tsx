'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DeviceShell } from '@/components/monitor/DeviceShell'
import { WagamiZDevice } from '@/components/monitor/WagamiZDevice'
import { WagamiAPreview } from '@/components/monitor/WagamiAPreview'
import { WagamiADevice } from '@/components/monitor/WagamiADevice'
import { WagamiACallInfoPage } from '@/components/monitor/WagamiACallInfoPage'
import { WagamiAWorkspace } from '@/components/monitor/WagamiAWorkspace'
import { MonitorLayout } from '@/components/monitor/MonitorLayout'
import { TopStatusBar } from '@/components/monitor/TopStatusBar'
import { SubBar } from '@/components/monitor/SubBar'
import { LeftSidebar } from '@/components/monitor/LeftSidebar'
import { ContinuousWaveformSurface } from '@/components/monitor/ContinuousWaveformSurface'
import { WaveformPanel } from '@/components/monitor/WaveformPanel'
import { TwelveLeadPage } from '@/components/monitor/TwelveLeadPage'
import { TwelveLeadPrintout } from '@/components/monitor/TwelveLeadPrintout'
import { TwelveLeadTransmissionPanel } from '@/components/monitor/TwelveLeadTransmissionPanel'
import { AcquiringDialog } from '@/components/monitor/AcquiringDialog'
import { VitalsStrip } from '@/components/monitor/VitalsStrip'
import { BottomStatusBar } from '@/components/monitor/BottomStatusBar'
import { EnergyScaleColumn } from '@/components/monitor/EnergyScaleColumn'
import { PatientModeModal, PATIENT_MODE_OPTIONS } from '@/components/monitor/PatientModeModal'
import { NibpModal } from '@/components/monitor/NibpModal'
import {
  CallerInfoModal,
  type CallerEventKey,
  type CallerInfoVariant,
} from '@/components/monitor/CallerInfoModal'
import { PatientInfoPanel } from '@/components/monitor/PatientInfoPanel'
import { EventLogModal } from '@/components/monitor/EventLogModal'
import {
  VitalLogModal,
  VITAL_LOG_ITEMS_PER_PAGE,
} from '@/components/monitor/VitalLogModal'
import { useDefibSequence } from '@/hooks/useDefibSequence'
import { useCPRTimer } from '@/hooks/useCPRTimer'
import { energyDown, energyUp } from '@/lib/defib/defibMachine'
import { useAlarm } from '@/hooks/useAlarm'
import { useMonitorController, ACQUIRE_MS } from '@/hooks/useMonitorController'
import { ETCO2_CALIBRATION_MS } from '@/components/monitor/SecondaryChannel'
import { useMonitorClock } from '@/hooks/useMonitorClock'
import { useDefibAudio } from '@/hooks/useDefibAudio'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { useVitalLog } from '@/hooks/useVitalLog'
import { useCountdown } from '@/hooks/useCountdown'
import { useElapsedTimer } from '@/hooks/useElapsedTimer'
import { useNibpReading } from '@/hooks/useNibpReading'
import { useNibpAutoMode } from '@/hooks/useNibpAutoMode'
import { useReceivingHospitalRouting } from '@/hooks/useReceivingHospitalRouting'
import { useMonitorViewportLock } from '@/hooks/useMonitorViewportLock'
import { useWagamiAPreferences } from '@/hooks/useWagamiAPreferences'
import { useWagamiAWorkspaceWithPreferences } from '@/hooks/useWagamiAWorkspace'
import { useWagamiACallInfoCover } from '@/hooks/useWagamiACallInfoCover'
import { useWagamiAStartup } from '@/hooks/useWagamiAStartup'
import { useVitalTrendClock } from '@/hooks/useVitalTrendClock'
import { createEventLogStamp, sortEventLogEntries } from '@/lib/eventLog'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { cn } from '@/lib/utils'
import {
  playCprMetronome,
  playCallerInfoAlert,
  setAudioMuted,
  stopAllAudio,
  stopCprAudioSequence,
} from '@/lib/audio'
import { isWagamiAPatientModeLocked, nextWagamiAPatientMode } from '@/lib/wagamiAPatientMode'
import { playWagamiACprPrompt, playWagamiADefibPrompt } from '@/lib/wagamiAVoice'
import { SessionLandingPage } from '@/components/session/SessionLandingPage'
import { getCprHeartRate } from '@/types/vitals'
import { useAutomaticDisplayHeartRate } from '@/hooks/useAutomaticDisplayHeartRate'
import type { HeartRateDisplaySync } from '@/lib/automaticHeartRate'
import {
  MONITOR_PROJECTION_VERSION,
  type MonitorProjection,
} from '@/types/monitorProjection'
import type { PowerState } from '@/components/monitor/DeviceShell'
import type { WagamiAProjectionState } from '@/types/wagamiA'

const CALLER_INFO_ALERT_FLASH_MS = 2320

export type StudentEventRecord = {
  kind: string
  label: string
  payload?: unknown
}

export function MonitorPage({
  onStudentEvent,
  heartRateDisplaySync,
  onProjectionChange,
  transportStorageScope,
}: {
  onStudentEvent?: (event: StudentEventRecord) => void
  heartRateDisplaySync?: HeartRateDisplaySync | null
  onProjectionChange?: (projection: MonitorProjection) => void
  transportStorageScope?: string
} = {}) {
  useMonitorViewportLock()

  useStoreHydration()
  useVitalTrendClock()
  const confirmed = useMonitorStore((s) => s.confirmed)
  const defibrillatorModelConfirmed = useMonitorStore(
    (s) => s.defibrillatorModelConfirmed,
  )
  const confirmedVitalActive = useMonitorStore((s) => s.confirmedVitalActive)
  const acceptedBp = useMonitorStore((s) => s.acceptedBp)
  const acceptedBpActive = useMonitorStore((s) => s.acceptedBpActive)
  const acceptBpReading = useMonitorStore((s) => s.acceptBpReading)
  const callerInfoConfirmed = useMonitorStore((s) => s.callerInfoConfirmed)
  const dispatchRouteConfirmed = useMonitorStore((s) => s.dispatchRouteConfirmed)
  const patientInfo = useMonitorStore((s) => s.patientInfo)
  const setPatientAge = useMonitorStore((s) => s.setPatientAge)
  const setPatientSex = useMonitorStore((s) => s.setPatientSex)
  const dispatchState = useMonitorStore((s) => s.dispatch)
  const monitorResetVersion = useMonitorStore((s) => s.monitorResetVersion)
  const etco2CalibrationStatus = useMonitorStore((s) => s.etco2CalibrationStatus)
  const cprMode = useMonitorStore((s) => s.cprMode)
  const acknowledgeCall = useMonitorStore((s) => s.acknowledgeCall)
  const arriveCall = useMonitorStore((s) => s.arriveCall)
  const transportCall = useMonitorStore((s) => s.transportCall)
  const startEtco2Calibration = useMonitorStore((s) => s.startEtco2Calibration)
  const cancelEtco2Calibration = useMonitorStore((s) => s.cancelEtco2Calibration)
  const completeEtco2Calibration = useMonitorStore((s) => s.completeEtco2Calibration)
  const etco2LoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callerInfoAlertRunIdRef = useRef<string | null>(null)
  const callerInfoAlertFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [callerInfoAlertFlash, setCallerInfoAlertFlash] = useState(false)
  const etco2Loading = etco2CalibrationStatus === 'calibrating'
  const etco2Loaded = etco2CalibrationStatus === 'calibrated'
  const cprHeartRate = getCprHeartRate(cprMode)
  const cprOverrideActive = cprHeartRate !== null
  const hospitalRouting = useReceivingHospitalRouting({
    dispatchRoute: dispatchRouteConfirmed,
    dispatchRunId: dispatchState.runId,
    incidentAddress: dispatchRouteConfirmed.destinationAddress,
    monitorResetVersion,
    storageScope: transportStorageScope,
    transported: dispatchState.transportedAt !== null,
  })

  const searchParams = useSearchParams()
  const devMode = searchParams.get('dev')
  const devBypass = devMode === '1' || devMode === '2'
  const activeDefibrillatorModel =
    devMode === '2'
      ? 'wagamiZ'
      : devMode === '1'
        ? 'wagamiX'
        : defibrillatorModelConfirmed
  const isWagamiZ = activeDefibrillatorModel === 'wagamiZ'
  const isWagamiA = activeDefibrillatorModel === 'wagamiA'
  const { date, time } = useMonitorClock(isWagamiA ? 'America/Toronto' : undefined)
  const wagamiAPreferenceState = useWagamiAPreferences(
    transportStorageScope ?? 'unscoped-live',
    isWagamiA,
  )
  const callerInfoVariant: CallerInfoVariant =
    searchParams.get('callerInfoVariant') === 'classic' ? 'classic' : 'assignment'
  const [devicePowerState, setDevicePowerState] = useState<PowerState>(
    devBypass ? 'on' : 'off',
  )

  const controller = useMonitorController({
    confirmed,
    patientInfo,
    setPatientAge,
    setPatientSex,
    initialPoweredOn: devBypass,
    callerEventCount: dispatchState.callerEvents.length,
  })
  const wagamiAStartup = useWagamiAStartup({
    powerState: devicePowerState,
    setPowerState: setDevicePowerState,
    onReady: () => {
      onStudentEvent?.({ kind: 'power_on', label: 'Power On' })
      controller.onPowerOn()
    },
  })
  const {
    formatted: sessionTimer,
    elapsedSeconds: sessionElapsedSeconds,
  } = useSessionTimer(controller.isTimerRunning)

  // Dispatch startup gate: countdown is travel-time to scene; the trainee must
  // Acknowledge, wait out the countdown, then mark Arrival before power unlocks.
  const countdown = useCountdown(dispatchState.countdownEndsAt)
  const responseTimer = useElapsedTimer(dispatchState.startedAt)
  const gateSatisfied =
    !!dispatchState.acknowledgedAt && countdown.isDone && !!dispatchState.arrivedAt
  const powerLocked = !devBypass && !gateSatisfied

  const callerButtonState: Record<CallerEventKey, { disabled: boolean }> = {
    acknowledge: { disabled: dispatchState.acknowledgedAt !== null },
    arrival: {
      disabled:
        !(dispatchState.acknowledgedAt && countdown.isDone) || dispatchState.arrivedAt !== null,
    },
    transport: { disabled: !controller.isPoweredOn || dispatchState.transportedAt !== null },
  }

  const onCallerEvent = (key: CallerEventKey) => {
    const stamp = createEventLogStamp()
    if (key === 'acknowledge') acknowledgeCall(stamp)
    else if (key === 'arrival') arriveCall(stamp)
    else {
      hospitalRouting.startTransport(stamp.occurredAtMs)
      transportCall(stamp)
    }
    onStudentEvent?.({
      kind: key,
      label: key === 'acknowledge' ? 'Acknowledge' : key === 'arrival' ? 'Arrival' : 'Transport',
      payload: { time: stamp.time },
    })
  }

  const mergedEventLog = useMemo(
    () => sortEventLogEntries([...dispatchState.callerEvents, ...controller.eventLog]),
    [controller.eventLog, dispatchState.callerEvents],
  )
  // Arrival used to flip straight to the monitor. Now each dispatch run keeps
  // the tablet up until the trainee explicitly taps "Go to Monitor".
  const [enteredMonitorRunId, setEnteredMonitorRunId] = useState<string | null>(null)
  const enterCurrentDispatch = () => setEnteredMonitorRunId(dispatchState.runId)
  const hasEnteredCurrentDispatch =
    dispatchState.runId !== '' && enteredMonitorRunId === dispatchState.runId
  const showDispatchCallerPage =
    !devBypass && dispatchState.armed && !(gateSatisfied && hasEnteredCurrentDispatch)

  const wagamiAStartupContextRef = useRef({
    model: activeDefibrillatorModel,
    monitorResetVersion,
    showDispatchCallerPage,
  })
  useEffect(() => {
    const previous = wagamiAStartupContextRef.current
    const startupContextChanged =
      previous.model !== activeDefibrillatorModel ||
      previous.monitorResetVersion !== monitorResetVersion ||
      previous.showDispatchCallerPage !== showDispatchCallerPage
    wagamiAStartupContextRef.current = {
      model: activeDefibrillatorModel,
      monitorResetVersion,
      showDispatchCallerPage,
    }
    const wagamiAWasOrIsActive = previous.model === 'wagamiA' || isWagamiA
    if (wagamiAWasOrIsActive && startupContextChanged && devicePowerState === 'booting') {
      wagamiAStartup.cancel()
    }
  }, [
    activeDefibrillatorModel,
    devicePowerState,
    isWagamiA,
    monitorResetVersion,
    showDispatchCallerPage,
    wagamiAStartup,
  ])

  const standbyLockScreen = (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <span className="font-mono text-sm uppercase tracking-[0.3em] text-neutral-700">
        Standby
      </span>
    </div>
  )

  const clearEtco2LoadTimer = useCallback(() => {
    if (etco2LoadTimerRef.current) {
      clearTimeout(etco2LoadTimerRef.current)
      etco2LoadTimerRef.current = null
    }
  }, [])

  const cancelEtco2Loading = useCallback(() => {
    clearEtco2LoadTimer()
    cancelEtco2Calibration()
  }, [cancelEtco2Calibration, clearEtco2LoadTimer])

  const startEtco2Loading = useCallback(() => {
    const resetVersion = monitorResetVersion
    clearEtco2LoadTimer()
    startEtco2Calibration()
    etco2LoadTimerRef.current = setTimeout(() => {
      etco2LoadTimerRef.current = null
      if (useMonitorStore.getState().monitorResetVersion === resetVersion) {
        completeEtco2Calibration()
        // Calibration status lives only in this trainee's own store, so the
        // instructor panel can only learn about it through the event stream.
        onStudentEvent?.({
          kind: 'etco2_calibration',
          label: 'EtCO2 Calibrated',
          payload: { monitorResetVersion: resetVersion },
        })
      }
    }, ETCO2_CALIBRATION_MS)
  }, [
    clearEtco2LoadTimer,
    completeEtco2Calibration,
    monitorResetVersion,
    onStudentEvent,
    startEtco2Calibration,
  ])

  useEffect(() => {
    return clearEtco2LoadTimer
  }, [clearEtco2LoadTimer])

  useEffect(() => {
    return () => {
      if (callerInfoAlertFlashTimerRef.current) {
        clearTimeout(callerInfoAlertFlashTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!showDispatchCallerPage || dispatchState.runId === '') return
    if (callerInfoAlertRunIdRef.current === dispatchState.runId) return

    callerInfoAlertRunIdRef.current = dispatchState.runId
    playCallerInfoAlert()
    setCallerInfoAlertFlash(true)
    if (callerInfoAlertFlashTimerRef.current) {
      clearTimeout(callerInfoAlertFlashTimerRef.current)
    }
    callerInfoAlertFlashTimerRef.current = setTimeout(() => {
      callerInfoAlertFlashTimerRef.current = null
      setCallerInfoAlertFlash(false)
    }, CALLER_INFO_ALERT_FLASH_MS)
  }, [dispatchState.runId, showDispatchCallerPage])

  const silencedResetVersionRef = useRef(monitorResetVersion)

  useEffect(() => {
    clearEtco2LoadTimer()
    // Cue elements are module singletons, so a reset or a New Attempt remount
    // does not stop them on its own — the CPR metronome survived both and ran
    // until someone hit mute.
    //
    // Only on a real reset though, never on mount. This effect also runs when
    // the monitor first mounts, and React runs effects in declaration order, so
    // silencing here killed the dispatch alert that the caller-info effect
    // above had just started: the first scenario of every session was silent,
    // while later dispatches — which do not remount — sounded fine. The unmount
    // cleanup below already covers leaving the monitor.
    if (silencedResetVersionRef.current !== monitorResetVersion) {
      silencedResetVersionRef.current = monitorResetVersion
      stopAllAudio()
    }
    controller.onResetMonitorUi()
  }, [clearEtco2LoadTimer, controller.onResetMonitorUi, monitorResetVersion])

  // Leaving the monitor entirely must silence it too.
  useEffect(() => stopAllAudio, [])

  const handleToggleEtco2 = useCallback(() => {
    const willShowEtco2 = controller.secondary !== 'etco2'
    onStudentEvent?.({
      kind: 'etco2_toggle',
      label: willShowEtco2 ? 'EtCO2 On' : 'EtCO2 Off',
      payload: { on: willShowEtco2 },
    })
    controller.onToggleEtco2()
    if (willShowEtco2 && !etco2Loaded) {
      startEtco2Loading()
      return
    }
    if (!willShowEtco2 && etco2Loading) {
      cancelEtco2Loading()
    }
  }, [
    cancelEtco2Loading,
    controller,
    etco2Loaded,
    etco2Loading,
    onStudentEvent,
    startEtco2Loading,
  ])

  const defib = useDefibSequence({
    patientMode: controller.patientMode,
    rhythm: confirmed.rhythm,
    chargePolicy: isWagamiA ? 'wagamiA' : 'default',
    analysisInterference: isWagamiA && cprOverrideActive ? 'cpr_compression' : null,
    playPrompt: isWagamiA
      ? (prompt) => playWagamiADefibPrompt(wagamiAPreferenceState.preferences.locale, prompt)
      : undefined,
    playCprPrompt: isWagamiA
      ? (onEnded) => playWagamiACprPrompt(
          wagamiAPreferenceState.preferences.locale,
          onEnded,
        )
      : undefined,
    onAnalyzeResult(result, analyzedRhythm, interference) {
      controller.onAnalyzeResult(result, createEventLogStamp())
      const label = result === 'shock'
        ? 'Analyze - Shock'
        : result === 'halted'
          ? 'Analyze - Halted'
          : 'Analyze - No Shock'
      onStudentEvent?.({
        kind: 'analyze',
        label,
        payload: result === 'halted'
          ? { result, underlyingRhythm: analyzedRhythm, reason: interference }
          : { result, rhythm: analyzedRhythm },
      })
    },
  })
  const cprTimer = useCPRTimer(defib.state === 'cpr' ? defib.cprStartTime : null)
  const wagamiAShockPressedRef = useRef(false)
  const wagamiAWasMutedRef = useRef(controller.isMuted)

  useEffect(() => {
    if (isWagamiA && defib.state === 'cpr' && cprTimer.isDone) {
      stopCprAudioSequence()
    }
  }, [cprTimer.isDone, defib.state, isWagamiA])

  useEffect(() => {
    const wasMuted = wagamiAWasMutedRef.current
    wagamiAWasMutedRef.current = controller.isMuted
    if (
      isWagamiA &&
      wasMuted &&
      !controller.isMuted &&
      defib.state === 'cpr' &&
      defib.cprStartTime !== null &&
      !cprTimer.isDone
    ) {
      playCprMetronome()
    }
  }, [controller.isMuted, cprTimer.isDone, defib.cprStartTime, defib.state, isWagamiA])

  useEffect(() => {
    if (defib.state !== 'charged') wagamiAShockPressedRef.current = false
  }, [defib.state])
  const resetDefib = defib.reset
  const defibResetVersionRef = useRef(monitorResetVersion)

  useEffect(() => {
    if (defibResetVersionRef.current === monitorResetVersion) return
    defibResetVersionRef.current = monitorResetVersion
    if (!isWagamiZ) resetDefib()
  }, [isWagamiZ, monitorResetVersion, resetDefib])

  const displayedHr = cprHeartRate ?? confirmed.hr
  const displayedHrActive = cprOverrideActive || confirmedVitalActive.hr
  const automaticDisplayedHr = useAutomaticDisplayHeartRate({
    enabled:
      controller.isPoweredOn &&
      confirmedVitalActive.hr &&
      !cprOverrideActive,
    rhythm: confirmed.rhythm,
    underlyingHeartRate: displayedHr,
    sync: heartRateDisplaySync,
  })
  const effectiveClinicalHr =
    displayedHrActive && confirmed.rhythm === 'torsades'
      ? automaticDisplayedHr
      : displayedHr
  const visibleFcHr =
    displayedHrActive && confirmed.rhythm === 'vf'
      ? automaticDisplayedHr
      : effectiveClinicalHr

  const alarmVitals = {
    ...confirmed,
    hr: effectiveClinicalHr,
    bp_sys: acceptedBp.bp_sys,
    bp_dia: acceptedBp.bp_dia,
  }
  const alarmActive = {
    ...confirmedVitalActive,
    hr: cprOverrideActive ? true : confirmedVitalActive.hr,
    bp_sys: acceptedBpActive.bp_sys,
    bp_dia: acceptedBpActive.bp_dia,
  }
  const {
    phase: nibpPhase,
    displayValue: nibpDisplayValue,
    handlePatientEvent,
    cancelReading: cancelNibpReading,
  } = useNibpReading(
    {
      bpSys: confirmed.bp_sys,
      bpDia: confirmed.bp_dia,
      active: {
        bp_sys: confirmedVitalActive.bp_sys,
        bp_dia: confirmedVitalActive.bp_dia,
      },
    },
    (snapshot) => {
      acceptBpReading(
        { bp_sys: snapshot.bpSys, bp_dia: snapshot.bpDia },
        snapshot.active,
      )
      onStudentEvent?.({
        kind: 'nibp_result',
        label: `NIBP ${snapshot.bpSys}/${snapshot.bpDia}`,
        payload: { bp_sys: snapshot.bpSys, bp_dia: snapshot.bpDia },
      })
    },
  )
  const isNibpReadingActive =
    nibpPhase === 'please_wait' ||
    nibpPhase === 'reading' ||
    nibpPhase === 'counting'
  const audioAlarmActive = {
    ...alarmActive,
    bp_sys: isNibpReadingActive ? false : alarmActive.bp_sys,
    bp_dia: isNibpReadingActive ? false : alarmActive.bp_dia,
  }
  const alarm = useAlarm(
    alarmVitals,
    controller.isPoweredOn,
    controller.isMuted || isWagamiZ,
    true,
    audioAlarmActive,
  )
  const bpButtonEnabled =
    acceptedBpActive.bp_sys ||
    acceptedBpActive.bp_dia ||
    confirmedVitalActive.bp_sys ||
    confirmedVitalActive.bp_dia

  const wagamiAWorkspace = useWagamiAWorkspaceWithPreferences({
    rhythm: confirmed.rhythm,
    hr: effectiveClinicalHr,
    monitorResetVersion,
    onStudentEvent,
    patientInfo,
    onPatientAgeChange: setPatientAge,
    onPatientSexChange: setPatientSex,
    preferenceState: wagamiAPreferenceState,
  })

  const acceptedBpDisplayActive = acceptedBpActive.bp_sys || acceptedBpActive.bp_dia
  const displayedEtco2 = isWagamiA
    ? wagamiAWorkspace.etco2Status === 'calibrated' && confirmedVitalActive.etco2
      ? confirmed.etco2
      : null
    : etco2Loaded
      ? confirmedVitalActive.etco2
        ? confirmed.etco2
        : 0
      : null
  const vitalLogSnapshot = useMemo(
    () => ({
      fc: displayedHrActive ? effectiveClinicalHr : null,
      pniSys: acceptedBpActive.bp_sys ? acceptedBp.bp_sys : null,
      pniDia: acceptedBpActive.bp_dia ? acceptedBp.bp_dia : null,
      etco2: displayedEtco2,
      spo2: confirmedVitalActive.spo2 ? confirmed.spo2 : null,
    }),
    [
      acceptedBp.bp_dia,
      acceptedBp.bp_sys,
      acceptedBpActive.bp_dia,
      acceptedBpActive.bp_sys,
      confirmed.spo2,
      confirmedVitalActive.spo2,
      displayedHrActive,
      effectiveClinicalHr,
      displayedEtco2,
    ],
  )
  const vitalLog = useVitalLog({
    elapsedSeconds: sessionElapsedSeconds,
    isRunning: controller.isTimerRunning,
    snapshot: vitalLogSnapshot,
    intervalMinutes: isWagamiA
      ? wagamiAPreferenceState.preferences.vitalLogInterval
      : undefined,
  })
  const { showCallInfo: showWagamiACallInfo, onMonitorReady: onWagamiAMonitorReady } = useWagamiACallInfoCover(wagamiAWorkspace.view)
  const activeNibpMode = isWagamiA ? wagamiAWorkspace.nibpMode : controller.nibpMode
  const activeNibpAutoInterval = isWagamiA
    ? wagamiAWorkspace.nibpAutoInterval
    : controller.nibpAutoInterval
  const { handleManualTrigger: handleScheduledPatientEvent } = useNibpAutoMode({
    enabled:
      controller.isPoweredOn &&
      activeNibpMode === 'automatic' &&
      bpButtonEnabled,
    intervalMinutes: activeNibpAutoInterval,
    readingActive: isNibpReadingActive,
    onTrigger: handlePatientEvent,
  })
  /**
   * The BP button press, logged separately from the reading it produces.
   * The evaluator grades ordering, so *when the trainee reached for it* is the
   * fact that matters -- the result lands ~8s later, after the cuff cycle.
   */
  const handleBpButtonPress = useCallback(() => {
    if (!isNibpReadingActive) {
      onStudentEvent?.({
        kind: 'nibp_start',
        label: 'NIBP Start',
        payload: {
          mode: activeNibpMode,
          intervalMinutes:
            activeNibpMode === 'automatic' ? activeNibpAutoInterval : null,
        },
      })
    }
    handleScheduledPatientEvent()
  }, [
    activeNibpAutoInterval,
    activeNibpMode,
    handleScheduledPatientEvent,
    isNibpReadingActive,
    onStudentEvent,
  ])
  const vitalLogTotalPages = Math.max(
    1,
    Math.ceil(vitalLog.length / VITAL_LOG_ITEMS_PER_PAGE),
  )
  const vitalLogHasPagination = vitalLogTotalPages > 1

  const visibleAlarms = useMemo(
    () =>
      isNibpReadingActive
        ? alarm.activeAlarms.filter((channel) => channel !== 'bp')
        : alarm.activeAlarms,
    [alarm.activeAlarms, isNibpReadingActive],
  )
  const wagamiADisplay = useMemo(
    () => ({
      vitals: {
        ...confirmed,
        hr: visibleFcHr,
        bp_sys: acceptedBp.bp_sys,
        bp_dia: acceptedBp.bp_dia,
        etco2: displayedEtco2 ?? confirmed.etco2,
      },
      active: {
        ...confirmedVitalActive,
        hr: displayedHrActive,
        bp_sys: acceptedBpActive.bp_sys,
        bp_dia: acceptedBpActive.bp_dia,
        etco2: displayedEtco2 !== null,
      },
      alarms: visibleAlarms,
      simulated: false,
    }),
    [
      acceptedBp.bp_dia,
      acceptedBp.bp_sys,
      acceptedBpActive.bp_dia,
      acceptedBpActive.bp_sys,
      confirmed,
      confirmedVitalActive,
      displayedEtco2,
      displayedHrActive,
      visibleAlarms,
      visibleFcHr,
    ],
  )
  const wagamiAProjection = useMemo<WagamiAProjectionState | undefined>(
    () => isWagamiA ? {
      waveformResetVersion: monitorResetVersion,
      view: wagamiAWorkspace.view,
      preferences: wagamiAWorkspace.preferences,
      etco2CalibrationStatus: wagamiAWorkspace.etco2Status,
      etco2CalibrationStartedAt: wagamiAWorkspace.etco2StartedAt,
      etco2CalibrationEndsAt: wagamiAWorkspace.etco2EndsAt,
      etco2CancellationEndsAt: wagamiAWorkspace.etco2CancellationEndsAt,
      patientMode: controller.patientMode,
      nibpMode: wagamiAWorkspace.nibpMode,
      nibpAutoInterval: wagamiAWorkspace.nibpAutoInterval,
      medicationEvents: wagamiAWorkspace.medicationEvents,
      vitalLog,
      twelveLead: wagamiAWorkspace.twelveLead,
    } : undefined,
    [
      controller.patientMode,
      isWagamiA,
      monitorResetVersion,
      vitalLog,
      wagamiAWorkspace.etco2Status,
      wagamiAWorkspace.etco2StartedAt,
      wagamiAWorkspace.etco2EndsAt,
      wagamiAWorkspace.etco2CancellationEndsAt,
      wagamiAWorkspace.medicationEvents,
      wagamiAWorkspace.nibpAutoInterval,
      wagamiAWorkspace.nibpMode,
      wagamiAWorkspace.preferences,
      wagamiAWorkspace.twelveLead,
      wagamiAWorkspace.view,
    ],
  )
  // Timed defib phases are reconstructed from absolute timestamps by the
  // spectator, so requestAnimationFrame progress does not generate network
  // traffic on every painted frame.
  const projectionDefibProgress =
    defib.phaseStartedAt === null ? defib.progress : 0

  const projection = useMemo<MonitorProjection>(
    () => ({
      version: MONITOR_PROJECTION_VERSION,
      capturedAt: new Date().toISOString(),
      model: activeDefibrillatorModel,
      surface: showDispatchCallerPage ? 'dispatch' : 'monitor',
      powerState: devicePowerState,
      powerStateEndsAt: isWagamiA ? wagamiAStartup.startupEndsAt : null,
      date,
      time,
      sessionTimer,
      responseTimer: responseTimer.formatted,
      countdownFormatted: countdown.formatted,
      countdownDone: countdown.isDone,
      gateSatisfied,
      callerInfoVariant,
      callerInfo: callerInfoConfirmed,
      dispatchRoute: hospitalRouting.effectiveRoute,
      hospitalMap: hospitalRouting.mapState,
      dispatch: dispatchState,
      patientInfo,
      confirmed,
      confirmedVitalActive,
      acceptedBp,
      acceptedBpActive,
      controller: controller.snapshot,
      activeSelectedControl: controller.activeSelectedControl,
      displayAge: controller.displayAge,
      displaySex: controller.displaySex,
      displayedHr: effectiveClinicalHr,
      displayedHrActive,
      vfDisplayedHr: visibleFcHr,
      displayedEtco2,
      cprOverrideActive,
      etco2Loading,
      etco2Loaded,
      nibp: {
        enabled: bpButtonEnabled,
        phase: nibpPhase,
        displayValue: nibpDisplayValue,
      },
      alarms: visibleAlarms,
      defib: {
        state: defib.state,
        energy: defib.energy,
        shockCount: defib.shockCount,
        progress: projectionDefibProgress,
        chargeOrigin: defib.chargeOrigin,
        phaseStartedAt: defib.phaseStartedAt,
        phaseEndsAt: defib.phaseEndsAt,
        cprStartTime: defib.cprStartTime,
        lastDeliveredJoules: defib.lastDeliveredJoules,
        canAnalyse: defib.canAnalyse,
        canCharge: defib.canCharge,
        canShock: defib.canShock,
        canAdjustEnergy: defib.canAdjustEnergy,
      },
      mergedEventLog,
      vitalLog,
      wagamiA: wagamiAProjection,
    }),
    [
      acceptedBp,
      acceptedBpActive,
      activeDefibrillatorModel,
      bpButtonEnabled,
      callerInfoConfirmed,
      callerInfoVariant,
      confirmed,
      confirmedVitalActive,
      controller.snapshot,
      controller.activeSelectedControl,
      controller.displayAge,
      controller.displaySex,
      countdown.formatted,
      countdown.isDone,
      cprOverrideActive,
      date,
      devicePowerState,
      hospitalRouting.effectiveRoute,
      hospitalRouting.mapState,
      dispatchState,
      displayedEtco2,
      displayedHrActive,
      effectiveClinicalHr,
      etco2Loaded,
      etco2Loading,
      gateSatisfied,
      isWagamiA,
      mergedEventLog,
      nibpDisplayValue,
      nibpPhase,
      patientInfo,
      responseTimer.formatted,
      sessionTimer,
      showDispatchCallerPage,
      time,
      visibleFcHr,
      visibleAlarms,
      vitalLog,
      wagamiAProjection,
      wagamiAStartup.startupEndsAt,
      defib.canAdjustEnergy,
      defib.canAnalyse,
      defib.canCharge,
      defib.canShock,
      defib.chargeOrigin,
      defib.cprStartTime,
      defib.energy,
      defib.lastDeliveredJoules,
      projectionDefibProgress,
      defib.phaseStartedAt,
      defib.phaseEndsAt,
      defib.shockCount,
      defib.state,
    ],
  )

  useEffect(() => {
    onProjectionChange?.(projection)
  }, [onProjectionChange, projection])

  useDefibAudio(
    defib.state,
    controller.isMuted || isWagamiZ || !controller.isPoweredOn,
  )

  const handlePowerOn = () => {
    onStudentEvent?.({ kind: 'power_on', label: 'Power On' })
    controller.onPowerOn()
  }

  const handlePowerOff = () => {
    onStudentEvent?.({ kind: 'power_off', label: 'Power Off' })
    stopAllAudio()
    if (etco2Loading) cancelEtco2Loading()
    cancelNibpReading()
    controller.onPowerOff()
    defib.reset()
    setAudioMuted(false)
  }

  const handleWagamiAPowerToggle = () => {
    if (devicePowerState === 'on') {
      wagamiAWorkspace.onDevicePowerOff()
      handlePowerOff()
      wagamiAStartup.powerOff()
      return
    }
    if (devicePowerState === 'booting') {
      wagamiAStartup.cancel()
      return
    }
    wagamiAStartup.start()
  }

  const handleWagamiACharge = () => {
    if (!controller.isPoweredOn || !defib.canCharge) return
    onStudentEvent?.({
      kind: 'charge',
      label: 'Charge',
      payload: { joules: defib.energy, state: defib.state },
    })
    defib.onCharge()
  }

  const handleWagamiAShock = () => {
    if (
      !controller.isPoweredOn ||
      !defib.canShock ||
      wagamiAShockPressedRef.current
    ) return
    wagamiAShockPressedRef.current = true
    onStudentEvent?.({
      kind: 'shock',
      label: 'Shock',
      payload: { joules: defib.energy, state: defib.state },
    })
    defib.onShock()
  }

  const handleWagamiAEnergyChange = (direction: 'up' | 'down') => {
    if (!controller.isPoweredOn || !defib.canAdjustEnergy) return
    const nextEnergy = direction === 'up'
      ? energyUp(
          { patientMode: controller.patientMode, energy: defib.energy },
          controller.patientMode,
        ).energy
      : energyDown(
          { patientMode: controller.patientMode, energy: defib.energy },
          controller.patientMode,
        ).energy
    onStudentEvent?.({
      kind: 'energy_change',
      label: direction === 'up' ? 'Energy Up' : 'Energy Down',
      payload: { from: defib.energy, to: nextEnergy },
    })
    if (direction === 'up') defib.onEnergyUp()
    else defib.onEnergyDown()
  }

  const useRestingVitalLayout =
    defib.state === 'idle' &&
    !controller.isTwelveLead &&
    controller.bottomStatusVisible

  const screen = (
    <div className="relative h-full w-full">
      {/* Removed jumpscare: Chica overlay/video is disabled and left here only as history.
      {controller.jumpscareActive && (
        <div
          className="absolute inset-0 z-50 bg-black"
          onClick={() => controller.onSetJumpscareActive(false)}
        >
          <video
            src="/videos/chica_jumpscare.mp4"
            autoPlay
            playsInline
            className="h-full w-full object-cover"
            onEnded={() => controller.onSetJumpscareActive(false)}
          />
        </div>
      )} */}
      <MonitorLayout
        topBar={
          <TopStatusBar
            date={date}
            time={time}
            patientMode={controller.patientMode}
            patientModeActive={controller.patientModalOpen}
            batteryPercent={85}
            sessionTimer={sessionTimer}
            selected={controller.activeSelectedControl}
          />
        }
        subBar={
          <SubBar
            selected={controller.activeSelectedControl}
            onToggleBottomStatus={controller.onToggleBottomStatus}
          />
        }
        sidebar={
          <LeftSidebar
            twelveLeadActive={controller.isTwelveLead}
            etco2Active={controller.secondary === 'etco2'}
            medicationMode={controller.medicationMode}
            medicationPage={controller.medicationPage}
            activeMed={controller.flashedMed}
            printActive={controller.printPreviewOpen}
            twelveLeadTransmissionReady={controller.twelveLeadTransmissionReady}
            twelveLeadTransmissionOpen={controller.twelveLeadTransmissionOpen}
          />
        }
        main={
          <ContinuousWaveformSurface
            temporarySurfaceActive={controller.isTwelveLead}
            temporarySurface={({ occluded, onReady }) => (
              <TwelveLeadPage
                rhythm={confirmed.rhythm}
                hr={confirmed.hr}
                occluded={occluded}
                onReady={onReady}
              />
            )}
            waveform={({ occluded, onReady }) => (
              <WaveformPanel
                secondaryChannel={controller.secondary}
                rhythm={confirmed.rhythm}
                hr={effectiveClinicalHr}
                spo2={confirmed.spo2}
                etco2={confirmed.etco2}
                spo2Waveform={confirmed.spo2_waveform}
                etco2Waveform={confirmed.etco2_waveform}
                showAllSecondaryChannels={!controller.bottomStatusVisible}
                selected={controller.activeSelectedControl}
                etco2Calibrated={etco2Loaded}
                etco2Loading={etco2Loading}
                cprOverride={cprOverrideActive}
                occluded={occluded}
                onReady={onReady}
              />
            )}
          />
        }
        vitalsPlacement={useRestingVitalLayout ? 'bottom' : 'right'}
        vitals={
          <VitalsStrip
            hr={displayedHrActive ? visibleFcHr : ''}
            pulseHeartRate={effectiveClinicalHr}
            bpSys={acceptedBpDisplayActive ? acceptedBp.bp_sys : ''}
            bpDia={acceptedBpDisplayActive ? acceptedBp.bp_dia : ''}
            etco2={displayedEtco2 ?? ''}
            spo2={confirmedVitalActive.spo2 ? confirmed.spo2 : 'SpO2 OFF'}
            spo2Waveform={confirmed.spo2_waveform}
            spo2Unit={confirmedVitalActive.spo2 ? '%' : ''}
            activeAlarms={visibleAlarms}
            searching={false}
            selected={controller.activeSelectedControl}
            nibpPhase={bpButtonEnabled ? nibpPhase : undefined}
            nibpDisplayValue={bpButtonEnabled ? nibpDisplayValue : undefined}
            orientation={useRestingVitalLayout ? 'horizontal' : 'vertical'}
          />
        }
        energyColumn={
          !controller.isTwelveLead ? (
            ['charge_prompt', 'charging', 'charged'].includes(defib.state) ? (
              <EnergyScaleColumn
                progress={defib.progress}
                isCharged={defib.state === 'charged'}
                selectedEnergy={defib.energy}
              />
            ) : defib.state === 'delivered' ? (
              <div className="w-full h-full bg-black border-l border-neutral-800 flex flex-col" />
            ) : null
          ) : null
        }
        bottomBar={
          useRestingVitalLayout ||
          controller.isTwelveLead ||
          !controller.bottomStatusVisible ? null : (
            <BottomStatusBar
              defibState={defib.state}
              joules={defib.energy}
              shockCount={defib.shockCount}
              cprStartTime={defib.cprStartTime}
              lastDeliveredJoules={defib.lastDeliveredJoules}
            />
          )
        }
      />
      <PatientInfoPanel
        open={controller.patientInfoOpen}
        age={controller.displayAge}
        sex={controller.displaySex}
        selectedField={controller.selectedField}
        editing={controller.editing}
      />
      <TwelveLeadTransmissionPanel
        open={controller.twelveLeadTransmissionOpen}
        highlightedIndex={controller.twelveLeadTransmissionHighlightedIndex}
        sentDestination={controller.twelveLeadSentDestination}
        sentUntil={controller.twelveLeadSentUntil}
      />
      <EventLogModal
        open={controller.eventLogOpen}
        log={mergedEventLog}
        page={controller.eventLogPage}
        highlightedButton={controller.eventLogHighlightedButton}
      />
      <VitalLogModal
        open={controller.vitalLogOpen}
        log={vitalLog}
        page={controller.vitalLogPage}
        highlightedButton={controller.vitalLogHighlightedButton}
      />
      {controller.isTwelveLead && controller.captureState === 'acquiring' && (
        <div className="absolute inset-0 z-40">
          <AcquiringDialog durationMs={ACQUIRE_MS} />
        </div>
      )}
      {controller.isTwelveLead && controller.captureState === 'result' && (
        <div className="absolute inset-0 z-40">
          <TwelveLeadPrintout
            rhythm={controller.capturedRhythm}
            hr={controller.capturedHr}
          />
        </div>
      )}
      {!controller.isTwelveLead && controller.printPreviewOpen && controller.lastCapture && (
        <div className="absolute inset-0 z-40">
          <TwelveLeadPrintout
            rhythm={controller.lastCapture.rhythm}
            hr={controller.lastCapture.hr}
          />
        </div>
      )}
    </div>
  )

  if (showDispatchCallerPage) {
    return (
      <CallerInfoModal
        open
        info={callerInfoConfirmed}
        onCallerEvent={onCallerEvent}
        buttonState={callerButtonState}
        showCountdown={dispatchState.countdownLocked}
        countdownFormatted={countdown.formatted}
        responseFormatted={responseTimer.formatted}
        fullScreen
        variant={callerInfoVariant}
        canEnterMonitor={gateSatisfied}
        onEnterMonitor={enterCurrentDispatch}
        onBack={gateSatisfied ? enterCurrentDispatch : undefined}
        route={hospitalRouting.effectiveRoute}
        hospitalMap={hospitalRouting.mapState}
        transported={dispatchState.transportedAt !== null}
        atHospital={hospitalRouting.atHospital}
        onOpenHospitalDirectory={hospitalRouting.openDirectory}
        onCloseHospitalDirectory={hospitalRouting.closeDirectory}
        onMapFullscreenChange={hospitalRouting.setFullscreen}
        onSelectHospital={hospitalRouting.selectHospital}
        alertFlash={callerInfoAlertFlash}
      />
    )
  }

  if (activeDefibrillatorModel === 'wagamiA') {
    const patientModeLocked = isWagamiAPatientModeLocked(defib.state)
    return (
      <main
        data-testid="wagami-a-live"
        className="fixed inset-0 grid h-screen w-screen min-w-[1024px] place-items-center overflow-hidden bg-wagami-a-backdrop text-wagami-a-text max-[1023px]:min-w-0"
      >
        <div className="hidden max-[1023px]:grid max-[1023px]:place-items-center max-[1023px]:p-8 max-[1023px]:text-center">
          <div className="font-sans text-xl font-semibold">
            {wagamiAWorkspace.preferences.locale === 'fr'
              ? 'Affichage paysage requis'
              : 'Landscape display required'}
          </div>
          <p className="mt-3 text-wagami-a-muted-text">
            {wagamiAWorkspace.preferences.locale === 'fr'
              ? 'Utilisez un iPad compatible en mode paysage ou un écran de 1024 pixels minimum.'
              : 'Use a supported iPad in landscape or a display at least 1024 pixels wide.'}
          </p>
        </div>
        <div aria-hidden={showWagamiACallInfo ? true : undefined} className={cn('max-[1023px]:hidden', showWagamiACallInfo && 'invisible pointer-events-none')}>
          <WagamiADevice
            display={wagamiADisplay}
            energy={defib.energy}
            defibState={defib.state}
            chargeProgress={defib.chargeProgress}
            chargeOrigin={defib.chargeOrigin}
            cprTime={defib.state === 'cpr' ? cprTimer.formatted : '--:--'}
            cprOverride={cprOverrideActive}
            nibpPhase={nibpPhase}
            nibpDisplayValue={nibpDisplayValue}
            bpReadingActive={isNibpReadingActive}
            powerState={devicePowerState}
            onPowerToggle={handleWagamiAPowerToggle}
            patientMode={controller.patientMode}
            patientModeLocked={patientModeLocked}
            muted={controller.isMuted}
            canAnalyse={defib.canAnalyse}
            canCharge={defib.canCharge}
            canShock={defib.canShock}
            canReadBP={bpButtonEnabled}
            canAdjustEnergy={defib.canAdjustEnergy}
            onAnalyse={defib.onAnalyse}
            onCharge={handleWagamiACharge}
            onShock={handleWagamiAShock}
            onMute={controller.onToggleMute}
            onPatientModeCycle={() => {
              if (!patientModeLocked) {
                controller.onSelectPatientMode(
                  nextWagamiAPatientMode(controller.patientMode),
                )
              }
            }}
            onReadBP={handleBpButtonPress}
            onEnergyDown={() => handleWagamiAEnergyChange('down')}
            onEnergyUp={() => handleWagamiAEnergyChange('up')}
            onTask={wagamiAWorkspace.openTask}
            navigationView={wagamiAWorkspace.twelveLead.patientInfoOpen
              ? 'twelveLeadPatientInfo'
              : wagamiAWorkspace.view}
            secondaryActions={wagamiAWorkspace.twelveLead.patientInfoOpen
              ? wagamiAWorkspace.patientInfoActions
              : wagamiAWorkspace.view === 'monitor'
                ? undefined
                : [{ id: 'back', enabled: wagamiAWorkspace.twelveLead.sentUntil === null, activate: wagamiAWorkspace.goBack }]}
            screenContent={(selectedAction) => (
              <WagamiAWorkspace
                controller={wagamiAWorkspace}
                display={wagamiADisplay}
                energy={defib.energy}
                defibState={defib.state}
                chargeProgress={defib.chargeProgress}
                chargeOrigin={defib.chargeOrigin}
                cprTime={defib.state === 'cpr' ? cprTimer.formatted : '--:--'}
                cprOverride={cprOverrideActive}
                nibpPhase={nibpPhase}
                nibpDisplayValue={nibpDisplayValue}
                patientMode={controller.patientMode}
                canAdjustEnergy={defib.canAdjustEnergy}
                onEnergyDown={() => handleWagamiAEnergyChange('down')}
                onEnergyUp={() => handleWagamiAEnergyChange('up')}
                selectedAction={selectedAction}
                onMonitorReady={onWagamiAMonitorReady}
                date={date}
                time={time}
                sessionTimer={sessionTimer}
                waveformSequenceKey={monitorResetVersion}
                vitalLog={vitalLog}
              />
            )}
            locale={wagamiAWorkspace.preferences.locale}
            shellAlarmLedEnabled={wagamiAWorkspace.preferences.shellAlarmLedEnabled}
            date={date}
            time={time}
            sessionTimer={sessionTimer}
          />
        </div>
        {showWagamiACallInfo ? (
          <div className="absolute inset-0 z-30 h-full w-full max-[1023px]:hidden">
            <WagamiACallInfoPage
              locale={wagamiAWorkspace.preferences.locale}
              patientMode={controller.patientMode}
              alarms={wagamiADisplay.alarms}
              onBack={wagamiAWorkspace.goBack}
              callerInfo={{
                info: callerInfoConfirmed,
                onCallerEvent,
                buttonState: callerButtonState,
                showCountdown: dispatchState.countdownLocked,
                countdownFormatted: countdown.formatted,
                responseFormatted: responseTimer.formatted,
                variant: callerInfoVariant,
                mapContained: false,
                canEnterMonitor: true,
                onEnterMonitor: wagamiAWorkspace.goBack,
                route: hospitalRouting.effectiveRoute,
                hospitalMap: hospitalRouting.mapState,
                transported: dispatchState.transportedAt !== null,
                atHospital: hospitalRouting.atHospital,
                onOpenHospitalDirectory: hospitalRouting.openDirectory,
                onCloseHospitalDirectory: hospitalRouting.closeDirectory,
                onMapFullscreenChange: hospitalRouting.setFullscreen,
                onSelectHospital: hospitalRouting.selectHospital,
              }}
            />
          </div>
        ) : null}
      </main>
    )
  }

  if (isWagamiZ) {
    return (
      <WagamiZDevice
        initialPowerState={devMode === '2' ? 'on' : 'off'}
        onPowerStateChange={setDevicePowerState}
        date={date}
        time={time}
        sessionTimer={sessionTimer}
        patientMode={controller.patientMode}
        rhythm={confirmed.rhythm}
        heartRate={visibleFcHr}
        spo2={confirmed.spo2}
        etco2={confirmed.etco2}
        bpSys={confirmed.bp_sys}
        bpDia={confirmed.bp_dia}
        joules={defib.energy}
        shockCount={defib.shockCount}
        spo2Waveform={confirmed.spo2_waveform}
        etco2Waveform={confirmed.etco2_waveform}
        active={{
          ...confirmedVitalActive,
          hr: displayedHrActive,
        }}
        cprOverride={cprOverrideActive}
        onPowerOn={handlePowerOn}
        onPowerOff={handlePowerOff}
      />
    )
  }

  return (
    <div
      data-testid="monitor-viewport"
      className="fixed inset-0 h-[100lvh] w-[100lvw] overflow-hidden overscroll-none"
    >
      <DeviceShell
        screen={screen}
        initialPowerState={devBypass ? 'on' : 'off'}
        onPowerStateChange={setDevicePowerState}
        powerLocked={powerLocked}
        lockScreen={standbyLockScreen}
        screenModal={
          <>
            <PatientModeModal
              open={controller.patientModalOpen}
              current={controller.patientMode}
              highlighted={
                PATIENT_MODE_OPTIONS[controller.patientModeHighlightedIndex]?.value ?? 'adult'
              }
              onSelect={controller.onSelectPatientMode}
              onClose={controller.onClosePatientModal}
            />
            <NibpModal
              open={controller.nibpModalOpen}
              highlightedRow={controller.nibpHighlightedRow}
              focusSide={controller.nibpFocusSide}
              mode={controller.nibpMode}
              autoInterval={controller.nibpAutoInterval}
            />
          </>
        }
        twelveLeadActive={controller.isTwelveLead}
        captureLock={controller.captureLock}
        twelveLeadTransmissionOpen={controller.twelveLeadTransmissionOpen}
        twelveLeadTransmissionBusy={controller.twelveLeadTransmissionBusy}
        twelveLeadTransmissionReady={controller.twelveLeadTransmissionReady}
        defib={{
          state: defib.state,
          energy: defib.energy,
          progress: defib.progress,
          canAnalyse: defib.canAnalyse,
          canCharge: defib.canCharge,
          canShock: defib.canShock,
          canAdjustEnergy: defib.canAdjustEnergy,
          onAnalyse: defib.onAnalyse,
          onCharge: () => {
            onStudentEvent?.({
              kind: 'charge',
              label: 'Charge',
              payload: { joules: defib.energy, state: defib.state },
            })
            defib.onCharge()
          },
          onShock: () => {
            onStudentEvent?.({
              kind: 'shock',
              label: 'Shock',
              payload: { joules: defib.energy, state: defib.state },
            })
            defib.onShock()
          },
          onEnergyUp: () => {
            onStudentEvent?.({
              kind: 'energy_change',
              label: 'Energy Up',
              payload: {
                from: defib.energy,
                to: energyUp(
                  { patientMode: controller.patientMode, energy: defib.energy },
                  controller.patientMode,
                ).energy,
              },
            })
            defib.onEnergyUp()
          },
          onEnergyDown: () => {
            onStudentEvent?.({
              kind: 'energy_change',
              label: 'Energy Down',
              payload: {
                from: defib.energy,
                to: energyDown(
                  { patientMode: controller.patientMode, energy: defib.energy },
                  controller.patientMode,
                ).energy,
              },
            })
            defib.onEnergyDown()
          },
        }}
        softKeys={{
          onTwelveLead: () => {
            onStudentEvent?.({ kind: 'twelve_lead', label: '12-Lead' })
            controller.onTwelveLead()
          },
          onToggleEtco2: handleToggleEtco2,
          onTreatment: () => {
            onStudentEvent?.({ kind: 'treatment_menu', label: 'Treatment' })
            controller.onTreatment()
          },
          onLeftAnalyse: controller.onLeftAnalyse,
          onBack: controller.onBack,
          onPatientInfo: () => {
            onStudentEvent?.({ kind: 'patient_info', label: 'Patient Info' })
            controller.onPatientInfo()
          },
          onCaptureTwelveLead: () => {
            onStudentEvent?.({
              kind: 'twelve_lead_capture',
              label: '12-Lead Capture',
            })
            controller.onCaptureTwelveLead()
          },
          onTransmitTwelveLead: controller.onOpenTwelveLeadTransmission,
          onPrint: () => {
            onStudentEvent?.({ kind: 'print', label: 'Print' })
            controller.onPrint()
          },
        }}
        nav={{
          onHome: controller.onHome,
          onMoveUp: () => controller.onMoveUp(vitalLogHasPagination),
          onMoveDown: () => controller.onMoveDown(vitalLogHasPagination),
          onEnter: () => {
            const destination = controller.onEnter(vitalLogTotalPages)
            if (destination) {
              onStudentEvent?.({
                kind: 'twelve_lead_send',
                label: `12-lead sent — ${destination}`,
                payload: { hospital: destination },
              })
            }
          },
        }}
        meds={{
          mode: controller.medicationMode,
          page: controller.medicationPage,
          onMedClick: (name) => {
            const stamp = createEventLogStamp()
            controller.onMedClick(name, stamp)
            onStudentEvent?.({
              kind: 'medication',
              label: name,
              payload: { time: stamp.time },
            })
          },
          onMedPageChange: controller.onMedPageChange,
          onMedInfo: controller.onMedInfo,
          onMedBack: controller.onMedBack,
        }}
        power={{
          onPowerOn: handlePowerOn,
          onPowerOff: handlePowerOff,
        }}
        audio={{
          isMuted: controller.isMuted,
          onToggleMute: controller.onToggleMute,
          onPatientEvent: bpButtonEnabled ? handleBpButtonPress : undefined,
        }}
      />
      <CallerInfoModal
        open={controller.callerInfoOpen}
        info={callerInfoConfirmed}
        onCallerEvent={onCallerEvent}
        buttonState={callerButtonState}
        fullScreen
        variant={callerInfoVariant}
        onBack={controller.onBack}
        canEnterMonitor
        onEnterMonitor={controller.onBack}
        responseFormatted={responseTimer.formatted}
        showCountdown={dispatchState.countdownLocked}
        countdownFormatted={countdown.formatted}
        route={hospitalRouting.effectiveRoute}
        hospitalMap={hospitalRouting.mapState}
        transported={dispatchState.transportedAt !== null}
        atHospital={hospitalRouting.atHospital}
        onOpenHospitalDirectory={hospitalRouting.openDirectory}
        onCloseHospitalDirectory={hospitalRouting.closeDirectory}
        onMapFullscreenChange={hospitalRouting.setFullscreen}
        onSelectHospital={hospitalRouting.selectHospital}
      />
    </div>
  )
}

// useSearchParams requires a Suspense boundary in the App Router.
export default function MonitorPageRoute() {
  return (
    <Suspense fallback={null}>
      <MonitorPageOrLanding />
    </Suspense>
  )
}

function MonitorPageOrLanding() {
  const searchParams = useSearchParams()
  if (searchParams.get('dev') === '3') {
    const callerInfoVariant: CallerInfoVariant = searchParams.get('callerInfoVariant') === 'classic' ? 'classic' : 'assignment'
    return <WagamiAPreview callerInfoVariant={callerInfoVariant} />
  }
  if (process.env.NODE_ENV === 'test') return <MonitorPage />
  if (searchParams.get('dev') === '1' || searchParams.get('dev') === '2') {
    return <MonitorPage />
  }
  return <SessionLandingPage />
}
