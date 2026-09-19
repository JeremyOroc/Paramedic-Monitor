'use client'

import { useState } from 'react'

import { useMonitorStore } from '@/store/monitorStore'
import {
  hasCallerInfoPending,
  hasDispatchRouteDurationPending,
  hasDispatchRouteAuthoredChanged,
  hasDefibrillatorModelPending,
  hasPending,
  hasVitalActivePending,
} from '@/store/fieldState'
import { cn } from '@/lib/utils'

type SendButtonProps = {
  onSent?: () => Promise<void> | void
  beforeSend?: () => Promise<boolean> | boolean
  forceDisabled?: boolean
}

export function SendButton({ beforeSend, onSent, forceDisabled = false }: SendButtonProps) {
  const saved = useMonitorStore((s) => s.saved)
  const confirmedAuthored = useMonitorStore((s) => s.confirmedAuthored)
  const savedVitalActive = useMonitorStore((s) => s.savedVitalActive)
  const confirmedVitalActive = useMonitorStore((s) => s.confirmedVitalActive)
  const callerInfoSaved = useMonitorStore((s) => s.callerInfoSaved)
  const callerInfoConfirmed = useMonitorStore((s) => s.callerInfoConfirmed)
  const dispatchRouteSaved = useMonitorStore((s) => s.dispatchRouteSaved)
  const dispatchRouteConfirmed = useMonitorStore((s) => s.dispatchRouteConfirmed)
  const dispatchSavedSeconds = useMonitorStore((s) => s.dispatchSavedSeconds)
  const dispatchConfirmedSeconds = useMonitorStore((s) => s.dispatchConfirmedSeconds)
  const dispatchCountdownLocked = useMonitorStore((s) => s.dispatch.countdownLocked)
  const defibrillatorModelSaved = useMonitorStore((s) => s.defibrillatorModelSaved)
  const defibrillatorModelConfirmed = useMonitorStore((s) => s.defibrillatorModelConfirmed)
  const vitalTrendSavedRevision = useMonitorStore((s) => s.vitalTrendSavedRevision)
  const vitalTrendConsumedRevision = useMonitorStore((s) => s.vitalTrendConsumedRevision)
  const send = useMonitorStore((s) => s.send)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const disabled =
    !hasPending(saved, confirmedAuthored) &&
    !hasVitalActivePending(savedVitalActive, confirmedVitalActive) &&
    !hasCallerInfoPending(callerInfoSaved, callerInfoConfirmed) &&
    !hasDispatchRouteAuthoredChanged(dispatchRouteSaved, dispatchRouteConfirmed) &&
    (dispatchCountdownLocked ||
      !hasDispatchRouteDurationPending(dispatchSavedSeconds, dispatchConfirmedSeconds)) &&
    !hasDefibrillatorModelPending(defibrillatorModelSaved, defibrillatorModelConfirmed) &&
    vitalTrendSavedRevision === vitalTrendConsumedRevision

  return (
    <button
      type="button"
      onClick={async () => {
        if (beforeSend && !(await beforeSend())) return
        setStatus('sending')
        try {
          send()
          await onSent?.()
          setStatus('sent')
        } catch {
          setStatus('error')
        }
      }}
      disabled={forceDisabled || disabled || status === 'sending'}
      className={cn(
        'px-4 py-2 border font-mono font-bold uppercase tracking-wider text-sm',
        'border-pending-amber bg-pending-amber text-black hover:brightness-110',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100',
      )}
    >
      {status === 'sending' ? 'Sending' : status === 'error' ? 'Retry Send' : 'Send'}
    </button>
  )
}
