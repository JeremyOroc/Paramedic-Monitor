'use client'

import { useMonitorStore } from '@/store/monitorStore'
import { hasCallerInfoPending, hasPending } from '@/store/fieldState'
import { cn } from '@/lib/utils'

export function SendButton() {
  const saved = useMonitorStore((s) => s.saved)
  const confirmed = useMonitorStore((s) => s.confirmed)
  const callerInfoSaved = useMonitorStore((s) => s.callerInfoSaved)
  const callerInfoConfirmed = useMonitorStore((s) => s.callerInfoConfirmed)
  const send = useMonitorStore((s) => s.send)
  const disabled = !hasPending(saved, confirmed) && !hasCallerInfoPending(callerInfoSaved, callerInfoConfirmed)

  return (
    <button
      type="button"
      onClick={send}
      disabled={disabled}
      className={cn(
        'px-4 py-2 border font-mono font-bold uppercase tracking-wider text-sm',
        'border-pending-amber bg-pending-amber text-black hover:brightness-110',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100',
      )}
    >
      Send
    </button>
  )
}
