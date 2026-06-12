'use client'

import { cn } from '@/lib/utils'

type OnOffToggleProps = {
  active: boolean
  label: string
  onToggle: (active: boolean) => void
  status?: string
  testId?: string
}

export function OnOffToggle({ active, label, onToggle, status, testId }: OnOffToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      aria-label={`${label} ${active ? 'on' : 'off'}`}
      aria-pressed={active}
      className={cn(
        'grid w-20 grid-cols-2 overflow-hidden border border-neutral-700 font-mono text-[10px] font-bold uppercase tracking-wider',
        active ? 'border-cyan-bp' : 'border-neutral-700',
      )}
      data-testid={testId}
      data-status={status}
    >
      <span
        className={cn(
          'px-1.5 py-1 text-center',
          !active
            ? 'bg-neutral-300 text-black'
            : 'bg-neutral-900 text-neutral-500',
        )}
      >
        Off
      </span>
      <span
        className={cn(
          'border-l border-neutral-700 px-1.5 py-1 text-center',
          active
            ? 'bg-cyan-bp text-black'
            : 'bg-neutral-900 text-neutral-500',
        )}
      >
        On
      </span>
    </button>
  )
}
