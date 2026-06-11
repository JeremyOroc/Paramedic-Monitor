'use client'

import { useState } from 'react'

import { fieldStatus } from '@/store/fieldState'
import { useMonitorStore } from '@/store/monitorStore'
import { cn } from '@/lib/utils'
import type { Rhythm } from '@/types/vitals'

import { OnOffToggle } from './OnOffToggle'

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
    options: [],
  },
  {
    label: 'Bundle Branch Block',
    options: [],
  },
  {
    label: 'MI',
    options: [],
  },
]

const RHYTHM_LABELS: Record<Rhythm, string> = {
  off: 'Off',
  nsr: 'NSR',
  vf: 'VF',
  vt: 'VT',
  torsades: 'Torsades',
  asystole: 'Asystole',
}

export function EcgRhythmSelector() {
  const [open, setOpen] = useState(false)
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState('NSR')
  const draft = useMonitorStore((s) => s.draft)
  const saved = useMonitorStore((s) => s.saved)
  const confirmed = useMonitorStore((s) => s.confirmed)
  const setDraft = useMonitorStore((s) => s.setDraft)

  const current = draft.rhythm
  const connected = current !== 'off'
  const status = fieldStatus('rhythm', draft, saved, confirmed)
  const optionsId = 'ecg-rhythm-options'
  const selectedCategory =
    ECG_RHYTHM_CATEGORIES.find((category) => category.label === selectedCategoryLabel) ??
    ECG_RHYTHM_CATEGORIES[0]

  return (
    <section className="flex h-full flex-col gap-3 border border-neutral-800 bg-neutral-950 p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm uppercase tracking-wider text-neutral-400">ECG</h2>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="min-w-0 truncate border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs uppercase tracking-wider text-neutral-400">
            Rhythm:{' '}
            <span className="font-bold text-neutral-100">
              {RHYTHM_LABELS[current]}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setOpen((nextOpen) => {
                const opening = !nextOpen
                if (opening) {
                  setSelectedCategoryLabel(getCategoryForRhythm(current).label)
                }
                return opening
              })
            }}
            aria-expanded={open}
            aria-controls={optionsId}
            className={cn(
              'shrink-0 border px-2 py-1 text-xs font-mono font-bold uppercase tracking-wider',
              open
                ? 'border-cyan-bp bg-cyan-bp text-black'
                : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800',
            )}
          >
            Rhythm Options
          </button>
        </div>
        <div className="flex items-center gap-2">
          <OnOffToggle
            active={connected}
            label="ECG"
            onToggle={(nextConnected) => setDraft('rhythm', nextConnected ? 'nsr' : 'off')}
          />
          <span
            className={cn(
              'text-xs uppercase tracking-wider',
              status === 'clean' && 'text-neutral-500',
              status === 'dirty' && 'text-cyan-bp',
              status === 'pending' && 'text-pending-amber',
            )}
            data-testid="status-rhythm"
          >
            {status === 'clean' ? '-' : status}
          </span>
        </div>
      </div>

      {open && (
        <div
          id={optionsId}
          data-testid={optionsId}
          className="flex flex-col gap-2 border border-neutral-800 bg-black/40 p-2"
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
                    'border px-2 py-2 text-xs font-mono uppercase tracking-wider',
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
                  const selected = current === option.value
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
                        'border px-2 py-2 text-xs font-mono uppercase tracking-wider',
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
