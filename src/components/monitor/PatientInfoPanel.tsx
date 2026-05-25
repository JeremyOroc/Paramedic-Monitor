'use client'

import { cn } from '@/lib/utils'
import type { PatientSex } from '@/types/patientInfo'

export type PatientInfoField = 'age' | 'sex'

type PatientInfoPanelProps = {
  open: boolean
  age: number
  sex: PatientSex
  selectedField: PatientInfoField
  editing: boolean
}

const ROWS: ReadonlyArray<{ field: PatientInfoField; label: string }> = [
  { field: 'age', label: 'Patient Age' },
  { field: 'sex', label: 'Patient Sex' },
]

export function PatientInfoPanel({
  open,
  age,
  sex,
  selectedField,
  editing,
}: PatientInfoPanelProps) {
  if (!open) return null

  const values: Record<PatientInfoField, string> = {
    age: String(age),
    sex,
  }

  return (
    <section
      aria-label="Patient Info"
      className="absolute inset-x-0 bottom-0 z-30 flex h-2/3 flex-col font-mono shadow-[0_-8px_24px_rgba(0,0,0,0.55)]"
    >
      <header className="bg-white px-5 py-2 text-black">
        <h2 className="text-lg font-bold">Patient Info</h2>
      </header>
      <div className="flex-1 bg-[#8ba88c] px-5 pt-6">
        <ul className="flex flex-col gap-1.5">
          {ROWS.map(({ field, label }) => {
            const selected = field === selectedField
            const isEditing = selected && editing
            return (
              <li
                key={field}
                aria-current={selected ? 'true' : undefined}
                data-editing={isEditing ? 'true' : undefined}
                className="grid grid-cols-[1fr_1fr] items-stretch"
              >
                <span
                  className={cn(
                    'px-3 py-2 text-lg font-bold',
                    // blue cursor sits on the label while browsing the options
                    selected && !editing ? 'bg-[#2f6df6] text-white' : 'text-black',
                  )}
                >
                  {label}
                </span>
                <span
                  className={cn(
                    'flex items-center justify-center px-3 py-2 text-lg font-bold text-white',
                    // blue cursor jumps to the value while editing the field
                    isEditing ? 'bg-[#2f6df6]' : 'bg-black',
                  )}
                >
                  <span>{values[field]}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
