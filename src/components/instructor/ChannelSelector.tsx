'use client'

import { useMonitorStore, type Vitals } from '@/store/monitorStore'
import { fieldStatus } from '@/store/fieldState'
import { cn } from '@/lib/utils'

import { OnOffToggle } from './OnOffToggle'

type Option<F extends keyof Vitals> = { value: Vitals[F]; label: string }

type ChannelSelectorProps<F extends keyof Vitals> = {
  field: F
  label: string
  options: ReadonlyArray<Option<F>>
  disconnectedValue?: Vitals[F]
  defaultConnectedValue?: Vitals[F]
  hideDirtyStatus?: boolean
}

const OPTION_GRID_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
}

export function ChannelSelector<F extends keyof Vitals>({
  field,
  label,
  options,
  disconnectedValue,
  defaultConnectedValue,
  hideDirtyStatus = false,
}: ChannelSelectorProps<F>) {
  const draft = useMonitorStore((s) => s.draft)
  const saved = useMonitorStore((s) => s.saved)
  const confirmed = useMonitorStore((s) => s.confirmed)
  const setDraft = useMonitorStore((s) => s.setDraft)

  const status = fieldStatus(field, draft, saved, confirmed)
  const current = draft[field]
  const connectedOptions =
    disconnectedValue === undefined
      ? options
      : options.filter((option) => option.value !== disconnectedValue)
  const connected = disconnectedValue === undefined || current !== disconnectedValue
  const fallbackConnectedValue = defaultConnectedValue ?? connectedOptions[0]?.value
  const gridClass = OPTION_GRID_CLASS[connectedOptions.length] ?? 'grid-cols-3'
  const displayStatus = hideDirtyStatus && status === 'dirty' ? 'clean' : status

  return (
    <section className="flex h-full flex-col gap-3 border border-neutral-800 bg-neutral-950 p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm uppercase tracking-wider text-neutral-400">{label}</h2>
        <div className="flex items-center gap-2">
          {disconnectedValue !== undefined && (
            <OnOffToggle
              active={connected}
              label={label}
              onToggle={(nextConnected) => {
                if (!nextConnected) {
                  setDraft(field, disconnectedValue)
                  return
                }
                if (fallbackConnectedValue !== undefined) {
                  setDraft(field, fallbackConnectedValue)
                }
              }}
            />
          )}
          <span
            className={cn(
              'text-xs uppercase tracking-wider',
              displayStatus === 'clean' && 'text-neutral-500',
              displayStatus === 'dirty' && 'text-cyan-bp',
              displayStatus === 'pending' && 'text-pending-amber',
            )}
            data-testid={`status-${field}`}
          >
            {displayStatus === 'clean' ? '-' : displayStatus}
          </span>
        </div>
      </div>
      <div className={cn('grid gap-1', gridClass)}>
        {connectedOptions.map((o) => {
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
