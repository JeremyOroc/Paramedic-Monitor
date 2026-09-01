'use client'

import { useState } from 'react'

import { fieldStatus } from '@/store/fieldState'
import { useMonitorStore } from '@/store/monitorStore'
import { cn } from '@/lib/utils'
import type { Rhythm } from '@/types/vitals'

import { OnOffToggle } from './OnOffToggle'

type EcgRhythmSelectorProps = {
  compact?: boolean
}

type RhythmOption = {
  value: Exclude<Rhythm, 'off'>
  label: string
}

type RhythmCategory = {
  label: string
  options: ReadonlyArray<RhythmOption>
}

const ECG_RHYTHM_CATEGORIES: ReadonlyArray<RhythmCategory> = [
  {
    label: 'NSR',
    options: [{ value: 'nsr', label: 'NSR' }],
  },
  {
    label: 'Cardiac Arrest',
    options: [
      { value: 'vf', label: 'VF' },
      { value: 'vt', label: 'VT' },
      { value: 'asystole', label: 'Asystole' },
      { value: 'torsades', label: 'Torsades' },
    ],
  },
  {
    label: 'Heart Block',
    options: [
      { value: 'first-degree', label: '1st Degree' },
      { value: 'second-degree-type-1', label: '2nd Degree Type 1' },
      { value: 'second-degree-type-2', label: '2nd Degree Type 2' },
      { value: 'third-degree', label: '3rd Degree' },
    ],
  },
  {
    label: 'Bundle Branch Block',
    options: [],
  },
  {
    label: 'MI',
    options: [
      { value: 'anterior-mi', label: 'Anterior MI' },
      { value: 'inferior-mi', label: 'Inferior MI' },
    ],
  },
]

const RHYTHM_LABELS: Record<Rhythm, string> = {
  off: 'Off',
  nsr: 'NSR',
  vf: 'VF',
  vt: 'VT',
  torsades: 'Torsades',
  asystole: 'Asystole',
  'first-degree': '1st Degree',
  'second-degree-type-1': '2nd Degree Type 1',
  'second-degree-type-2': '2nd Degree Type 2',
  'third-degree': '3rd Degree',
  'anterior-mi': 'Anterior MI',
  'inferior-mi': 'Inferior MI',
}

export function EcgRhythmSelector({ compact = false }: EcgRhythmSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState('NSR')
  const draft = useMonitorStore((s) => s.draft)
  const saved = useMonitorStore((s) => s.saved)
  const confirmed = useMonitorStore((s) => s.confirmed)
  const setDraft = useMonitorStore((s) => s.setDraft)
  const lastRhythm = useMonitorStore((s) => s.lastRhythm)

  const current = draft.rhythm
  const connected = current !== 'off'
  const displayedRhythm = connected ? current : lastRhythm
  const status = fieldStatus('rhythm', draft, saved, confirmed)
  const displayStatus = status === 'dirty' ? 'clean' : status
  const rhythmButtonLabel = connected
    ? RHYTHM_LABELS[displayedRhythm]
    : `${RHYTHM_LABELS[displayedRhythm]} (Off)`
  const optionsId = 'ecg-rhythm-options'
  const selectedCategory =
    ECG_RHYTHM_CATEGORIES.find((category) => category.label === selectedCategoryLabel) ??
    ECG_RHYTHM_CATEGORIES[0]

  return (
    <section className={cn(
      'relative flex flex-col border border-neutral-800 bg-neutral-950',
      compact ? 'gap-2 p-2' : 'gap-3 p-3',
    )}>
      <div className={cn('flex items-center justify-between', compact ? 'gap-1.5' : 'gap-3')}>
        <h2 className={cn(
          'uppercase tracking-wider text-neutral-400',
          compact ? 'text-xs' : 'text-sm',
        )}>ECG</h2>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen((nextOpen) => {
                const opening = !nextOpen
                if (opening) {
                  setSelectedCategoryLabel(getCategoryForRhythm(displayedRhythm).label)
                }
                return opening
              })
            }}
            aria-expanded={open}
            aria-controls={optionsId}
            className={cn(
              'min-w-0 shrink border px-2 py-1 font-mono font-bold uppercase tracking-wider',
              compact ? 'max-w-24 truncate text-[10px]' : 'text-xs',
              open
                ? 'border-cyan-bp bg-cyan-bp text-black'
                : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800',
            )}
          >
            {rhythmButtonLabel}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <OnOffToggle
            active={connected}
            compact={compact}
            label="ECG"
            onToggle={(nextConnected) =>
              setDraft('rhythm', nextConnected ? lastRhythm : 'off')
            }
          />
          <span
            className={cn(
              'uppercase tracking-wider',
              compact ? 'text-[10px]' : 'text-xs',
              displayStatus === 'clean' && 'text-neutral-500',
              status === 'dirty' && 'text-cyan-bp',
              displayStatus === 'pending' && 'text-pending-amber',
            )}
            data-testid="status-rhythm"
          >
            {displayStatus === 'clean' ? '-' : displayStatus}
          </span>
        </div>
      </div>

      {open && (
        <div
          id={optionsId}
          data-testid={optionsId}
          className={cn(
            'flex flex-col gap-2 border border-neutral-800 bg-black p-2',
            compact && 'absolute left-0 right-0 top-full z-30 max-h-72 overflow-y-auto',
          )}
        >
          <div className="grid grid-cols-5 gap-1">
            {ECG_RHYTHM_CATEGORIES.map((category) => {
              const selected = selectedCategory.label === category.label
              return (
                <button
                  key={category.label}
                  type="button"
                  onClick={() => setSelectedCategoryLabel(category.label)}
                  aria-pressed={selected}
                  className={cn(
                    'border px-2 font-mono uppercase tracking-wider',
                    compact ? 'py-1.5 text-[9px]' : 'py-2 text-xs',
                    'border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800',
                    selected && 'border-cyan-bp bg-cyan-bp text-black font-bold',
                  )}
                >
                  {category.label}
                </button>
              )
            })}
          </div>

          <div className="border-t border-neutral-900 pt-2">
            {selectedCategory.options.length > 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {selectedCategory.options.map((option) => {
                  const selected = displayedRhythm === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setDraft('rhythm', option.value)
                        setOpen(false)
                      }}
                      aria-pressed={selected}
                      className={cn(
                        'border px-2 font-mono uppercase tracking-wider',
                        compact ? 'py-1.5 text-[10px]' : 'py-2 text-xs',
                        'border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800',
                        selected && 'border-cyan-bp bg-cyan-bp text-black font-bold',
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="border border-dashed border-neutral-800 px-2 py-2 text-xs uppercase tracking-wider text-neutral-600">
                No rhythms yet
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function getCategoryForRhythm(rhythm: Rhythm): RhythmCategory {
  if (rhythm === 'off') return ECG_RHYTHM_CATEGORIES[0]
  return (
    ECG_RHYTHM_CATEGORIES.find((category) =>
      category.options.some((option) => option.value === rhythm),
    ) ?? ECG_RHYTHM_CATEGORIES[0]
  )
}
