'use client'

import { useEffect, useRef, useState } from 'react'
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
import { PatientModeModal } from '@/components/monitor/PatientModeModal'
import { CallerInfoModal } from '@/components/monitor/CallerInfoModal'
import {
  PatientInfoPanel,
  type PatientInfoField,
} from '@/components/monitor/PatientInfoPanel'
import { EventLogModal, type EventLogEntry } from '@/components/monitor/EventLogModal'
import { useDefibSequence } from '@/hooks/useDefibSequence'
import { useAlarm } from '@/hooks/useAlarm'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { DEFAULT_VITALS, type PatientMode, type Rhythm } from '@/types/vitals'
import { clampAge, toggleSex, type PatientSex } from '@/types/patientInfo'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { formatMonitorClock } from '@/lib/monitorClock'
import { setAudioMuted, playChargeBeep, pauseChargeBeep, playShockReadyBeep, pauseShockReadyBeep } from '@/lib/audio'

type MonitorView = 'main' | '12lead'
type SecondaryChannel = 'spo2' | 'etco2'
type CaptureState = 'idle' | 'acquiring' | 'result'

// Time for the "Acquiring 12-Lead" progress bar to fill before the printout shows.
const ACQUIRE_MS = 4000

export default function MonitorPage() {
  const [view, setView] = useState<MonitorView>('main')
  const [secondary, setSecondary] = useState<SecondaryChannel>('spo2')
  const [patientMode, setPatientMode] = useState<PatientMode>(DEFAULT_VITALS.patient_mode)
  const [patientModalOpen, setPatientModalOpen] = useState(false)
  const [callerInfoOpen, setCallerInfoOpen] = useState(false)
  const [patientInfoOpen, setPatientInfoOpen] = useState(false)
  const [selectedField, setSelectedField] = useState<PatientInfoField>('age')
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState<number | PatientSex | null>(null)
  const [isTimerRunning, setIsTimerRunning] = useState(true)
  const [medicationMode, setMedicationMode] = useState(false)
  const [medicationPage, setMedicationPage] = useState<1 | 2 | 3>(1)
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([])
  const [eventLogOpen, setEventLogOpen] = useState(false)
  const [flashedMed, setFlashedMed] = useState<string | null>(null)
  const [isPoweredOn, setIsPoweredOn] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [now, setNow] = useState<Date | null>(null)
  const [captureState, setCaptureState] = useState<CaptureState>('idle')
  const [capturedRhythm, setCapturedRhythm] = useState<Rhythm>(DEFAULT_VITALS.rhythm)
  const [capturedHr, setCapturedHr] = useState<number>(DEFAULT_VITALS.hr)
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  const patientInfo = useMonitorStore((s) => s.patientInfo)
  const setPatientAge = useMonitorStore((s) => s.setPatientAge)
  const setPatientSex = useMonitorStore((s) => s.setPatientSex)
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

  const isTwelveLead = view === '12lead'

  // Patient Info menu (12-lead only): two-step edit driven by the right cluster.
  // Browse highlights a field; Enter starts editing a draft; arrows change the
  // draft; Enter commits to the store; Back cancels the edit or closes the panel.
  function openPatientInfo() {
    setPatientInfoOpen(true)
    setSelectedField('age')
    setEditing(false)
    setEditValue(null)
  }

  // 12-lead Capture: freeze the current rhythm/HR, show the "Acquiring" card for
  // ACQUIRE_MS, then swap the live grid for a static printout. Transient — nothing
  // is persisted; each press is a fresh capture. Back cancels/dismisses (handleBack).
  function clearCaptureTimer() {
    if (captureTimerRef.current) {
      clearTimeout(captureTimerRef.current)
      captureTimerRef.current = null
    }
  }

  function startCapture() {
    clearCaptureTimer()
    setPatientInfoOpen(false)
    setCapturedRhythm(confirmed.rhythm)
    setCapturedHr(confirmed.hr)
    setCaptureState('acquiring')
    captureTimerRef.current = setTimeout(() => {
      captureTimerRef.current = null
      setCaptureState('result')
    }, ACQUIRE_MS)
  }

  useEffect(() => clearCaptureTimer, [])

  function adjustEditValue(direction: 'up' | 'down') {
    if (selectedField === 'age') {
      const delta = direction === 'up' ? 1 : -1
      setEditValue((v) => clampAge((typeof v === 'number' ? v : patientInfo.age) + delta))
    } else {
      setEditValue((v) => toggleSex(v === 'M' || v === 'F' ? v : patientInfo.sex))
    }
  }

  function moveSelection(direction: 'up' | 'down') {
    if (!patientInfoOpen) return
    if (editing) {
      // up increments / down decrements the current field's draft
      adjustEditValue(direction)
      return
    }
    // Two fields only: up highlights Age, down highlights Sex (clamped, no wrap).
    setSelectedField(direction === 'up' ? 'age' : 'sex')
  }

  function handleEnter() {
    if (!patientInfoOpen) return
    if (!editing) {
      setEditValue(selectedField === 'age' ? patientInfo.age : patientInfo.sex)
      setEditing(true)
      return
    }
    // commit the draft to the persisted store
    if (selectedField === 'age' && typeof editValue === 'number') {
      setPatientAge(editValue)
    } else if (selectedField === 'sex' && (editValue === 'M' || editValue === 'F')) {
      setPatientSex(editValue)
    }
    setEditing(false)
    setEditValue(null)
  }

  function handleBack() {
    if (editing) {
      // cancel: discard the draft, stay in the panel (browse)
      setEditing(false)
      setEditValue(null)
      return
    }
    if (captureState === 'acquiring') {
      // cancel the in-progress acquisition — no printout
      clearCaptureTimer()
      setCaptureState('idle')
      return
    }
    if (captureState === 'result') {
      // dismiss the printout, back to the live 12-lead grid
      setCaptureState('idle')
      return
    }
    if (patientInfoOpen) {
      setPatientInfoOpen(false)
      return
    }
    clearCaptureTimer()
    setCaptureState('idle')
    setView('main')
  }

  // Values shown in the panel: the draft for the field being edited, else stored.
  const displayAge =
    editing && selectedField === 'age' && typeof editValue === 'number'
      ? editValue
      : patientInfo.age
  const displaySex: PatientSex =
    editing && selectedField === 'sex' && (editValue === 'M' || editValue === 'F')
      ? editValue
      : patientInfo.sex

  const screen = (
    <div className="relative h-full w-full">
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
          />
        }
        subBar={<SubBar />}
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
          isTwelveLead ? null : (
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
      <PatientInfoPanel
        open={patientInfoOpen}
        age={displayAge}
        sex={displaySex}
        selectedField={selectedField}
        editing={editing}
      />
      <EventLogModal
        open={eventLogOpen}
        log={eventLog}
        onClose={() => setEventLogOpen(false)}
      />
      {/* Capture overlays take over the entire monitor display; only the
          physical Back key (on DeviceShell, outside the screen) responds. */}
      {isTwelveLead && captureState === 'acquiring' && (
        <div className="absolute inset-0 z-40">
          <AcquiringDialog durationMs={ACQUIRE_MS} />
        </div>
      )}
      {isTwelveLead && captureState === 'result' && (
        <div className="absolute inset-0 z-40">
          <TwelveLeadPrintout rhythm={capturedRhythm} hr={capturedHr} />
        </div>
      )}
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
        onAnalyse={defib.onAnalyse}
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
        onBack={handleBack}
        onPatientInfo={openPatientInfo}
        onCaptureTwelveLead={startCapture}
        captureLock={isTwelveLead && captureState !== 'idle'}
        onMoveUp={() => moveSelection('up')}
        onMoveDown={() => moveSelection('down')}
        onEnter={handleEnter}
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
        }}
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
