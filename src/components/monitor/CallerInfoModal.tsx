'use client'

import {
  CALLER_INFO_DISPLAY_FIELDS,
  hasCallerInfo,
  type CallerInfo,
} from '@/types/callerInfo'
import { cn } from '@/lib/utils'

export type CallerEventKey = 'acknowledge' | 'arrival' | 'transport'

type CallerInfoModalProps = {
  open: boolean
  info: CallerInfo
  onCallerEvent: (key: CallerEventKey) => void
  /** Per-button disabled state, computed by the parent from the dispatch gate. */
  buttonState: Record<CallerEventKey, { disabled: boolean }>
  /** Show the dispatch ETA countdown (locked phase only). */
  showCountdown?: boolean
  countdownFormatted?: string
  /** Locked dispatch mode uses this as a touchscreen that fills the monitor display. */
  fullScreen?: boolean
}

const CALLER_EVENT_BUTTONS: { key: CallerEventKey; label: string }[] = [
  { key: 'acknowledge', label: 'Acknowledge' },
  { key: 'arrival', label: 'Arrival' },
  { key: 'transport', label: 'Transport' },
]

export function CallerInfoModal({
  open,
  info,
  onCallerEvent,
  buttonState,
  showCountdown = false,
  countdownFormatted = '00:00',
  fullScreen = false,
}: CallerInfoModalProps) {
  if (!open) return null

  const hasInfo = hasCallerInfo(info)
  const displayFields = CALLER_INFO_DISPLAY_FIELDS.filter(({ field, labelField }) => {
    if (!labelField) return true
    return info[field].trim() !== '' || info[labelField].trim() !== ''
  })

  return (
    <section
      aria-label="Caller info"
      className={cn(
        'absolute z-30 font-sans',
        fullScreen ? 'inset-0' : 'left-[56px] top-[56px] bottom-0 right-0',
      )}
    >
      <div
        className={cn(
          'flex h-full w-full items-center justify-center overflow-hidden',
          fullScreen ? 'bg-dispatch-wall p-5' : 'bg-black/80 p-4',
        )}
      >
        <div
          data-testid="dispatch-tablet-frame"
          className={cn(
            'relative flex overflow-hidden rounded-[22px] border-[7px] border-dispatch-bezel bg-dispatch-bezel shadow-2xl',
            fullScreen
              ? 'h-[90%] w-[88%] max-w-[720px]'
              : 'h-[92%] w-[84%] min-w-[360px] max-w-[680px]',
          )}
        >
          <div className="absolute left-1/2 top-2 z-10 h-1.5 w-12 -translate-x-1/2 rounded-full bg-neutral-800" />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-neutral-900 bg-dispatch-paper text-dispatch-ink">
            <header className="border-b border-dispatch-line px-5 pb-3 pt-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-dispatch-muted">
                    Dispatch Tablet
                  </p>
                  <h2 className="mt-1 text-2xl font-black leading-none tracking-normal">
                    Caller Info
                  </h2>
                </div>
                <div className="text-right text-[10px] font-black uppercase tracking-[0.18em] text-dispatch-muted">
                  CAD
                </div>
              </div>
              {showCountdown && (
                <div
                  aria-label="Dispatch countdown"
                  className="mt-3 flex items-center justify-between rounded-md border border-dispatch-line bg-dispatch-field px-3 py-2"
                >
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-dispatch-muted">
                    ETA
                  </span>
                  <span className="font-mono text-2xl font-black tabular-nums text-dispatch-ink">
                    {countdownFormatted}
                  </span>
                </div>
              )}
            </header>
            <div className="min-h-0 flex-1 overflow-hidden px-5 py-4">
              {hasInfo ? (
                <ul className="grid gap-2">
                  {displayFields.map(({ field, label, labelField }) => (
                    <li
                      key={field}
                      className="grid grid-cols-[minmax(110px,0.82fr)_minmax(0,1.18fr)] overflow-hidden rounded-md border border-dispatch-line bg-dispatch-field"
                    >
                      <span className="border-r border-dispatch-line px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-dispatch-muted">
                        {labelField && info[labelField].trim() !== '' ? info[labelField] : label}
                      </span>
                      <span className="flex min-w-0 items-center px-3 py-2 text-sm font-bold leading-tight text-dispatch-ink">
                        {info[field] || '-'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-bold text-dispatch-muted">
                  Aucune information d&apos;appel.
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-dispatch-line bg-dispatch-surface px-5 py-3">
              {CALLER_EVENT_BUTTONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  disabled={buttonState[key].disabled}
                  onClick={() => onCallerEvent(key)}
                  className="rounded-md border border-dispatch-ink bg-dispatch-paper px-2 py-2 text-xs font-black uppercase tracking-normal text-dispatch-ink shadow-sm enabled:hover:bg-dispatch-field enabled:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
