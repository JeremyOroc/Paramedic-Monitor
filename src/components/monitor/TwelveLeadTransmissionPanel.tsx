'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import {
  TWELVE_LEAD_TRANSMISSION_DESTINATIONS,
  TWELVE_LEAD_TRANSMISSION_RETURN_INDEX,
} from '@/lib/twelveLeadTransmission'

type TwelveLeadTransmissionPanelProps = {
  open: boolean
  highlightedIndex: number
  sentDestination: string | null
  sentUntil: number | null
}

export function TwelveLeadTransmissionPanel({
  open,
  highlightedIndex,
  sentDestination,
  sentUntil,
}: TwelveLeadTransmissionPanelProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!open || sentUntil === null) return
    const remaining = sentUntil - Date.now()
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, remaining),
    )
    return () => window.clearTimeout(timer)
  }, [open, sentUntil])

  if (!open) return null

  const confirmationVisible =
    sentDestination !== null && sentUntil !== null && sentUntil > now

  return (
    <section
      role="listbox"
      aria-label="12-lead transmission destinations"
      className="absolute bottom-0 left-[56px] right-[96px] top-[56px] z-30 flex min-h-0 flex-col bg-modal-surface p-3 font-mono text-black shadow-[0_-8px_24px_rgba(0,0,0,0.55)]"
    >
      <div
        role="presentation"
        className="flex min-h-0 flex-1 flex-col gap-1"
      >
        {TWELVE_LEAD_TRANSMISSION_DESTINATIONS.map((destination, index) => (
          <div
            key={destination}
            role="option"
            aria-selected={highlightedIndex === index}
            className={cn(
              'flex min-h-0 flex-1 items-center px-4 text-[clamp(12px,1.35vw,18px)] font-bold',
              highlightedIndex === index
                ? 'bg-selection-blue text-white'
                : 'bg-black text-white',
            )}
          >
            {destination}
          </div>
        ))}
      </div>

      <div
        role="option"
        aria-selected={highlightedIndex === TWELVE_LEAD_TRANSMISSION_RETURN_INDEX}
        className={cn(
          'mt-3 w-28 px-3 py-2 text-center text-sm font-bold',
          highlightedIndex === TWELVE_LEAD_TRANSMISSION_RETURN_INDEX
            ? 'bg-selection-blue text-white'
            : 'bg-black text-white',
        )}
      >
        Return
      </div>

      {confirmationVisible ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/75 text-white"
        >
          <span
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-ecg-green text-5xl font-bold text-ecg-green"
          >
            ✓
          </span>
          <span className="mt-4 text-3xl font-black tracking-[0.18em] text-ecg-green">
            SENT
          </span>
          <span className="mt-3 max-w-[80%] text-center text-lg font-bold">
            {sentDestination}
          </span>
        </div>
      ) : null}
    </section>
  )
}
