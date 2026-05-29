'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DeviceShell } from '@/components/monitor/DeviceShell'
import { MonitorLayout } from '@/components/monitor/MonitorLayout'
import { TopStatusBar } from '@/components/monitor/TopStatusBar'
import { SubBar } from '@/components/monitor/SubBar'
import { LeftSidebar } from '@/components/monitor/LeftSidebar'
import { WaveformPanel } from '@/components/monitor/WaveformPanel'
import { TwelveLeadPage } from '@/components/monitor/TwelveLeadPage'
import { VitalsStrip } from '@/components/monitor/VitalsStrip'
import { BottomStatusBar } from '@/components/monitor/BottomStatusBar'
import { EnergyScaleColumn } from '@/components/monitor/EnergyScaleColumn'
import { PatientModeModal } from '@/components/monitor/PatientModeModal'
import { CallerInfoModal } from '@/components/monitor/CallerInfoModal'
import { EventLogModal, type EventLogEntry } from '@/components/monitor/EventLogModal'
import { useDefibSequence } from '@/hooks/useDefibSequence'
import { useAlarm } from '@/hooks/useAlarm'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { DEFAULT_VITALS, type PatientMode } from '@/types/vitals'
import type { MonitorSelection } from '@/types/monitorSelection'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { formatMonitorClock } from '@/lib/monitorClock'
import { setAudioMuted, playChargeBeep, pauseChargeBeep, playShockReadyBeep, pauseShockReadyBeep } from '@/lib/audio'

type MonitorView = 'main' | '12lead'
type SecondaryChannel = 'spo2' | 'etco2'

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

export default function MonitorPage() {
  const [view, setView] = useState<MonitorView>('main')
  const [secondary, setSecondary] = useState<SecondaryChannel>('spo2')
  const [patientMode, setPatientMode] = useState<PatientMode>(DEFAULT_VITALS.patient_mode)
  const [patientModalOpen, setPatientModalOpen] = useState(false)
  const [callerInfoOpen, setCallerInfoOpen] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(true)
  const [medicationMode, setMedicationMode] = useState(false)
  const [medicationPage, setMedicationPage] = useState<1 | 2 | 3>(1)
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([])
  const [eventLogOpen, setEventLogOpen] = useState(false)
  const [flashedMed, setFlashedMed] = useState<string | null>(null)
  const [isPoweredOn, setIsPoweredOn] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedControl, setSelectedControl] = useState<MonitorSelection>('dateTime')
  const [bottomStatusVisible, setBottomStatusVisible] = useState(true)
  const [jumpscareActive, setJumpscareActive] = useState(false)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
  const sessionTimer = useSessionTimer(isTimerRunning)

  useStoreHydration()
  const confirmed = useMonitorStore((s) => s.confirmed)
  const callerInfoConfirmed = useMonitorStore((s) => s.callerInfoConfirmed)
  const defib = useDefibSequence({
    patientMode,
    rhythm: confirmed.rhythm,
    onAnalyzeResult(result) {
      const name = result === 'shock' ? 'Analyze - Shock' : 'Analyze - No Shock'
      setEventLog((prev) => [...prev, { name, time: sessionTimer }])
    },
  })
  const alarm = useAlarm(confirmed, isPoweredOn, isMuted)

  useEffect(() => {
    if (defib.state === 'charging' && !isMuted) {
      playChargeBeep()
      return pauseChargeBeep
    }
    pauseChargeBeep()
    return undefined
  }, [defib.state, isMuted])

  useEffect(() => {
    if (defib.state === 'charged' && !isMuted) {
      playShockReadyBeep()
      return pauseShockReadyBeep
    }
    pauseShockReadyBeep()
    return undefined
  }, [defib.state, isMuted])

  function handleToggleMute() {
    setIsMuted((prev) => {
      setAudioMuted(!prev)
      return !prev
    })
  }

  const NEXT_MED_PAGE: Record<1 | 2 | 3, 1 | 2 | 3> = { 1: 2, 2: 3, 3: 1 }
  const isTwelveLead = view === '12lead'

  const selectableControls = useMemo<MonitorSelection[]>(() => {
    const waveformControls: MonitorSelection[] = []

    if (!isTwelveLead) {
      const spo2Visible = !bottomStatusVisible || secondary === 'spo2'
      const etco2Visible = !bottomStatusVisible || secondary === 'etco2'

      if (spo2Visible) waveformControls.push('spo2Scale', 'spo2Label')
      if (etco2Visible) waveformControls.push('etco2Scale', 'etco2Label')
      waveformControls.push('ecgGain', 'padsLabel')
    }

    return [...TOP_SELECTIONS, ...waveformControls, 'bottomStatusToggle']
  }, [bottomStatusVisible, isTwelveLead, secondary])

  const activeSelectedControl = selectableControls.includes(selectedControl)
    ? selectedControl
    : 'dateTime'

  function moveSelectedControl(direction: 1 | -1) {
    setSelectedControl((current) => {
      const currentIndex = selectableControls.indexOf(current)
      const safeIndex = currentIndex === -1 ? 0 : currentIndex
      return selectableControls[
        (safeIndex + direction + selectableControls.length) % selectableControls.length
      ]
    })
  }

  function handleSelectionEnter() {
    if (activeSelectedControl === 'bottomStatusToggle') {
      setBottomStatusVisible((visible) => !visible)
    } else if (activeSelectedControl === 'battery') {
      setJumpscareActive(true)
    }
  }

  function handleToggleBottomStatus() {
    setSelectedControl('bottomStatusToggle')
    setBottomStatusVisible((visible) => !visible)
  }

  function handleTreatment() {
    setMedicationMode(true)
  }

  function handleMedClick(name: string) {
    setEventLog((prev) => [...prev, { name, time: sessionTimer }])
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    setFlashedMed(name)
    flashTimerRef.current = setTimeout(() => setFlashedMed(null), 400)
  }

  function handleMedPageChange() {
    setMedicationPage((p) => NEXT_MED_PAGE[p])
  }

  function handleMedBack() {
    setMedicationMode(false)
  }

  const screen = (
    <div className="relative h-full w-full">
      {jumpscareActive && (
        <div
          className="absolute inset-0 z-50 bg-black"
          onClick={() => setJumpscareActive(false)}
        >
          <video
            src="/videos/chica_jumpscare.mp4"
            autoPlay
            playsInline
            className="h-full w-full object-cover"
            onEnded={() => setJumpscareActive(false)}
          />
        </div>
      )}
      <MonitorLayout
        topBar={
          <TopStatusBar
            date={date}
            time={time}
            patientMode={patientMode}
            patientModeActive={patientModalOpen}
            onPatientModeClick={() => setPatientModalOpen(true)}
            batteryPercent={85}
            sessionTimer={sessionTimer}
            selected={activeSelectedControl}
          />
        }
        subBar={
          <SubBar
            selected={activeSelectedControl}
            onToggleBottomStatus={handleToggleBottomStatus}
          />
        }
        sidebar={
          <LeftSidebar
            twelveLeadActive={isTwelveLead}
            etco2Active={secondary === 'etco2'}
            medicationMode={medicationMode}
            medicationPage={medicationPage}
            activeMed={flashedMed}
          />
        }
        main={
          isTwelveLead ? (
            <TwelveLeadPage rhythm={confirmed.rhythm} hr={confirmed.hr} />
          ) : (
            <WaveformPanel
              secondaryChannel={secondary}
              rhythm={confirmed.rhythm}
              hr={confirmed.hr}
              spo2={confirmed.spo2}
              etco2={confirmed.etco2}
              spo2Waveform={confirmed.spo2_waveform}
              etco2Waveform={confirmed.etco2_waveform}
              showApplyElectrodes={false}
              showAllSecondaryChannels={!bottomStatusVisible}
              selected={activeSelectedControl}
            />
          )
        }
        vitals={
          ['charge_prompt', 'charging', 'charged', 'delivered'].includes(defib.state) ? null : (
            <VitalsStrip
              hr={confirmed.hr}
              bpSys={confirmed.bp_sys}
              bpDia={confirmed.bp_dia}
              etco2={confirmed.etco2}
              spo2={confirmed.spo2}
              activeAlarms={alarm.activeAlarms}
              searching={false}
              selected={activeSelectedControl}
            />
          )
        }
        energyColumn={
          !isTwelveLead ? (
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
          isTwelveLead || !bottomStatusVisible ? null : (
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
        open={callerInfoOpen}
        info={callerInfoConfirmed}
        onClose={() => setCallerInfoOpen(false)}
      />
      <EventLogModal
        open={eventLogOpen}
        log={eventLog}
        onClose={() => setEventLogOpen(false)}
      />
    </div>
  )

  return (
    <>
      <DeviceShell
        screen={screen}
        defibState={defib.state}
        energy={defib.energy}
        progress={defib.progress}
        canAnalyse={defib.canAnalyse}
        canCharge={defib.canCharge}
        canShock={defib.canShock}
        canAdjustEnergy={defib.canAdjustEnergy}
        onAnalyse={() => {
          defib.onAnalyse()
        }}
        onCharge={defib.onCharge}
        onShock={defib.onShock}
        onEnergyUp={defib.onEnergyUp}
        onEnergyDown={defib.onEnergyDown}
        onTwelveLead={() => setView('12lead')}
        onToggleEtco2={() =>
          setSecondary((s) => (s === 'spo2' ? 'etco2' : 'spo2'))
        }
        onTreatment={handleTreatment}
        onLeftAnalyse={() => setCallerInfoOpen(true)}
        onBack={() => setView('main')}
        twelveLeadActive={isTwelveLead}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onPowerOn={() => {
          setIsTimerRunning(true)
          setIsPoweredOn(true)
        }}
        onPowerOff={() => {
          setIsTimerRunning(false)
          setIsPoweredOn(false)
          setIsMuted(false)
          setAudioMuted(false)
          defib.reset()
          setEventLog([])
          setMedicationMode(false)
          setMedicationPage(1)
          setFlashedMed(null)
          setPatientModalOpen(false)
          setCallerInfoOpen(false)
          setEventLogOpen(false)
          setSelectedControl('dateTime')
          setBottomStatusVisible(true)
        }}
        onMoveUp={() => moveSelectedControl(1)}
        onMoveDown={() => moveSelectedControl(-1)}
        onEnter={handleSelectionEnter}
        medicationMode={medicationMode}
        medicationPage={medicationPage}
        onMedClick={handleMedClick}
        onMedPageChange={handleMedPageChange}
        onMedInfo={() => setEventLogOpen(true)}
        onMedBack={handleMedBack}
      />
      <PatientModeModal
        open={patientModalOpen}
        current={patientMode}
        onSelect={(mode) => {
          setPatientMode(mode)
          setPatientModalOpen(false)
        }}
        onClose={() => setPatientModalOpen(false)}
      />
    </>
  )
}
