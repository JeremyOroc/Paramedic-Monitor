'use client'

import { Suspense } from 'react'
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
import { CallerInfoModal, type CallerEventKey } from '@/components/monitor/CallerInfoModal'
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
  const confirmedVitalsActive = useMonitorStore((s) => s.confirmedVitalsActive)
  const callerInfoConfirmed = useMonitorStore((s) => s.callerInfoConfirmed)
  const patientInfo = useMonitorStore((s) => s.patientInfo)
  const setPatientAge = useMonitorStore((s) => s.setPatientAge)
  const setPatientSex = useMonitorStore((s) => s.setPatientSex)
  const dispatchState = useMonitorStore((s) => s.dispatch)
  const acknowledgeCall = useMonitorStore((s) => s.acknowledgeCall)
  const arriveCall = useMonitorStore((s) => s.arriveCall)
  const transportCall = useMonitorStore((s) => s.transportCall)

  const devBypass = useSearchParams().get('dev') === '1'

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

  const lockScreen = dispatchState.armed ? (
    <CallerInfoModal
      open
      info={callerInfoConfirmed}
      onCallerEvent={onCallerEvent}
      buttonState={callerButtonState}
      showCountdown={!countdown.isDone}
      countdownFormatted={countdown.formatted}
      fullScreen
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <span className="font-mono text-sm uppercase tracking-[0.3em] text-neutral-700">
        Standby
      </span>
    </div>
  )

  const defib = useDefibSequence({
    patientMode: controller.patientMode,
    rhythm: confirmed.rhythm,
    onAnalyzeResult(result) {
      controller.onAnalyzeResult(result, sessionTimer)
    },
  })
  const alarm = useAlarm(
    confirmed,
    controller.isPoweredOn,
    controller.isMuted,
    confirmedVitalsActive,
  )
  const {
    phase: nibpPhase,
    displayValue: nibpDisplayValue,
    handlePatientEvent,
  } = useNibpReading(confirmed.bp_sys)

  useDefibAudio(defib.state, controller.isMuted)

  const screen = (
    <div className="relative h-full w-full">
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
      )}
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
            />
          )
        }
        vitals={
          ['charge_prompt', 'charging', 'charged', 'delivered'].includes(defib.state)
            ? null
            : (
                <VitalsStrip
                  hr={confirmedVitalsActive ? confirmed.hr : ''}
                  bpSys={confirmedVitalsActive ? confirmed.bp_sys : ''}
                  bpDia={confirmedVitalsActive ? confirmed.bp_dia : ''}
                  etco2={confirmedVitalsActive ? confirmed.etco2 : ''}
                  spo2={confirmedVitalsActive ? confirmed.spo2 : ''}
                  activeAlarms={alarm.activeAlarms}
                  searching={false}
                  selected={controller.activeSelectedControl}
                  nibpPhase={confirmedVitalsActive ? nibpPhase : undefined}
                  nibpDisplayValue={confirmedVitalsActive ? nibpDisplayValue : undefined}
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
      <CallerInfoModal
        open={controller.callerInfoOpen}
        info={callerInfoConfirmed}
        onCallerEvent={onCallerEvent}
        buttonState={callerButtonState}
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

  return (
    <DeviceShell
      screen={screen}
      initialPowerState={devBypass ? 'on' : 'off'}
      powerLocked={powerLocked}
      lockScreen={lockScreen}
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
        onToggleEtco2: controller.onToggleEtco2,
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
        onMedClick: (name) => controller.onMedClick(name, sessionTimer),
        onMedPageChange: controller.onMedPageChange,
        onMedInfo: controller.onMedInfo,
        onMedBack: controller.onMedBack,
      }}
      power={{
        onPowerOn: controller.onPowerOn,
        onPowerOff: () => {
          controller.onPowerOff()
          defib.reset()
          setAudioMuted(false)
        },
      }}
      audio={{
        isMuted: controller.isMuted,
        onToggleMute: controller.onToggleMute,
        onPatientEvent: confirmedVitalsActive ? handlePatientEvent : undefined,
      }}
    />
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
