'use client'

import { useState } from 'react'

import { InstructorLayout } from '@/components/instructor/InstructorLayout'
import { VitalsControls } from '@/components/instructor/VitalsControls'
import { CallerInfoForm } from '@/components/instructor/CallerInfoForm'
import {
  PatientInformationPanel,
  type PatientInfoChecklist,
} from '@/components/instructor/PatientInformationPanel'
import { SaveButton } from '@/components/instructor/SaveButton'
import { SendButton } from '@/components/instructor/SendButton'
import {
  EMPTY_PATIENT_INFORMATION_TEXT,
  parsePatientInformationAutoSort,
  type PatientInformationTextState,
} from '@/lib/patientInformationAutoSort'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { cn } from '@/lib/utils'

type AdminTab = 'monitor' | 'caller' | 'patient'

type PatientInformationSelections = Record<PatientInfoChecklist, Set<string>>

const EMPTY_PATIENT_INFORMATION_SELECTIONS = (): PatientInformationSelections => ({
  sample: new Set<string>(),
  opqrst: new Set<string>(),
})

export default function AdminPage() {
  useStoreHydration()
  const [tab, setTab] = useState<AdminTab>('monitor')
  const [patientSelections, setPatientSelections] = useState<PatientInformationSelections>(
    EMPTY_PATIENT_INFORMATION_SELECTIONS,
  )
  const [patientAutoSortText, setPatientAutoSortText] = useState('')
  const [patientText, setPatientText] = useState<PatientInformationTextState>(
    EMPTY_PATIENT_INFORMATION_TEXT,
  )
  const reset = useMonitorStore((s) => s.reset)
  const resetMonitorVitals = useMonitorStore((s) => s.resetMonitorVitals)
  const resetPatientInformation = () => {
    setPatientSelections(EMPTY_PATIENT_INFORMATION_SELECTIONS())
    setPatientAutoSortText('')
    setPatientText(EMPTY_PATIENT_INFORMATION_TEXT())
  }
  const handleReset =
    tab === 'monitor'
      ? resetMonitorVitals
      : tab === 'caller'
        ? reset
        : resetPatientInformation

  const togglePatientSelection = (checklist: PatientInfoChecklist, letter: string) => {
    setPatientSelections((current) => {
      const nextChecklist = new Set(current[checklist])
      if (nextChecklist.has(letter)) {
        nextChecklist.delete(letter)
      } else {
        nextChecklist.add(letter)
      }
      return {
        ...current,
        [checklist]: nextChecklist,
      }
    })
  }

  const handlePatientTextChange = (
    checklist: PatientInfoChecklist,
    letter: string,
    value: string,
  ) => {
    setPatientText((current) => ({
      ...current,
      [checklist]: {
        ...current[checklist],
        [letter]: value,
      },
    }))
  }

  const handlePatientAutoSortChange = (value: string) => {
    setPatientAutoSortText(value)
    setPatientText(parsePatientInformationAutoSort(value))
  }

  return (
    <InstructorLayout>
      <div className="grid grid-cols-3 border border-neutral-800 bg-neutral-950 p-1">
        <button
          type="button"
          onClick={() => setTab('monitor')}
          aria-pressed={tab === 'monitor'}
          className={cn(
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
            tab === 'monitor'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Monitor
        </button>
        <button
          type="button"
          onClick={() => setTab('caller')}
          aria-pressed={tab === 'caller'}
          className={cn(
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
            tab === 'caller'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Caller Info
        </button>
        <button
          type="button"
          onClick={() => setTab('patient')}
          aria-pressed={tab === 'patient'}
          className={cn(
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
            tab === 'patient'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Patient Information
        </button>
      </div>
      {tab === 'monitor' ? (
        <VitalsControls />
      ) : tab === 'patient' ? (
        <PatientInformationPanel
          selected={patientSelections}
          autoSortText={patientAutoSortText}
          values={patientText}
          onAutoSortChange={handlePatientAutoSortChange}
          onTextChange={handlePatientTextChange}
          onToggle={togglePatientSelection}
        />
      ) : (
        <CallerInfoForm />
      )}
      <div className="flex items-center gap-3">
        <SaveButton />
        <SendButton />
        <button
          type="button"
          onClick={handleReset}
          className="ml-auto px-3 py-2 border border-neutral-700 text-neutral-400 font-mono uppercase tracking-wider text-xs hover:bg-neutral-800"
        >
          Reset
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Open <span className="text-neutral-300">/</span> in another tab to see the monitor.
        Changes propagate after <span className="text-pending-amber">Send</span>.
      </p>
    </InstructorLayout>
  )
}
