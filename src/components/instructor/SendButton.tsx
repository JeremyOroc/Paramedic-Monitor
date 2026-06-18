'use client'

import { useMonitorStore } from '@/store/monitorStore'
import {
  hasCallerInfoPending,
  hasDispatchRouteDurationPending,
  hasDispatchRouteChanged,
  hasPending,
  hasVitalActivePending,
} from '@/store/fieldState'
import { cn } from '@/lib/utils'

export function SendButton() {
  const saved = useMonitorStore((s) => s.saved)
  const confirmed = useMonitorStore((s) => s.confirmed)
  const savedVitalActive = useMonitorStore((s) => s.savedVitalActive)
  const confirmedVitalActive = useMonitorStore((s) => s.confirmedVitalActive)
  const callerInfoSaved = useMonitorStore((s) => s.callerInfoSaved)
  const callerInfoConfirmed = useMonitorStore((s) => s.callerInfoConfirmed)
  const dispatchRouteSaved = useMonitorStore((s) => s.dispatchRouteSaved)
  const dispatchRouteConfirmed = useMonitorStore((s) => s.dispatchRouteConfirmed)
  const dispatchMinutes = useMonitorStore((s) => s.dispatchMinutes)
  const dispatchSeconds = useMonitorStore((s) => s.dispatchSeconds)
  const send = useMonitorStore((s) => s.send)
  const disabled =
    !hasPending(saved, confirmed) &&
    !hasVitalActivePending(savedVitalActive, confirmedVitalActive) &&
    !hasCallerInfoPending(callerInfoSaved, callerInfoConfirmed) &&
    !hasDispatchRouteChanged(dispatchRouteSaved, dispatchRouteConfirmed) &&
    !hasDispatchRouteDurationPending(
      dispatchRouteConfirmed,
      dispatchMinutes,
      dispatchSeconds,
    )

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
