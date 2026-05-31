'use client'

import { useEffect, useState } from 'react'
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
import { CallerInfoModal } from '@/components/monitor/CallerInfoModal'
import { PatientInfoPanel } from '@/components/monitor/PatientInfoPanel'
import { EventLogModal } from '@/components/monitor/EventLogModal'
import { useDefibSequence } from '@/hooks/useDefibSequence'
import { useAlarm } from '@/hooks/useAlarm'
import { useMonitorController, ACQUIRE_MS } from '@/hooks/useMonitorController'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { formatMonitorClock } from '@/lib/monitorClock'
import {
  setAudioMuted,
  playChargeBeep,
  pauseChargeBeep,
  playShockReadyBeep,
  pauseShockReadyBeep,
} from '@/lib/audio'

export default function MonitorPage() {
  const [now, setNow] = useState<Date | null>(null)

  const timeZone = (() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      return tz || 'America/Toronto'
    } catch {
      return 'America/Toronto'
    }
  })()

  useEffect(() => {
    const firstTickId = setTimeout(() => setNow(new Date()), 0)
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => {
      clearTimeout(firstTickId)
      clearInterval(id)
    }
  }, [])

  const { date, time } = formatMonitorClock(now, timeZone)

  useStoreHydration()
  const confirmed = useMonitorStore((s) => s.confirmed)
  const callerInfoConfirmed = useMonitorStore((s) => s.callerInfoConfirmed)
  const patientInfo = useMonitorStore((s) => s.patientInfo)
  const setPatientAge = useMonitorStore((s) => s.setPatientAge)
  const setPatientSex = useMonitorStore((s) => s.setPatientSex)

  const controller = useMonitorController({
    confirmed,
    patientInfo,
    setPatientAge,
    setPatientSex,
  })
  const sessionTimer = useSessionTimer(controller.isTimerRunning)

  const defib = useDefibSequence({
    patientMode: controller.patientMode,
    rhythm: confirmed.rhythm,
    onAnalyzeResult(result) {
      controller.onAnalyzeResult(result, sessionTimer)
    },
  })
  const alarm = useAlarm(confirmed, controller.isPoweredOn, controller.isMuted)

  useEffect(() => {
    if (defib.state === 'charging' && !controller.isMuted) {
      playChargeBeep()
      return pauseChargeBeep
    }
    pauseChargeBeep()
    return undefined
  }, [defib.state, controller.isMuted])

  useEffect(() => {
    if (
      (defib.state === 'charged' || defib.state === 'shock_advised') &&
      !controller.isMuted
    ) {
      playShockReadyBeep()
      return pauseShockReadyBeep
    }
    pauseShockReadyBeep()
    return undefined
  }, [defib.state, controller.isMuted])

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
                  hr={confirmed.hr}
                  bpSys={confirmed.bp_sys}
                  bpDia={confirmed.bp_dia}
                  etco2={confirmed.etco2}
                  spo2={confirmed.spo2}
                  activeAlarms={alarm.activeAlarms}
                  searching={false}
                  selected={controller.activeSelectedControl}
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
        onClose={controller.onCloseCallerInfo}
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
        log={controller.eventLog}
        onClose={controller.onCloseEventLog}
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
      defibState={defib.state}
      energy={defib.energy}
      progress={defib.progress}
      canAnalyse={defib.canAnalyse}
      canCharge={defib.canCharge}
      canShock={defib.canShock}
      canAdjustEnergy={defib.canAdjustEnergy}
      onAnalyse={defib.onAnalyse}
      onCharge={defib.onCharge}
      onShock={defib.onShock}
      onEnergyUp={defib.onEnergyUp}
      onEnergyDown={defib.onEnergyDown}
      onTwelveLead={controller.onTwelveLead}
      onToggleEtco2={controller.onToggleEtco2}
      onTreatment={controller.onTreatment}
      onLeftAnalyse={controller.onLeftAnalyse}
      onBack={controller.onBack}
      onPatientInfo={controller.onPatientInfo}
      onCaptureTwelveLead={controller.onCaptureTwelveLead}
      onPrint={controller.onPrint}
      captureLock={controller.captureLock}
      onMoveUp={controller.onMoveUp}
      onMoveDown={controller.onMoveDown}
      onEnter={controller.onEnter}
      twelveLeadActive={controller.isTwelveLead}
      isMuted={controller.isMuted}
      onToggleMute={controller.onToggleMute}
      onPowerOn={controller.onPowerOn}
      onPowerOff={() => {
        controller.onPowerOff()
        defib.reset()
        setAudioMuted(false)
      }}
      medicationMode={controller.medicationMode}
      medicationPage={controller.medicationPage}
      onMedClick={(name) => controller.onMedClick(name, sessionTimer)}
      onMedPageChange={controller.onMedPageChange}
      onMedInfo={controller.onMedInfo}
      onMedBack={controller.onMedBack}
    />
  )
}
