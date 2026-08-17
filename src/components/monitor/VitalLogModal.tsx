'use client'

import { cn } from '@/lib/utils'
import type { VitalLogEntry } from '@/hooks/useVitalLog'

export const VITAL_LOG_ITEMS_PER_PAGE = 8

export type VitalLogHighlightedButton = 'exit' | 'prev' | 'next'

type VitalLogModalProps = {
  open: boolean
  log: VitalLogEntry[]
  page?: number
  highlightedButton?: VitalLogHighlightedButton
}

function displayValue(value: number | null): string {
  return value === null ? '-' : String(value)
}

export function VitalLogModal({
  open,
  log,
  page = 1,
  highlightedButton = 'exit',
}: VitalLogModalProps) {
  if (!open) return null

  const totalPages = Math.max(1, Math.ceil(log.length / VITAL_LOG_ITEMS_PER_PAGE))
  const pageEntries = log.slice(
    (page - 1) * VITAL_LOG_ITEMS_PER_PAGE,
    page * VITAL_LOG_ITEMS_PER_PAGE,
  )
  const showPagination = log.length > VITAL_LOG_ITEMS_PER_PAGE

  return (
    <section
      aria-label="Vital Log"
      className="absolute left-[56px] right-[96px] top-[56px] bottom-[110px] z-30 flex flex-col font-mono shadow-[0_-8px_24px_rgba(0,0,0,0.55)]"
    >
      <header className="bg-white px-4 py-1.5 text-black">
        <h2 className="text-base font-bold">Vital Log</h2>
      </header>
      <div className="flex-1 overflow-hidden bg-[var(--color-modal-surface)] px-3 py-2">
        <div className="grid grid-cols-[1.2fr_repeat(5,minmax(0,1fr))] gap-px bg-black/30 text-center text-[10px] font-bold tabular-nums">
          <div className="bg-black px-1 py-1 text-white">TIME</div>
          <div className="bg-black px-1 py-1 text-ecg-green">FC</div>
          <div className="bg-black px-1 py-1 text-cyan-bp">PNI SYS</div>
          <div className="bg-black px-1 py-1 text-cyan-bp">PNI DIA</div>
          <div className="bg-black px-1 py-1 text-purple-etco2">ETCO2</div>
          <div className="bg-black px-1 py-1 text-yellow-spo2">SPO2</div>
          {pageEntries.map((entry) => (
            <div key={entry.timestamp} className="contents">
              <div className="bg-black px-1 py-1 text-white">{entry.timestamp}</div>
              <div className="bg-black px-1 py-1 text-white">{displayValue(entry.fc)}</div>
              <div className="bg-black px-1 py-1 text-white">{displayValue(entry.pniSys)}</div>
              <div className="bg-black px-1 py-1 text-white">{displayValue(entry.pniDia)}</div>
              <div className="bg-black px-1 py-1 text-white">{displayValue(entry.etco2)}</div>
              <div className="bg-black px-1 py-1 text-white">{displayValue(entry.spo2)}</div>
            </div>
          ))}
        </div>
        {log.length === 0 && (
          <p className="mt-2 text-sm text-black/70">No vitals recorded.</p>
        )}
      </div>
      <div className="border-t border-black/20 bg-[var(--color-modal-surface)] px-4 py-1.5 text-xs">
        <div className="flex justify-start">
          <span
            aria-current={highlightedButton === 'exit' ? 'true' : undefined}
            className={cn(
              'px-2 py-1 font-bold',
              highlightedButton === 'exit'
                ? 'bg-[var(--color-selection-blue)] text-white'
                : 'text-black opacity-50',
            )}
          >
            Exit
          </span>
        </div>
        {showPagination && (
          <div className="mt-1 flex items-center justify-between">
            <span
              aria-current={highlightedButton === 'prev' ? 'true' : undefined}
              aria-disabled={page === 1}
              className={cn(
                'px-2 py-1 font-bold',
                highlightedButton === 'prev'
                  ? 'bg-[var(--color-selection-blue)] text-white'
                  : 'text-black opacity-50',
                page === 1 && 'opacity-30',
              )}
            >
              &#8592; Prev
            </span>
            <span className="text-black/70">Page {page} of {totalPages}</span>
            <span
              aria-current={highlightedButton === 'next' ? 'true' : undefined}
              aria-disabled={page === totalPages}
              className={cn(
                'px-2 py-1 font-bold',
                highlightedButton === 'next'
                  ? 'bg-[var(--color-selection-blue)] text-white'
                  : 'text-black opacity-50',
                page === totalPages && 'opacity-30',
              )}
            >
              Next &#8594;
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
