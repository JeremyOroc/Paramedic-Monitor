'use client'

import { cn } from '@/lib/utils'

type OnOffToggleProps = {
  active: boolean
  compact?: boolean
  disabled?: boolean
  label: string
  onToggle: (active: boolean) => void
  status?: string
  testId?: string
}

export function OnOffToggle({
  active,
  compact = false,
  disabled = false,
  label,
  onToggle,
  status,
  testId,
}: OnOffToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(!active)}
      aria-label={`${label} ${active ? 'on' : 'off'}`}
      aria-pressed={active}
      className={cn(
        'grid grid-cols-2 overflow-hidden border border-neutral-700 font-mono font-bold uppercase tracking-wider',
        compact ? 'w-16 text-[9px] xl:[@media(min-height:800px)]:w-20 xl:[@media(min-height:800px)]:text-[10px]' : 'w-20 text-[10px]',
        active ? 'border-cyan-bp' : 'border-neutral-700',
        disabled && 'cursor-not-allowed opacity-60',
      )}
      data-testid={testId}
      data-status={status}
    >
      <span
        className={cn(
          compact ? 'px-1 py-0.5 text-center xl:[@media(min-height:800px)]:py-2' : 'px-1.5 py-1 text-center',
          !active
            ? 'bg-neutral-300 text-black'
            : 'bg-neutral-900 text-neutral-500',
        )}
      >
        Off
      </span>
      <span
        className={cn(
          'border-l border-neutral-700 text-center',
          compact ? 'px-1 py-0.5 xl:[@media(min-height:800px)]:py-2' : 'px-1.5 py-1',
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
