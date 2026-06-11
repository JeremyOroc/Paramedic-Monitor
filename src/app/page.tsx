'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DeviceShell } from '@/components/monitor/DeviceShell'
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
import {
  CallerInfoModal,
  type CallerEventKey,
  type CallerInfoVariant,
} from '@/components/monitor/CallerInfoModal'
import { PatientInfoPanel } from '@/components/monitor/PatientInfoPanel'
import { EventLogModal } from '@/components/monitor/EventLogModal'
import { useDefibSequence } from '@/hooks/useDefibSequence'
import { useAlarm } from '@/hooks/useAlarm'
import { useMonitorController, ACQUIRE_MS } from '@/hooks/useMonitorController'
import { useMonitorClock } from '@/hooks/useMonitorClock'
import { useDefibAudio } from '@/hooks/useDefibAudio'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { useCountdown } from '@/hooks/useCountdown'
import { useNibpReading } from '@/hooks/useNibpReading'
import { formatEstTime } from '@/lib/estTime'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { setAudioMuted } from '@/lib/audio'

function MonitorPage() {
  const { date, time } = useMonitorClock()

  useStoreHydration()
  const confirmed = useMonitorStore((s) => s.confirmed)
  const confirmedVitalActive = useMonitorStore((s) => s.confirmedVitalActive)
  const acceptedBp = useMonitorStore((s) => s.acceptedBp)
  const acceptedBpActive = useMonitorStore((s) => s.acceptedBpActive)
  const acceptBpReading = useMonitorStore((s) => s.acceptBpReading)
  const callerInfoConfirmed = useMonitorStore((s) => s.callerInfoConfirmed)
  const patientInfo = useMonitorStore((s) => s.patientInfo)
  const setPatientAge = useMonitorStore((s) => s.setPatientAge)
  const setPatientSex = useMonitorStore((s) => s.setPatientSex)
  const dispatchState = useMonitorStore((s) => s.dispatch)
  const monitorResetVersion = useMonitorStore((s) => s.monitorResetVersion)
  const acknowledgeCall = useMonitorStore((s) => s.acknowledgeCall)
  const arriveCall = useMonitorStore((s) => s.arriveCall)
  const transportCall = useMonitorStore((s) => s.transportCall)
  const [etco2LoadState, setEtco2LoadState] = useState({
    resetVersion: monitorResetVersion,
    loading: false,
    loaded: false,
  })
  const etco2LoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const etco2Loading =
    etco2LoadState.resetVersion === monitorResetVersion && etco2LoadState.loading
  const etco2Loaded =
    etco2LoadState.resetVersion === monitorResetVersion && etco2LoadState.loaded

  const searchParams = useSearchParams()
  const devBypass = searchParams.get('dev') === '1'
  const callerInfoVariant: CallerInfoVariant =
    searchParams.get('callerInfoVariant') === 'classic' ? 'classic' : 'assignment'

  const controller = useMonitorController({
    confirmed,
    patientInfo,
    setPatientAge,
    setPatientSex,
    initialPoweredOn: devBypass,
  })
  const sessionTimer = useSessionTimer(controller.isTimerRunning)

  // Dispatch startup gate: countdown is travel-time to scene; the trainee must
  // Acknowledge, wait out the countdown, then mark Arrival before power unlocks.
  const countdown = useCountdown(dispatchState.countdownEndsAt)
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
    const est = formatEstTime()
    if (key === 'acknowledge') acknowledgeCall(est)
    else if (key === 'arrival') arriveCall(est)
    else transportCall(est)
  }

  const mergedEventLog = [...dispatchState.callerEvents, ...controller.eventLog]
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
    setEtco2LoadState((state) => ({ ...state, loading: false }))
  }, [clearEtco2LoadTimer])

  const startEtco2Loading = useCallback(() => {
    const resetVersion = monitorResetVersion
    clearEtco2LoadTimer()
    setEtco2LoadState({ resetVersion, loading: true, loaded: false })
    etco2LoadTimerRef.current = setTimeout(() => {
      etco2LoadTimerRef.current = null
      setEtco2LoadState((state) =>
        state.resetVersion === resetVersion
          ? { resetVersion, loading: false, loaded: true }
          : state,
      )
    }, 8000)
  }, [clearEtco2LoadTimer, monitorResetVersion])

  useEffect(() => {
    return clearEtco2LoadTimer
  }, [clearEtco2LoadTimer])

  const handleToggleEtco2 = useCallback(() => {
    const willShowEtco2 = controller.secondary !== 'etco2'
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
    startEtco2Loading,
  ])

  const defib = useDefibSequence({
    patientMode: controller.patientMode,
    rhythm: confirmed.rhythm,
    onAnalyzeResult(result) {
      controller.onAnalyzeResult(result, formatEstTime())
    },
  })
  const alarmVitals = {
    ...confirmed,
    bp_sys: acceptedBp.bp_sys,
    bp_dia: acceptedBp.bp_dia,
  }
  const alarmActive = {
    ...confirmedVitalActive,
    bp_sys: acceptedBpActive.bp_sys,
    bp_dia: acceptedBpActive.bp_dia,
  }
  const {
    phase: nibpPhase,
    displayValue: nibpDisplayValue,
    handlePatientEvent,
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
    controller.isMuted,
    true,
    audioAlarmActive,
  )
  const bpButtonEnabled =
    acceptedBpActive.bp_sys ||
    acceptedBpActive.bp_dia ||
    confirmedVitalActive.bp_sys ||
    confirmedVitalActive.bp_dia
  const acceptedBpDisplayActive = acceptedBpActive.bp_sys || acceptedBpActive.bp_dia

  useDefibAudio(defib.state, controller.isMuted)

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
              hr={confirmed.hr}
              spo2={confirmed.spo2}
              etco2={confirmed.etco2}
              spo2Waveform={confirmed.spo2_waveform}
              etco2Waveform={confirmed.etco2_waveform}
              showApplyElectrodes={false}
              showAllSecondaryChannels={!controller.bottomStatusVisible}
              selected={controller.activeSelectedControl}
              etco2Loading={etco2Loading}
            />
          )
        }
        vitals={
          ['charge_prompt', 'charging', 'charged', 'delivered'].includes(defib.state)
            ? null
            : (
                <VitalsStrip
                  hr={confirmedVitalActive.hr ? confirmed.hr : ''}
                  bpSys={acceptedBpDisplayActive ? acceptedBp.bp_sys : ''}
                  bpDia={acceptedBpDisplayActive ? acceptedBp.bp_dia : ''}
                  etco2={confirmedVitalActive.etco2 ? confirmed.etco2 : ''}
                  spo2={confirmedVitalActive.spo2 ? confirmed.spo2 : 'SpO2 OFF'}
                  spo2Unit={confirmedVitalActive.spo2 ? '%' : ''}
                  activeAlarms={
                    isNibpReadingActive
                      ? alarm.activeAlarms.filter((channel) => channel !== 'bp')
                      : alarm.activeAlarms
                  }
                  searching={false}
                  selected={controller.activeSelectedControl}
                  nibpPhase={bpButtonEnabled ? nibpPhase : undefined}
                  nibpDisplayValue={bpButtonEnabled ? nibpDisplayValue : undefined}
                />
              )
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
          controller.isTwelveLead || !controller.bottomStatusVisible ? null : (
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
        fullScreen
        variant={callerInfoVariant}
        canEnterMonitor={gateSatisfied}
        onEnterMonitor={enterCurrentDispatch}
        onBack={gateSatisfied ? enterCurrentDispatch : undefined}
      />
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <DeviceShell
        screen={screen}
        initialPowerState={devBypass ? 'on' : 'off'}
        powerLocked={powerLocked}
        lockScreen={standbyLockScreen}
        screenModal={
          <PatientModeModal
            open={controller.patientModalOpen}
            current={controller.patientMode}
            highlighted={
              PATIENT_MODE_OPTIONS[controller.patientModeHighlightedIndex]?.value ?? 'adult'
            }
            onSelect={controller.onSelectPatientMode}
            onClose={controller.onClosePatientModal}
          />
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
          onCharge: defib.onCharge,
          onShock: defib.onShock,
          onEnergyUp: defib.onEnergyUp,
          onEnergyDown: defib.onEnergyDown,
        }}
        softKeys={{
          onTwelveLead: controller.onTwelveLead,
          onToggleEtco2: handleToggleEtco2,
          onTreatment: controller.onTreatment,
          onLeftAnalyse: controller.onLeftAnalyse,
          onBack: controller.onBack,
          onPatientInfo: controller.onPatientInfo,
          onCaptureTwelveLead: controller.onCaptureTwelveLead,
          onPrint: controller.onPrint,
        }}
        nav={{
          onMoveUp: controller.onMoveUp,
          onMoveDown: controller.onMoveDown,
          onEnter: controller.onEnter,
        }}
        meds={{
          mode: controller.medicationMode,
          page: controller.medicationPage,
          onMedClick: (name) => controller.onMedClick(name, formatEstTime()),
          onMedPageChange: controller.onMedPageChange,
          onMedInfo: controller.onMedInfo,
          onMedBack: controller.onMedBack,
        }}
        power={{
          onPowerOn: controller.onPowerOn,
          onPowerOff: () => {
            if (etco2Loading) cancelEtco2Loading()
            controller.onPowerOff()
            defib.reset()
            setAudioMuted(false)
          },
        }}
        audio={{
          isMuted: controller.isMuted,
          onToggleMute: controller.onToggleMute,
          onPatientEvent: bpButtonEnabled ? handlePatientEvent : undefined,
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
      />
    </div>
  )
}

// useSearchParams requires a Suspense boundary in the App Router.
export default function MonitorPageRoute() {
  return (
    <Suspense fallback={null}>
      <MonitorPage />
    </Suspense>
  )
}
