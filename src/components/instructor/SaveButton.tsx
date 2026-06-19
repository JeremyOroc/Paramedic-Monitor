'use client'

import { useMonitorStore } from '@/store/monitorStore'
import {
  hasCallerInfoDirty,
  hasDirty,
  hasDispatchCountdownDirty,
  hasDispatchRouteChanged,
  hasVitalActiveDirty,
} from '@/store/fieldState'
import { cn } from '@/lib/utils'

export function SaveButton() {
  const draft = useMonitorStore((s) => s.draft)
  const saved = useMonitorStore((s) => s.saved)
  const draftVitalActive = useMonitorStore((s) => s.draftVitalActive)
  const savedVitalActive = useMonitorStore((s) => s.savedVitalActive)
  const callerInfoDraft = useMonitorStore((s) => s.callerInfoDraft)
  const callerInfoSaved = useMonitorStore((s) => s.callerInfoSaved)
  const dispatchRouteDraft = useMonitorStore((s) => s.dispatchRouteDraft)
  const dispatchRouteSaved = useMonitorStore((s) => s.dispatchRouteSaved)
  const dispatchMinutes = useMonitorStore((s) => s.dispatchMinutes)
  const dispatchSeconds = useMonitorStore((s) => s.dispatchSeconds)
  const dispatchSavedSeconds = useMonitorStore((s) => s.dispatchSavedSeconds)
  const save = useMonitorStore((s) => s.save)
  const disabled =
    !hasDirty(draft, saved) &&
    !hasVitalActiveDirty(draftVitalActive, savedVitalActive) &&
    !hasCallerInfoDirty(callerInfoDraft, callerInfoSaved) &&
    !hasDispatchRouteChanged(dispatchRouteDraft, dispatchRouteSaved) &&
    !hasDispatchCountdownDirty(dispatchMinutes, dispatchSeconds, dispatchSavedSeconds)

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
