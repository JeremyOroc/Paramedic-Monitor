'use client'

import { useEffect, useRef, useState } from 'react'
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
import { MedicationLogModal, type MedicationLogEntry } from '@/components/monitor/MedicationLogModal'
import { useDefibSequence } from '@/hooks/useDefibSequence'
import { useAlarm } from '@/hooks/useAlarm'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { DEFAULT_VITALS, type PatientMode } from '@/types/vitals'
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
  const [isTimerRunning, setIsTimerRunning] = useState(true)
  const [medicationMode, setMedicationMode] = useState(false)
  const [medicationPage, setMedicationPage] = useState<1 | 2 | 3>(1)
  const [medicationLog, setMedicationLog] = useState<MedicationLogEntry[]>([])
  const [medInfoOpen, setMedInfoOpen] = useState(false)
  const [flashedMed, setFlashedMed] = useState<string | null>(null)
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
  const defib = useDefibSequence({ patientMode, rhythm: confirmed.rhythm })
  const alarm = useAlarm(confirmed)

  const NEXT_MED_PAGE: Record<1 | 2 | 3, 1 | 2 | 3> = { 1: 2, 2: 3, 3: 1 }

  function handleTreatment() {
    setMedicationMode(true)
  }

  function handleMedClick(name: string) {
    setMedicationLog((prev) => [...prev, { name, time: sessionTimer }])
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
      <MedicationLogModal
        open={medInfoOpen}
        log={medicationLog}
        onClose={() => setMedInfoOpen(false)}
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
        onBack={() => setView('main')}
        twelveLeadActive={isTwelveLead}
        onPowerOn={() => setIsTimerRunning(true)}
        onPowerOff={() => setIsTimerRunning(false)}
        medicationMode={medicationMode}
        medicationPage={medicationPage}
        onMedClick={handleMedClick}
        onMedPageChange={handleMedPageChange}
        onMedInfo={() => setMedInfoOpen(true)}
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
