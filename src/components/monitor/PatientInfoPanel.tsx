'use client'

import { cn } from '@/lib/utils'
import type { PatientSex } from '@/types/patientInfo'

export type PatientInfoField = 'age' | 'sex' | 'back'

type PatientInfoPanelProps = {
  open: boolean
  age: number
  sex: PatientSex
  selectedField: PatientInfoField
  editing: boolean
  rightOffset?: number
}

const DATA_ROWS: ReadonlyArray<{ field: 'age' | 'sex'; label: string }> = [
  { field: 'age', label: 'Patient Age' },
  { field: 'sex', label: 'Patient Sex' },
]

export function PatientInfoPanel({
  open,
  age,
  sex,
  selectedField,
  editing,
  rightOffset = 96,
}: PatientInfoPanelProps) {
  if (!open) return null

  const values: Record<'age' | 'sex', string> = {
    age: String(age),
    sex,
  }

  return (
    <section
      aria-label="Patient Info"
      className="absolute left-[56px] top-[56px] bottom-[110px] z-30 flex flex-col font-mono shadow-[0_-8px_24px_rgba(0,0,0,0.55)]"
      style={{ right: rightOffset }}
    >
      <header className="bg-white px-5 py-2 text-black">
        <h2 className="text-lg font-bold">Patient Info</h2>
      </header>
      <div className="flex-1 overflow-hidden bg-[#8ba88c] px-5 pt-6 pb-4 flex flex-col justify-between">
        <ul className="flex flex-col gap-1.5">
          {DATA_ROWS.map(({ field, label }) => {
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
                    selected && !editing ? 'bg-[#2f6df6] text-white' : 'text-black',
                  )}
                >
                  {label}
                </span>
                <span
                  className={cn(
                    'flex items-center justify-center px-3 py-2 text-lg font-bold text-white',
                    isEditing ? 'bg-[#2f6df6]' : 'bg-black',
                  )}
                >
                  <span>{values[field]}</span>
                </span>
              </li>
            )
          })}
        </ul>
        {/* Back button row — navigable via move up/down, Enter triggers back */}
        <div className="mt-4">
          <div
            aria-label="Back"
            aria-current={selectedField === 'back' ? 'true' : undefined}
            className={cn(
              'inline-flex items-center justify-center px-4 py-2 border-2 border-white font-bold text-white text-lg',
              selectedField === 'back' ? 'bg-[#2f6df6]' : 'bg-black',
            )}
          >
            &#8592;
          </div>
        </div>
      </div>
    </section>
  )
}
