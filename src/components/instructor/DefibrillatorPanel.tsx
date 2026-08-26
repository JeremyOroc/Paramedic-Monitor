'use client'

import { stagedValueStatus } from '@/store/fieldState'
import { useMonitorStore } from '@/store/monitorStore'
import { cn } from '@/lib/utils'
import type { DefibrillatorModel } from '@/types/defibrillator'

type DefibrillatorPanelProps = {
  disabled?: boolean
}

const OPTIONS: ReadonlyArray<{ value: DefibrillatorModel; label: string }> = [
  { value: 'wagamiX', label: 'Wagami X' },
  { value: 'wagamiZ', label: 'Wagami Z' },
]

export function DefibrillatorPanel({ disabled = false }: DefibrillatorPanelProps) {
  const draft = useMonitorStore((state) => state.defibrillatorModelDraft)
  const saved = useMonitorStore((state) => state.defibrillatorModelSaved)
  const confirmed = useMonitorStore((state) => state.defibrillatorModelConfirmed)
  const setDraft = useMonitorStore((state) => state.setDefibrillatorModelDraft)
  const selectedModel = disabled ? confirmed : draft
  const status = stagedValueStatus(draft, saved, confirmed)

  return (
    <section
      aria-labelledby="defibrillator-model-heading"
      className="border border-neutral-800 bg-neutral-950 p-4"
    >
      <h2
        id="defibrillator-model-heading"
        className="font-mono text-sm font-black uppercase tracking-wider text-neutral-400"
      >
        Defibrillator model
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {OPTIONS.map((option) => {
          const selected = option.value === selectedModel
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => setDraft(option.value)}
              className={cn(
                'border px-4 py-5 font-mono text-sm font-black uppercase tracking-wider transition-colors disabled:cursor-not-allowed',
                selected && status === 'clean' &&
                  'border-ecg-green bg-ecg-green text-black',
                selected && status === 'dirty' &&
                  'border-cyan-bp bg-cyan-bp/15 text-cyan-bp',
                selected && status === 'pending' &&
                  'border-pending-amber bg-pending-amber/15 text-pending-amber',
                !selected &&
                  'border-neutral-700 bg-black text-neutral-400 enabled:hover:border-cyan-bp enabled:hover:text-cyan-bp',
                disabled && !selected && 'opacity-40',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
