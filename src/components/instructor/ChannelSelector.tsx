'use client'

import { useMonitorStore, type Vitals } from '@/store/monitorStore'
import { fieldStatus } from '@/store/fieldState'
import { cn } from '@/lib/utils'

type Option<F extends keyof Vitals> = { value: Vitals[F]; label: string }

type ChannelSelectorProps<F extends keyof Vitals> = {
  field: F
  label: string
  options: ReadonlyArray<Option<F>>
}

export function ChannelSelector<F extends keyof Vitals>({
  field,
  label,
  options,
}: ChannelSelectorProps<F>) {
  const draft = useMonitorStore((s) => s.draft)
  const saved = useMonitorStore((s) => s.saved)
  const confirmed = useMonitorStore((s) => s.confirmed)
  const setDraft = useMonitorStore((s) => s.setDraft)

  const status = fieldStatus(field, draft, saved, confirmed)
  const current = draft[field]

  return (
    <section className="flex flex-col gap-3 border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wider text-neutral-400">{label}</h2>
        <span
          className={cn(
            'text-xs uppercase tracking-wider',
            status === 'clean' && 'text-neutral-500',
            status === 'dirty' && 'text-cyan-bp',
            status === 'pending' && 'text-pending-amber',
          )}
          data-testid={`status-${field}`}
        >
          {status === 'clean' ? '—' : status}
        </span>
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const selected = current === o.value
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => setDraft(field, o.value)}
              aria-pressed={selected}
              className={cn(
                'px-2 py-2 border text-xs font-mono uppercase tracking-wider',
                'border-neutral-700 bg-neutral-900 text-neutral-300',
                'hover:bg-neutral-800',
                selected && 'border-cyan-bp bg-cyan-bp text-black font-bold',
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
