'use client'

import { useMonitorStore } from '@/store/monitorStore'
import { hasDirty } from '@/store/fieldState'
import { cn } from '@/lib/utils'

export function SaveButton() {
  const draft = useMonitorStore((s) => s.draft)
  const saved = useMonitorStore((s) => s.saved)
  const save = useMonitorStore((s) => s.save)
  const disabled = !hasDirty(draft, saved)

  return (
    <button
      type="button"
      onClick={save}
      disabled={disabled}
      className={cn(
        'px-4 py-2 border font-mono uppercase tracking-wider text-sm',
        'border-cyan-bp bg-cyan-bp/10 text-cyan-bp hover:bg-cyan-bp/20',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cyan-bp/10',
      )}
    >
      Save
    </button>
  )
}
