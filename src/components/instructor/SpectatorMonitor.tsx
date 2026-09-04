'use client'

import { useEffect, useState } from 'react'

import { AcquiringDialog } from '@/components/monitor/AcquiringDialog'
import { BottomStatusBar } from '@/components/monitor/BottomStatusBar'
import { CallerInfoModal } from '@/components/monitor/CallerInfoModal'
import { DeviceShell } from '@/components/monitor/DeviceShell'
import { EnergyScaleColumn } from '@/components/monitor/EnergyScaleColumn'
import { EventLogModal } from '@/components/monitor/EventLogModal'
import { LeftSidebar } from '@/components/monitor/LeftSidebar'
import { MonitorLayout } from '@/components/monitor/MonitorLayout'
import { NibpModal } from '@/components/monitor/NibpModal'
import { PatientInfoPanel } from '@/components/monitor/PatientInfoPanel'
import { PatientModeModal, PATIENT_MODE_OPTIONS } from '@/components/monitor/PatientModeModal'
import { SubBar } from '@/components/monitor/SubBar'
import { TopStatusBar } from '@/components/monitor/TopStatusBar'
import { TwelveLeadPage } from '@/components/monitor/TwelveLeadPage'
import { TwelveLeadPrintout } from '@/components/monitor/TwelveLeadPrintout'
import { VitalLogModal, VITAL_LOG_ITEMS_PER_PAGE } from '@/components/monitor/VitalLogModal'
import { VitalsStrip } from '@/components/monitor/VitalsStrip'
import { WagamiZDevice } from '@/components/monitor/WagamiZDevice'
import { WaveformPanel } from '@/components/monitor/WaveformPanel'
import { ACQUIRE_MS } from '@/hooks/useMonitorController'
import type { MonitorProjection } from '@/types/monitorProjection'

const noop = () => {}

function useProjectedDefibProgress(defib: MonitorProjection['defib']) {
  const [progress, setProgress] = useState(defib.progress)

  /* eslint-disable react-hooks/set-state-in-effect -- synchronizes an external wall clock animation */
  useEffect(() => {
    if (defib.phaseStartedAt === null || defib.phaseEndsAt === null) {
      setProgress(defib.progress)
      return
    }
    let frame = 0
    const tick = () => {
      const duration = defib.phaseEndsAt! - defib.phaseStartedAt!
      setProgress(
        duration <= 0
          ? defib.progress
          : Math.max(0, Math.min(1, (Date.now() - defib.phaseStartedAt!) / duration)),
      )
      if (Date.now() < defib.phaseEndsAt!) frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [defib.phaseEndsAt, defib.phaseStartedAt, defib.progress])
  /* eslint-enable react-hooks/set-state-in-effect */

  return progress
}

export function SpectatorMonitor({ projection }: { projection: MonitorProjection }) {
  const controller = projection.controller
  const defib = projection.defib
  const defibProgress = useProjectedDefibProgress(defib)
  const useRestingVitalLayout =
    defib.state === 'idle' && controller.view !== '12lead' && controller.bottomStatusVisible
  const vitalLogTotalPages = Math.max(
    1,
    Math.ceil(projection.vitalLog.length / VITAL_LOG_ITEMS_PER_PAGE),
  )
  const selected = projection.activeSelectedControl
  const screen = (
    <div className="relative h-full w-full">
      <MonitorLayout
        topBar={
          <TopStatusBar
            date={projection.date}
            time={projection.time}
            patientMode={controller.patientMode}
            patientModeActive={controller.patientModalOpen}
            batteryPercent={85}
            sessionTimer={projection.sessionTimer}
            selected={selected}
          />
        }
        subBar={<SubBar selected={selected} onToggleBottomStatus={noop} />}
        sidebar={
          <LeftSidebar
            twelveLeadActive={controller.view === '12lead'}
            etco2Active={controller.secondary === 'etco2'}
            medicationMode={controller.medicationMode}
            medicationPage={controller.medicationPage}
            activeMed={controller.flashedMed}
            printActive={controller.printPreviewOpen}
          />
        }
        main={
          controller.view === '12lead' ? (
            <TwelveLeadPage rhythm={projection.confirmed.rhythm} hr={projection.confirmed.hr} />
          ) : (
            <WaveformPanel
              secondaryChannel={controller.secondary}
              rhythm={projection.confirmed.rhythm}
              hr={projection.displayedHr}
              spo2={projection.confirmed.spo2}
              etco2={projection.confirmed.etco2}
              spo2Waveform={projection.confirmed.spo2_waveform}
              etco2Waveform={projection.confirmed.etco2_waveform}
              showAllSecondaryChannels={!controller.bottomStatusVisible}
              selected={selected}
              etco2Calibrated={projection.etco2Loaded}
              etco2Loading={projection.etco2Loading}
              cprOverride={projection.cprOverrideActive}
            />
          )
        }
        vitalsPlacement={useRestingVitalLayout ? 'bottom' : 'right'}
        vitals={
          <VitalsStrip
            hr={projection.displayedHrActive ? projection.vfDisplayedHr : ''}
            pulseHeartRate={projection.displayedHr}
            bpSys={
              projection.acceptedBpActive.bp_sys || projection.acceptedBpActive.bp_dia
                ? projection.acceptedBp.bp_sys
                : ''
            }
            bpDia={
              projection.acceptedBpActive.bp_sys || projection.acceptedBpActive.bp_dia
                ? projection.acceptedBp.bp_dia
                : ''
            }
            etco2={projection.displayedEtco2 ?? ''}
            spo2={projection.confirmedVitalActive.spo2 ? projection.confirmed.spo2 : 'SpO2 OFF'}
            spo2Waveform={projection.confirmed.spo2_waveform}
            spo2Unit={projection.confirmedVitalActive.spo2 ? '%' : ''}
            activeAlarms={projection.alarms}
            searching={false}
            selected={selected}
            nibpPhase={projection.nibp.enabled ? projection.nibp.phase : undefined}
            nibpDisplayValue={projection.nibp.enabled ? projection.nibp.displayValue : undefined}
            orientation={useRestingVitalLayout ? 'horizontal' : 'vertical'}
          />
        }
        energyColumn={
          controller.view !== '12lead' ? (
            ['charge_prompt', 'charging', 'charged'].includes(defib.state) ? (
              <EnergyScaleColumn
                progress={defibProgress}
                isCharged={defib.state === 'charged'}
                selectedEnergy={defib.energy}
              />
            ) : defib.state === 'delivered' ? (
              <div className="h-full w-full border-l border-neutral-800 bg-black" />
            ) : null
          ) : null
        }
        bottomBar={
          useRestingVitalLayout || controller.view === '12lead' || !controller.bottomStatusVisible
            ? null
            : (
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
        age={projection.displayAge}
        sex={projection.displaySex}
        selectedField={controller.selectedField}
        editing={controller.editing}
      />
      <EventLogModal
        open={controller.eventLogOpen}
        log={projection.mergedEventLog}
        page={controller.eventLogPage}
        highlightedButton={controller.eventLogHighlightedButton}
      />
      <VitalLogModal
        open={controller.vitalLogOpen}
        log={projection.vitalLog}
        page={Math.min(controller.vitalLogPage, vitalLogTotalPages)}
        highlightedButton={controller.vitalLogHighlightedButton}
      />
      {controller.view === '12lead' && controller.captureState === 'acquiring' ? (
        <div className="absolute inset-0 z-40"><AcquiringDialog durationMs={ACQUIRE_MS} /></div>
      ) : null}
      {controller.view === '12lead' && controller.captureState === 'result' ? (
        <div className="absolute inset-0 z-40">
          <TwelveLeadPrintout rhythm={controller.capturedRhythm} hr={controller.capturedHr} />
        </div>
      ) : null}
      {controller.view !== '12lead' && controller.printPreviewOpen && controller.lastCapture ? (
        <div className="absolute inset-0 z-40">
          <TwelveLeadPrintout rhythm={controller.lastCapture.rhythm} hr={controller.lastCapture.hr} />
        </div>
      ) : null}
    </div>
  )

  const callerButtonState = {
    acknowledge: { disabled: projection.dispatch.acknowledgedAt !== null },
    arrival: {
      disabled:
        !(projection.dispatch.acknowledgedAt && projection.countdownDone) ||
        projection.dispatch.arrivedAt !== null,
    },
    transport: {
      disabled: !controller.isPoweredOn || projection.dispatch.transportedAt !== null,
    },
  }

  if (projection.surface === 'dispatch') {
    return (
      <CallerInfoModal
        open
        info={projection.callerInfo}
        onCallerEvent={noop}
        buttonState={callerButtonState}
        showCountdown={!projection.countdownDone}
        countdownFormatted={projection.countdownFormatted}
        responseFormatted={projection.responseTimer}
        fullScreen
        variant={projection.callerInfoVariant}
        canEnterMonitor={projection.gateSatisfied}
        onEnterMonitor={noop}
        route={projection.dispatchRoute}
      />
    )
  }

  if (projection.model === 'wagamiZ') {
    return (
      <WagamiZDevice
        embedded
        forceSupportedViewport
        powerStateOverride={projection.powerState}
        date={projection.date}
        time={projection.time}
        sessionTimer={projection.sessionTimer}
        patientMode={controller.patientMode}
        rhythm={projection.confirmed.rhythm}
        heartRate={projection.displayedHrActive ? projection.vfDisplayedHr : projection.displayedHr}
        spo2={projection.confirmed.spo2}
        etco2={projection.confirmed.etco2}
        bpSys={projection.confirmed.bp_sys}
        bpDia={projection.confirmed.bp_dia}
        joules={defib.energy}
        shockCount={defib.shockCount}
        spo2Waveform={projection.confirmed.spo2_waveform}
        etco2Waveform={projection.confirmed.etco2_waveform}
        active={{ ...projection.confirmedVitalActive, hr: projection.displayedHrActive }}
        cprOverride={projection.cprOverrideActive}
      />
    )
  }

  return (
    <div className="h-full w-full">
      <DeviceShell
        embedded
        screen={screen}
        screenModal={
          <>
            <PatientModeModal
              open={controller.patientModalOpen}
              current={controller.patientMode}
              highlighted={
                PATIENT_MODE_OPTIONS[controller.patientModeHighlightedIndex]?.value ?? 'adult'
              }
              onSelect={noop}
              onClose={noop}
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
        twelveLeadActive={controller.view === '12lead'}
        captureLock={
          (controller.view === '12lead' && controller.captureState !== 'idle') ||
          controller.printPreviewOpen
        }
        powerStateOverride={projection.powerState}
        powerLocked={!projection.gateSatisfied}
        lockScreen={
          <div className="flex h-full w-full items-center justify-center bg-black">
            <span className="font-mono text-sm uppercase tracking-[0.3em] text-neutral-700">Standby</span>
          </div>
        }
        defib={{ ...defib, progress: defibProgress, onAnalyse: noop, onCharge: noop, onShock: noop, onEnergyUp: noop, onEnergyDown: noop }}
        softKeys={{ onTwelveLead: noop, onToggleEtco2: noop, onTreatment: noop, onLeftAnalyse: noop, onBack: noop, onPatientInfo: noop, onCaptureTwelveLead: noop, onPrint: noop }}
        nav={{ onHome: noop, onMoveUp: noop, onMoveDown: noop, onEnter: noop }}
        meds={{ mode: controller.medicationMode, page: controller.medicationPage, onMedClick: noop, onMedPageChange: noop, onMedInfo: noop, onMedBack: noop }}
        power={{ onPowerOn: noop, onPowerOff: noop }}
        audio={{ isMuted: controller.isMuted, onToggleMute: noop, onPatientEvent: noop }}
      />
      <CallerInfoModal
        open={controller.callerInfoOpen}
        info={projection.callerInfo}
        onCallerEvent={noop}
        buttonState={callerButtonState}
        fullScreen
        variant={projection.callerInfoVariant}
        onBack={noop}
        canEnterMonitor
        onEnterMonitor={noop}
        responseFormatted={projection.responseTimer}
        countdownFormatted={projection.countdownFormatted}
        route={projection.dispatchRoute}
      />
    </div>
  )
}
