'use client'

import type { MonitorSelection } from '@/types/monitorSelection'
import { cn } from '@/lib/utils'

type SubBarProps = {
  selected?: MonitorSelection
  onToggleBottomStatus?: () => void
}

export function SubBar({ selected, onToggleBottomStatus }: SubBarProps) {
  return (
    <div className="h-full w-full flex items-center gap-1 px-1 font-mono text-xs border-b border-neutral-800 bg-black text-white">
      <button
        type="button"
        aria-label="Toggle bottom status panel"
        onClick={onToggleBottomStatus}
        className={cn(
          'grid h-[18px] w-[74px] place-items-center rounded-[3px] border border-neutral-300 text-sm font-bold leading-none text-white',
          'focus:outline-none focus:ring-1 focus:ring-cyan-200',
          selected === 'bottomStatusToggle' && 'bg-[var(--color-selection-blue)] text-white',
        )}
      >
        -
      </button>
      <div
        aria-hidden="true"
        className="h-[18px] w-[min(58%,520px)] rounded-[3px] border border-neutral-400 bg-black"
      />
    </div>
  )
}
