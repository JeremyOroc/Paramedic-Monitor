'use client'

import { cn } from '@/lib/utils'

export type PatientInfoChecklist = 'sample' | 'opqrst'

type PatientInformationPanelProps = {
  selected: Record<PatientInfoChecklist, ReadonlySet<string>>
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

export function PatientInformationPanel({ selected, onToggle }: PatientInformationPanelProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {CHECKLISTS.map(({ id, title, letters }) => (
        <section
          key={id}
          aria-label={title}
          className={cn(
            'flex aspect-square min-h-[18rem] flex-col gap-4',
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
                <button
                  key={letter}
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
              )
            })}
          </div>
        </section>
      ))}
    </section>
  )
}
