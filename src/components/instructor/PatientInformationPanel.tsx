'use client'

import type {
  PatientInformationChecklist,
  PatientInformationTextState,
} from '@/lib/patientInformationAutoSort'
import { cn } from '@/lib/utils'

export type PatientInfoChecklist = PatientInformationChecklist

type PatientInformationPanelProps = {
  selected: Record<PatientInfoChecklist, ReadonlySet<string>>
  values: PatientInformationTextState
  onTextChange: (checklist: PatientInfoChecklist, letter: string, value: string) => void
  onToggle: (checklist: PatientInfoChecklist, letter: string) => void
}

const CHECKLISTS: ReadonlyArray<{
  id: PatientInfoChecklist
  title: string
  letters: ReadonlyArray<string>
}> = [
  { id: 'sample', title: 'Sample', letters: ['S', 'A', 'M', 'P', 'L', 'E'] },
  { id: 'opqrst', title: 'OPQRST', letters: ['O', 'P', 'Q', 'R', 'S', 'T'] },
]

export function PatientInformationPanel({
  selected,
  values,
  onTextChange,
  onToggle,
}: PatientInformationPanelProps) {
  return (
    <section className="grid h-full min-h-0 gap-1" data-testid="patient-information-panel">
      <div className="grid h-full min-h-0 grid-rows-2 gap-1">
        {CHECKLISTS.map(({ id, title, letters }) => (
          <section
            key={id}
            aria-label={title}
            className={cn(
              'flex min-h-0 flex-col gap-1 border border-neutral-800 bg-neutral-950 p-2',
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-1">
              <h2 className="text-xs uppercase tracking-wider text-neutral-400">{title}</h2>
              <span className="text-[9px] uppercase tracking-wider text-neutral-600">Checklist</span>
            </div>
            <div
              data-testid={`patient-info-letter-column-${id}`}
              className="flex min-h-0 flex-1 flex-col items-start gap-0.5"
            >
              {letters.map((letter) => {
                const active = selected[id].has(letter)
                return (
                  <div key={letter} className="grid min-h-0 w-full flex-1 grid-cols-[2.25rem_minmax(0,1fr)] gap-1">
                    <button
                      type="button"
                      onClick={() => onToggle(id, letter)}
                      aria-pressed={active}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center border font-mono text-lg font-bold',
                        'transition-[background-color,border-color,color] duration-150',
                        active
                          ? 'border-ecg-green bg-ecg-green text-black'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800',
                      )}
                    >
                      {letter}
                    </button>
                    <textarea
                      value={values[id][letter]}
                      onChange={(event) => onTextChange(id, letter, event.target.value)}
                      aria-label={`${title} ${letter} information`}
                      rows={2}
                      className="h-9 min-h-9 min-w-0 resize-none overflow-y-auto border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-xs leading-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
                    />
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
