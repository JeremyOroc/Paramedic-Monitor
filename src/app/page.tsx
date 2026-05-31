'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import {
  PatientInfoPanel,
  type PatientInfoField,
} from '@/components/monitor/PatientInfoPanel'
import { EventLogModal, type EventLogEntry } from '@/components/monitor/EventLogModal'
import { useDefibSequence } from '@/hooks/useDefibSequence'
import { useAlarm } from '@/hooks/useAlarm'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { useNibpReading } from '@/hooks/useNibpReading'
import { DEFAULT_VITALS, type PatientMode, type Rhythm } from '@/types/vitals'
import { clampAge, toggleSex, type PatientSex } from '@/types/patientInfo'
import type { MonitorSelection } from '@/types/monitorSelection'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { formatMonitorClock } from '@/lib/monitorClock'
import { setAudioMuted, playChargeBeep, pauseChargeBeep, playShockReadyBeep, pauseShockReadyBeep } from '@/lib/audio'

type MonitorView = 'main' | '12lead'
type SecondaryChannel = 'spo2' | 'etco2'
type CaptureState = 'idle' | 'acquiring' | 'result'

// Time for the "Acquiring 12-Lead" progress bar to fill before the printout shows.
const ACQUIRE_MS = 4000

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
  const [patientModeHighlightedIndex, setPatientModeHighlightedIndex] = useState(0)
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
  const [eventLogPage, setEventLogPage] = useState(1)
  const [eventLogHighlighted, setEventLogHighlighted] = useState<'prev' | 'next'>('next')
  const [flashedMed, setFlashedMed] = useState<string | null>(null)
  const [isPoweredOn, setIsPoweredOn] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedControl, setSelectedControl] = useState<MonitorSelection>('dateTime')
  const [bottomStatusVisible, setBottomStatusVisible] = useState(true)
  const [jumpscareActive, setJumpscareActive] = useState(false)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [now, setNow] = useState<Date | null>(null)
  const [captureState, setCaptureState] = useState<CaptureState>('idle')
  const [capturedRhythm, setCapturedRhythm] = useState<Rhythm>(DEFAULT_VITALS.rhythm)
  const [capturedHr, setCapturedHr] = useState<number>(DEFAULT_VITALS.hr)
  const [lastCapture, setLastCapture] = useState<{ rhythm: Rhythm; hr: number } | null>(null)
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)
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
  const { phase: nibpPhase, displayValue: nibpDisplayValue, handlePatientEvent } = useNibpReading(confirmed.bp_sys)

  useEffect(() => {
    if (defib.state === 'charging' && !isMuted) {
      playChargeBeep()
      return pauseChargeBeep
    }
    pauseChargeBeep()
    return undefined
  }, [defib.state, isMuted])

  useEffect(() => {
    if ((defib.state === 'charged' || defib.state === 'shock_advised') && !isMuted) {
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
    if (patientModalOpen) {
      const mode = PATIENT_MODE_OPTIONS[patientModeHighlightedIndex].value
      setPatientMode(mode)
      setPatientModalOpen(false)
      return
    }
    if (activeSelectedControl === 'bottomStatusToggle') {
      setBottomStatusVisible((visible) => !visible)
    } else if (activeSelectedControl === 'battery') {
      setJumpscareActive(true)
    }
    if (activeSelectedControl === 'patientMode') {
      const currentIndex = PATIENT_MODE_OPTIONS.findIndex((o) => o.value === patientMode)
      setPatientModeHighlightedIndex(currentIndex === -1 ? 0 : currentIndex)
      setPatientModalOpen(true)
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
    if (eventLogOpen) {
      setEventLogOpen(false)
      return
    }
    setMedicationMode(false)
  }

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
    const rhythm = confirmed.rhythm
    const hr = confirmed.hr
    setCapturedRhythm(rhythm)
    setCapturedHr(hr)
    setCaptureState('acquiring')
    captureTimerRef.current = setTimeout(() => {
      captureTimerRef.current = null
      setCaptureState('result')
      // Remember the completed capture so the main-view PRINT key can reprint it.
      setLastCapture({ rhythm, hr })
    }, ACQUIRE_MS)
  }

  // Main-view PRINT: bring up the most recent completed 12-lead as a full-screen
  // printout. Inert until a capture exists. Back dismisses it (handleBack).
  function handlePrint() {
    if (!lastCapture) return
    setPrintPreviewOpen(true)
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
      // up increments / down decrements the current field's draft (back unreachable while editing)
      adjustEditValue(direction)
      return
    }
    // Three fields: age → sex → back (clamped, no wrap)
    const ORDER: PatientInfoField[] = ['age', 'sex', 'back']
    const idx = ORDER.indexOf(selectedField)
    if (direction === 'up') {
      setSelectedField(ORDER[Math.max(0, idx - 1)])
    } else {
      setSelectedField(ORDER[Math.min(ORDER.length - 1, idx + 1)])
    }
  }

  function handleEnter() {
    if (!patientInfoOpen) return
    if (!editing) {
      if (selectedField === 'back') {
        handleBack()
        return
      }
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
    if (callerInfoOpen) {
      setCallerInfoOpen(false)
      return
    }
    if (patientModalOpen) {
      setPatientModalOpen(false)
      return
    }
    if (printPreviewOpen) {
      // dismiss the reprinted 12-lead, back to the main view
      setPrintPreviewOpen(false)
      return
    }
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

  // Compute the right offset so modals never overlap the vitals or energy column.
  // 96 = vitals strip width, 80 = energy column width, 0 = 12-lead (no right panel).
  const defibHidesVitals = ['charge_prompt', 'charging', 'charged', 'delivered'].includes(defib.state)
  const modalRightOffset = isTwelveLead ? 0 : defibHidesVitals ? 80 : 96

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
            printActive={printPreviewOpen}
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
              nibpPhase={nibpPhase}
              nibpDisplayValue={nibpDisplayValue}
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
      />
      <PatientInfoPanel
        open={patientInfoOpen}
        age={displayAge}
        sex={displaySex}
        selectedField={selectedField}
        editing={editing}
        rightOffset={96}
      />
      <EventLogModal
        open={eventLogOpen}
        log={eventLog}
        rightOffset={modalRightOffset}
        page={eventLogPage}
        highlightedButton={eventLogHighlighted}
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
      {!isTwelveLead && printPreviewOpen && lastCapture && (
        <div className="absolute inset-0 z-40">
          <TwelveLeadPrintout rhythm={lastCapture.rhythm} hr={lastCapture.hr} />
        </div>
      )}
    </div>
  )

  return (
    <DeviceShell
      screen={screen}
      screenModal={
        <PatientModeModal
          open={patientModalOpen}
          current={patientMode}
          highlighted={PATIENT_MODE_OPTIONS[patientModeHighlightedIndex]?.value ?? 'adult'}
          onSelect={(mode) => {
            setPatientMode(mode)
            setPatientModalOpen(false)
          }}
          onClose={() => setPatientModalOpen(false)}
        />
      }
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
        onBack={handleBack}
        onPatientInfo={openPatientInfo}
        onCaptureTwelveLead={startCapture}
        onPrint={handlePrint}
        captureLock={(isTwelveLead && captureState !== 'idle') || printPreviewOpen}
        onMoveUp={() => {
          if (patientModalOpen) {
            setPatientModeHighlightedIndex(
              (i) => (i - 1 + PATIENT_MODE_OPTIONS.length) % PATIENT_MODE_OPTIONS.length,
            )
          } else if (patientInfoOpen) {
            moveSelection('up')
          } else if (eventLogOpen) {
            setEventLogHighlighted('prev')
          } else {
            moveSelectedControl(1)
          }
        }}
        onMoveDown={() => {
          if (patientModalOpen) {
            setPatientModeHighlightedIndex(
              (i) => (i + 1) % PATIENT_MODE_OPTIONS.length,
            )
          } else if (patientInfoOpen) {
            moveSelection('down')
          } else if (eventLogOpen) {
            setEventLogHighlighted('next')
          } else {
            moveSelectedControl(-1)
          }
        }}
        onEnter={() => {
          if (!patientModalOpen && patientInfoOpen) {
            handleEnter()
          } else if (eventLogOpen) {
            const totalPages = Math.max(1, Math.ceil(eventLog.length / 8))
            if (eventLogHighlighted === 'prev') {
              setEventLogPage((p) => Math.max(1, p - 1))
            } else {
              setEventLogPage((p) => Math.min(totalPages, p + 1))
            }
          } else {
            handleSelectionEnter()
          }
        }}
        twelveLeadActive={isTwelveLead}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onPatientEvent={handlePatientEvent}
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
          setLastCapture(null)
          setPrintPreviewOpen(false)
          setMedicationMode(false)
          setMedicationPage(1)
          setFlashedMed(null)
          setPatientModalOpen(false)
          setCallerInfoOpen(false)
          setEventLogOpen(false)
          setSelectedControl('dateTime')
          setBottomStatusVisible(true)
        }}
        medicationMode={medicationMode}
        medicationPage={medicationPage}
        onMedClick={handleMedClick}
        onMedPageChange={handleMedPageChange}
        onMedInfo={() => { setEventLogOpen(true); setEventLogPage(1); setEventLogHighlighted('next') }}
        onMedBack={handleMedBack}
    />
  )
}
