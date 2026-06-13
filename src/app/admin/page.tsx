'use client'

import { useState } from 'react'

import { InstructorLayout } from '@/components/instructor/InstructorLayout'
import { VitalsControls } from '@/components/instructor/VitalsControls'
import { CallerInfoForm } from '@/components/instructor/CallerInfoForm'
import {
  PatientInformationPanel,
  type PatientInfoChecklist,
} from '@/components/instructor/PatientInformationPanel'
import {
  PatientPhysicalPanel,
  type PatientPhysicalSelection,
} from '@/components/instructor/PatientPhysicalPanel'
import { SaveButton } from '@/components/instructor/SaveButton'
import { SendButton } from '@/components/instructor/SendButton'
import {
  CALLER_INFO_AUTO_SORT_FIELDS,
  parseCallerInfoAutoSort,
} from '@/lib/callerInfoAutoSort'
import {
  EMPTY_PATIENT_INFORMATION_TEXT,
  parsePatientInformationAutoSort,
  type PatientInformationTextState,
} from '@/lib/patientInformationAutoSort'
import {
  parsePatientPhysicalAutoSort,
  type PatientPhysicalFindings,
} from '@/lib/patientPhysicalAutoSort'
import { parseVitalsAutoSort } from '@/lib/vitalsAutoSort'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { cn } from '@/lib/utils'
import type { NumericVitalField } from '@/types/vitals'

type AdminTab = 'monitor' | 'caller' | 'patient' | 'physical'
type PatientPhysicalIconGroupId =
  | 'respiratory'
  | 'pulse'
  | 'skin-extremities'
  | 'scene-environment'

type PatientInformationSelections = Record<PatientInfoChecklist, Set<string>>

const EMPTY_PATIENT_INFORMATION_SELECTIONS = (): PatientInformationSelections => ({
  sample: new Set<string>(),
  opqrst: new Set<string>(),
})

const AUTO_SORT_VITAL_FIELDS: ReadonlyArray<NumericVitalField> = [
  'hr',
  'spo2',
  'bp_sys',
  'bp_dia',
  'etco2',
]

export default function AdminPage() {
  useStoreHydration()
  const [tab, setTab] = useState<AdminTab>('monitor')
  const [patientSelections, setPatientSelections] = useState<PatientInformationSelections>(
    EMPTY_PATIENT_INFORMATION_SELECTIONS,
  )
  const [universalAutoSortText, setUniversalAutoSortText] = useState('')
  const [patientText, setPatientText] = useState<PatientInformationTextState>(
    EMPTY_PATIENT_INFORMATION_TEXT,
  )
  const [patientPhysicalSelections, setPatientPhysicalSelections] = useState<
    Set<PatientPhysicalSelection>
  >(new Set<PatientPhysicalSelection>())
  const [patientPhysicalFindings, setPatientPhysicalFindings] =
    useState<PatientPhysicalFindings>({})
  const [patientPhysicalActiveIconGroup, setPatientPhysicalActiveIconGroup] =
    useState<PatientPhysicalIconGroupId | null>(null)
  const reset = useMonitorStore((s) => s.reset)
  const resetMonitorVitals = useMonitorStore((s) => s.resetMonitorVitals)
  const setDraft = useMonitorStore((s) => s.setDraft)
  const setCallerInfoDraft = useMonitorStore((s) => s.setCallerInfoDraft)
  const resetPatientInformation = () => {
    setPatientSelections(EMPTY_PATIENT_INFORMATION_SELECTIONS())
    setPatientText(EMPTY_PATIENT_INFORMATION_TEXT())
  }
  const resetPatientPhysical = () => {
    setPatientPhysicalSelections(new Set<PatientPhysicalSelection>())
    setPatientPhysicalFindings({})
    setPatientPhysicalActiveIconGroup(null)
  }
  const resetUniversalAutoSort = () => {
    reset()
    setUniversalAutoSortText('')
    resetPatientInformation()
    resetPatientPhysical()
  }
  const handleReset =
    tab === 'monitor'
      ? resetMonitorVitals
      : tab === 'caller'
        ? resetUniversalAutoSort
        : tab === 'patient'
          ? resetPatientInformation
          : resetPatientPhysical

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

  const togglePatientPhysicalSelection = (selection: PatientPhysicalSelection) => {
    setPatientPhysicalSelections((current) => {
      const next = new Set(current)
      if (next.has(selection)) {
        next.delete(selection)
      } else {
        next.add(selection)
      }
      return next
    })
  }

  const applyParsedVitals = (parsed: ReturnType<typeof parseVitalsAutoSort>) => {
    for (const field of AUTO_SORT_VITAL_FIELDS) {
      const value = parsed[field]
      if (value !== undefined) {
        setDraft(field, value)
      }
    }
  }

  const handleUniversalAutoSortChange = (value: string) => {
    setUniversalAutoSortText(value)

    const callerInfo = parseCallerInfoAutoSort(value)
    for (const field of CALLER_INFO_AUTO_SORT_FIELDS) {
      const parsedValue = callerInfo[field]
      if (parsedValue !== undefined) {
        setCallerInfoDraft(field, parsedValue)
      }
    }

    applyParsedVitals(parseVitalsAutoSort(value))
    setPatientText(parsePatientInformationAutoSort(value))
    setPatientPhysicalFindings(parsePatientPhysicalAutoSort(value))
  }

  const handlePatientPhysicalIconGroupClick = (selection: PatientPhysicalIconGroupId) => {
    setPatientPhysicalSelections((current) => {
      if (current.has(selection)) return current
      const next = new Set(current)
      next.add(selection)
      return next
    })
    setPatientPhysicalActiveIconGroup((current) => (current === selection ? null : selection))
  }

  return (
    <InstructorLayout>
      <div className="grid grid-cols-2 border border-neutral-800 bg-neutral-950 p-1 md:grid-cols-4">
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
        <button
          type="button"
          onClick={() => setTab('physical')}
          aria-pressed={tab === 'physical'}
          className={cn(
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
            tab === 'physical'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Patient Physical
        </button>
      </div>
      {tab === 'monitor' ? (
        <VitalsControls autoSortText={universalAutoSortText} />
      ) : tab === 'patient' ? (
        <PatientInformationPanel
          selected={patientSelections}
          values={patientText}
          onTextChange={handlePatientTextChange}
          onToggle={togglePatientSelection}
        />
      ) : tab === 'physical' ? (
        <PatientPhysicalPanel
          selected={patientPhysicalSelections}
          findings={patientPhysicalFindings}
          activeIconGroup={patientPhysicalActiveIconGroup}
          onToggle={togglePatientPhysicalSelection}
          onIconGroupClick={handlePatientPhysicalIconGroupClick}
        />
      ) : (
        <CallerInfoForm
          autoSortText={universalAutoSortText}
          onAutoSortChange={handleUniversalAutoSortChange}
        />
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
