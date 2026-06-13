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

const TEXTAREA_CHARS_PER_ROW = 38

function getPatientInformationRows(value: string) {
  if (!value) return 1

  return value.split(/\r?\n/).reduce((rows, line) => {
    return rows + Math.max(1, Math.ceil(line.length / TEXTAREA_CHARS_PER_ROW))
  }, 0)
}

export function PatientInformationPanel({
  selected,
  values,
  onTextChange,
  onToggle,
}: PatientInformationPanelProps) {
  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CHECKLISTS.map(({ id, title, letters }) => (
          <section
            key={id}
            aria-label={title}
            className={cn(
              'flex aspect-square min-h-[24rem] flex-col gap-4',
              'border border-neutral-800 bg-neutral-950 p-4',
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <h2 className="text-sm uppercase tracking-wider text-neutral-400">{title}</h2>
              <span className="text-xs uppercase tracking-wider text-neutral-600">Checklist</span>
            </div>
            <div
              data-testid={`patient-info-letter-column-${id}`}
              className="flex flex-1 flex-col items-start gap-2"
            >
              {letters.map((letter) => {
                const active = selected[id].has(letter)
                return (
                  <div key={letter} className="grid w-full grid-cols-[3rem_minmax(0,1fr)] gap-2">
                    <button
                      type="button"
                      onClick={() => onToggle(id, letter)}
                      aria-pressed={active}
                      className={cn(
                        'flex h-12 w-12 items-center justify-center border font-mono text-2xl font-bold',
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
                      rows={getPatientInformationRows(values[id][letter])}
                      className="min-h-12 min-w-0 resize-none overflow-hidden border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm leading-5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
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
