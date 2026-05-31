'use client'

import {
  CALLER_INFO_DISPLAY_FIELDS,
  hasCallerInfo,
  type CallerInfo,
} from '@/types/callerInfo'

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
      className="absolute left-[56px] top-[56px] bottom-0 right-0 z-30 flex flex-col font-mono shadow-[0_-8px_24px_rgba(0,0,0,0.55)]"
    >
      <header className="bg-white px-4 py-1.5 text-black">
        <h2 className="text-base font-bold">Caller Info</h2>
      </header>
      {showCountdown && (
        <div
          aria-label="Dispatch countdown"
          className="flex items-center justify-between bg-black px-4 py-2 text-[#ffaa00]"
        >
          <span className="text-xs font-bold uppercase tracking-wider">Arrivée prévue</span>
          <span className="text-2xl font-bold tabular-nums">{countdownFormatted}</span>
        </div>
      )}
      <div className="flex-1 overflow-hidden bg-[#8ba88c] px-4 py-2">
        {hasInfo ? (
          <ul className="flex flex-col gap-1">
            {displayFields.map(({ field, label, labelField }) => (
              <li key={field} className="grid grid-cols-[1fr_1fr] items-stretch">
                <span className="px-2 py-1 text-xs font-bold text-black">
                  {labelField && info[labelField].trim() !== '' ? info[labelField] : label}
                </span>
                <span className="flex items-center justify-center bg-black px-2 py-1 text-xs font-bold text-white">
                  {info[field] || '—'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-black/70 text-sm">Aucune information d&apos;appel.</p>
        )}
      </div>
      <div className="flex gap-2 bg-[#8ba88c] border-t border-black/20 px-4 py-2">
        {CALLER_EVENT_BUTTONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-label={label}
            disabled={buttonState[key].disabled}
            onClick={() => onCallerEvent(key)}
            className="flex-1 border-2 border-white bg-black px-2 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
