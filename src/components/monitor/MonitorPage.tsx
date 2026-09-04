'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DeviceShell } from '@/components/monitor/DeviceShell'
import { WagamiZDevice } from '@/components/monitor/WagamiZDevice'
import { MonitorLayout } from '@/components/monitor/MonitorLayout'
import { TopStatusBar } from '@/components/monitor/TopStatusBar'
import { SubBar } from '@/components/monitor/SubBar'
import { LeftSidebar } from '@/components/monitor/LeftSidebar'
import { WaveformPanel } from '@/components/monitor/WaveformPanel'
import { TwelveLeadPage } from '@/components/monitor/TwelveLeadPage'
import { TwelveLeadPrintout } from '@/components/monitor/TwelveLeadPrintout'
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
import { createEventLogStamp, sortEventLogEntries } from '@/lib/eventLog'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { playCallerInfoAlert, setAudioMuted, stopAllAudio } from '@/lib/audio'
import { SessionLandingPage } from '@/components/session/SessionLandingPage'
import { getCprHeartRate } from '@/types/vitals'
import { useVfDisplayHeartRate } from '@/hooks/useVfDisplayHeartRate'
import type { VfDisplaySync } from '@/lib/automaticHeartRate'
import {
  MONITOR_PROJECTION_VERSION,
  type MonitorProjection,
} from '@/types/monitorProjection'
import type { PowerState } from '@/components/monitor/DeviceShell'

const CALLER_INFO_ALERT_FLASH_MS = 2320

export type StudentEventRecord = {
  kind: string
  label: string
  payload?: unknown
}

export function MonitorPage({
  onStudentEvent,
  vfDisplaySync,
  onProjectionChange,
}: {
  onStudentEvent?: (event: StudentEventRecord) => void
  vfDisplaySync?: VfDisplaySync | null
  onProjectionChange?: (projection: MonitorProjection) => void
} = {}) {
  const { date, time } = useMonitorClock()

  useStoreHydration()
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
    else transportCall(stamp)
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
    onAnalyzeResult(result) {
      controller.onAnalyzeResult(result, createEventLogStamp())
      onStudentEvent?.({
        kind: 'analyze',
        label: result === 'shock' ? 'Analyze - Shock' : 'Analyze - No Shock',
        payload: { result, rhythm: confirmed.rhythm },
      })
    },
  })
  const resetDefib = defib.reset
  const defibResetVersionRef = useRef(monitorResetVersion)

  useEffect(() => {
    if (defibResetVersionRef.current === monitorResetVersion) return
    defibResetVersionRef.current = monitorResetVersion
    if (!isWagamiZ) resetDefib()
  }, [isWagamiZ, monitorResetVersion, resetDefib])

  const alarmVitals = {
    ...confirmed,
    hr: cprHeartRate ?? confirmed.hr,
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
  const { handleManualTrigger: handleScheduledPatientEvent } = useNibpAutoMode({
    enabled:
      controller.isPoweredOn &&
      controller.nibpMode === 'automatic' &&
      bpButtonEnabled,
    intervalMinutes: controller.nibpAutoInterval,
    readingActive: isNibpReadingActive,
    onTrigger: handlePatientEvent,
  })
  /**
   * The BP button press, logged separately from the reading it produces.
   * The evaluator grades ordering, so *when the trainee reached for it* is the
   * fact that matters -- the result lands ~11s later, after the cuff cycle.
   */
  const handleBpButtonPress = useCallback(() => {
    onStudentEvent?.({
      kind: 'nibp_start',
      label: 'NIBP Start',
      payload: {
        mode: controller.nibpMode,
        intervalMinutes:
          controller.nibpMode === 'automatic' ? controller.nibpAutoInterval : null,
      },
    })
    handleScheduledPatientEvent()
  }, [
    controller.nibpAutoInterval,
    controller.nibpMode,
    handleScheduledPatientEvent,
    onStudentEvent,
  ])

  const acceptedBpDisplayActive = acceptedBpActive.bp_sys || acceptedBpActive.bp_dia
  const displayedEtco2 = etco2Loaded
    ? confirmedVitalActive.etco2
      ? confirmed.etco2
      : 0
    : null
  const displayedHr = cprHeartRate ?? confirmed.hr
  const displayedHrActive = cprOverrideActive || confirmedVitalActive.hr
  const vfDisplayedHr = useVfDisplayHeartRate({
    enabled:
      controller.isPoweredOn &&
      confirmed.rhythm === 'vf' &&
      confirmedVitalActive.hr &&
      !cprOverrideActive,
    underlyingHeartRate: displayedHr,
    sync: vfDisplaySync,
  })

  const vitalLogSnapshot = useMemo(
    () => ({
      fc: displayedHrActive ? displayedHr : null,
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
      displayedHr,
      displayedHrActive,
      displayedEtco2,
    ],
  )
  const vitalLog = useVitalLog({
    elapsedSeconds: sessionElapsedSeconds,
    isRunning: controller.isTimerRunning,
    snapshot: vitalLogSnapshot,
  })
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
      date,
      time,
      sessionTimer,
      responseTimer: responseTimer.formatted,
      countdownFormatted: countdown.formatted,
      countdownDone: countdown.isDone,
      gateSatisfied,
      callerInfoVariant,
      callerInfo: callerInfoConfirmed,
      dispatchRoute: dispatchRouteConfirmed,
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
      displayedHr,
      displayedHrActive,
      vfDisplayedHr,
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
      dispatchRouteConfirmed,
      dispatchState,
      displayedEtco2,
      displayedHr,
      displayedHrActive,
      etco2Loaded,
      etco2Loading,
      gateSatisfied,
      mergedEventLog,
      nibpDisplayValue,
      nibpPhase,
      patientInfo,
      responseTimer.formatted,
      sessionTimer,
      showDispatchCallerPage,
      time,
      vfDisplayedHr,
      visibleAlarms,
      vitalLog,
      defib.canAdjustEnergy,
      defib.canAnalyse,
      defib.canCharge,
      defib.canShock,
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

  useDefibAudio(defib.state, controller.isMuted || isWagamiZ)

  const handlePowerOn = () => {
    onStudentEvent?.({ kind: 'power_on', label: 'Power On' })
    controller.onPowerOn()
  }

  const handlePowerOff = () => {
    onStudentEvent?.({ kind: 'power_off', label: 'Power Off' })
    if (etco2Loading) cancelEtco2Loading()
    cancelNibpReading()
    controller.onPowerOff()
    defib.reset()
    setAudioMuted(false)
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
          />
        }
        main={
          controller.isTwelveLead ? (
            <TwelveLeadPage rhythm={confirmed.rhythm} hr={confirmed.hr} />
          ) : (
            <WaveformPanel
              secondaryChannel={controller.secondary}
              rhythm={confirmed.rhythm}
              hr={displayedHr}
              spo2={confirmed.spo2}
              etco2={confirmed.etco2}
              spo2Waveform={confirmed.spo2_waveform}
              etco2Waveform={confirmed.etco2_waveform}
              showAllSecondaryChannels={!controller.bottomStatusVisible}
              selected={controller.activeSelectedControl}
              etco2Calibrated={etco2Loaded}
              etco2Loading={etco2Loading}
              cprOverride={cprOverrideActive}
            />
          )
        }
        vitalsPlacement={useRestingVitalLayout ? 'bottom' : 'right'}
        vitals={
          <VitalsStrip
            hr={displayedHrActive ? vfDisplayedHr : ''}
            pulseHeartRate={displayedHr}
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
        showCountdown={!countdown.isDone}
        countdownFormatted={countdown.formatted}
        responseFormatted={responseTimer.formatted}
        fullScreen
        variant={callerInfoVariant}
        canEnterMonitor={gateSatisfied}
        onEnterMonitor={enterCurrentDispatch}
        onBack={gateSatisfied ? enterCurrentDispatch : undefined}
        route={dispatchRouteConfirmed}
        alertFlash={callerInfoAlertFlash}
      />
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
        heartRate={displayedHrActive ? vfDisplayedHr : displayedHr}
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
    <div className="relative h-screen w-screen overflow-hidden">
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
          onPrint: () => {
            onStudentEvent?.({ kind: 'print', label: 'Print' })
            controller.onPrint()
          },
        }}
        nav={{
          onHome: controller.onHome,
          onMoveUp: () => controller.onMoveUp(vitalLogHasPagination),
          onMoveDown: () => controller.onMoveDown(vitalLogHasPagination),
          onEnter: () => controller.onEnter(vitalLogTotalPages),
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
        countdownFormatted={countdown.formatted}
        route={dispatchRouteConfirmed}
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
  if (process.env.NODE_ENV === 'test') return <MonitorPage />
  if (searchParams.get('dev') === '1' || searchParams.get('dev') === '2') {
    return <MonitorPage />
  }
  return <SessionLandingPage />
}
