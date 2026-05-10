'use client'

import { useState } from 'react'
import { MonitorLayout } from '@/components/monitor/MonitorLayout'
import { TopStatusBar } from '@/components/monitor/TopStatusBar'
import { SubBar } from '@/components/monitor/SubBar'
import { LeftSidebar } from '@/components/monitor/LeftSidebar'
import { RightNavCluster } from '@/components/monitor/RightNavCluster'
import { WaveformPanel } from '@/components/monitor/WaveformPanel'
import { TwelveLeadPage } from '@/components/monitor/TwelveLeadPage'
import { VitalsStrip } from '@/components/monitor/VitalsStrip'
import { BottomStatusBar } from '@/components/monitor/BottomStatusBar'
import { DefibButtonRow } from '@/components/monitor/DefibButtonRow'
import { PatientModeModal } from '@/components/monitor/PatientModeModal'
import { useDefibSequence } from '@/hooks/useDefibSequence'
import { DEFAULT_VITALS, type PatientMode } from '@/types/vitals'

type MonitorView = 'main' | '12lead'
type SecondaryChannel = 'spo2' | 'etco2'

export default function MonitorPage() {
  const [view, setView] = useState<MonitorView>('main')
  const [secondary, setSecondary] = useState<SecondaryChannel>('spo2')
  const [patientMode, setPatientMode] = useState<PatientMode>(DEFAULT_VITALS.patient_mode)
  const [patientModalOpen, setPatientModalOpen] = useState(false)

  const defib = useDefibSequence({ patientMode })

  const isTwelveLead = view === '12lead'

  return (
    <>
      <MonitorLayout
        topBar={
          <TopStatusBar
            date="2026-04-08"
            time="08:07:01"
            patientMode={patientMode}
            patientModeActive={patientModalOpen}
            onPatientModeClick={() => setPatientModalOpen(true)}
            batteryPercent={85}
            sessionTimer="00:00:10"
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
            <TwelveLeadPage rhythm={DEFAULT_VITALS.rhythm} />
          ) : (
            <WaveformPanel secondaryChannel={secondary} />
          )
        }
        vitals={
          <VitalsStrip
            hr={DEFAULT_VITALS.hr}
            bpSys={DEFAULT_VITALS.bp_sys}
            bpDia={DEFAULT_VITALS.bp_dia}
            etco2={DEFAULT_VITALS.etco2}
            spo2={DEFAULT_VITALS.spo2}
          />
        }
        rightNav={<RightNavCluster onBack={() => setView('main')} />}
        bottomBar={
          isTwelveLead ? null : (
            <BottomStatusBar
              patientMode={patientMode}
              joules={defib.energy}
              shockCount={defib.shockCount}
            />
          )
        }
        defibRow={
          isTwelveLead ? null : (
            <DefibButtonRow
              state={defib.state}
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
            />
          )
        }
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
