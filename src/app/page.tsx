'use client'

import { useEffect, useState } from 'react'
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
import {
  PatientInfoPanel,
  type PatientInfoField,
} from '@/components/monitor/PatientInfoPanel'
import { useDefibSequence } from '@/hooks/useDefibSequence'
import { useAlarm } from '@/hooks/useAlarm'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { DEFAULT_VITALS, type PatientMode } from '@/types/vitals'
import { clampAge, toggleSex, type PatientSex } from '@/types/patientInfo'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { formatMonitorClock } from '@/lib/monitorClock'

type MonitorView = 'main' | '12lead'
type SecondaryChannel = 'spo2' | 'etco2'

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
  const patientInfo = useMonitorStore((s) => s.patientInfo)
  const setPatientAge = useMonitorStore((s) => s.setPatientAge)
  const setPatientSex = useMonitorStore((s) => s.setPatientSex)
  const defib = useDefibSequence({ patientMode })
  const alarm = useAlarm(confirmed)

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
    if (patientInfoOpen) {
      setPatientInfoOpen(false)
      return
    }
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
            onTwelveLead={() => setView('12lead')}
            onToggleEtco2={() =>
              setSecondary((s) => (s === 'spo2' ? 'etco2' : 'spo2'))
            }
            onBack={() => setView('main')}
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
          setCallerInfoOpen(true)
        }}
        onCharge={defib.onCharge}
        onShock={defib.onShock}
        onEnergyUp={defib.onEnergyUp}
        onEnergyDown={defib.onEnergyDown}
        onTwelveLead={() => setView('12lead')}
        onToggleEtco2={() =>
          setSecondary((s) => (s === 'spo2' ? 'etco2' : 'spo2'))
        }
        onLeftAnalyse={() => setCallerInfoOpen(true)}
        onBack={handleBack}
        onPatientInfo={openPatientInfo}
        // TODO: capture the current 12-lead graphs and render them as a printout
        // (pink grid paper, 3x4 lead layout + rhythm strip). Placeholder for now.
        onCaptureTwelveLead={() => {}}
        onMoveUp={() => moveSelection('up')}
        onMoveDown={() => moveSelection('down')}
        onEnter={handleEnter}
        twelveLeadActive={isTwelveLead}
        onPowerOn={() => setIsTimerRunning(true)}
        onPowerOff={() => setIsTimerRunning(false)}
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
