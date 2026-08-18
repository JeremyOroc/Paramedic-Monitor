import type { EventLogEntry } from '@/types/eventLog'

import { MonitorModalAction } from './MonitorModalAction'

export type { EventLogEntry } from '@/types/eventLog'

export const EVENT_LOG_ITEMS_PER_PAGE = 8

export type EventLogHighlightedButton = 'exit' | 'prev' | 'next'

type EventLogModalProps = {
  open: boolean
  log: EventLogEntry[]
  rightOffset?: number
  page?: number
  highlightedButton?: EventLogHighlightedButton
}

export function EventLogModal({
  open,
  log,
  rightOffset = 96,
  page = 1,
  highlightedButton = 'exit',
}: EventLogModalProps) {
  if (!open) return null

  const totalPages = Math.max(1, Math.ceil(log.length / EVENT_LOG_ITEMS_PER_PAGE))
  const pageEntries = log.slice(
    (page - 1) * EVENT_LOG_ITEMS_PER_PAGE,
    page * EVENT_LOG_ITEMS_PER_PAGE,
  )
  const showPagination = log.length > EVENT_LOG_ITEMS_PER_PAGE

  return (
    <section
      aria-label="Event log"
      className="absolute left-[56px] top-[56px] bottom-[110px] z-30 flex flex-col font-mono shadow-[0_-8px_24px_rgba(0,0,0,0.55)]"
      style={{ right: rightOffset }}
    >
      <header className="bg-white px-5 py-2 text-black">
        <h2 className="text-lg font-bold">Event Log</h2>
      </header>
      <div className="flex-1 overflow-hidden bg-[var(--color-modal-surface)] px-4 py-2">
        {log.length > 0 ? (
          <ul className="flex flex-col gap-px">
            {pageEntries.map((entry, i) => (
              <li
                key={(page - 1) * EVENT_LOG_ITEMS_PER_PAGE + i}
                className="grid grid-cols-[1fr_1fr] items-stretch"
              >
                <span className="px-2 py-0 text-xs font-bold leading-4 text-black">{entry.name}</span>
                <span className="flex items-center justify-center bg-black px-2 py-0 text-center text-xs font-bold leading-4 tabular-nums text-white">
                  {entry.time}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-black/70 text-sm">No events recorded.</p>
        )}
      </div>
      <div
        data-testid="event-log-actions"
        className="border-t border-black/20 bg-[var(--color-modal-surface)] px-4 py-1.5 font-mono text-xs"
      >
        <div className="flex justify-start">
          <MonitorModalAction
            selected={highlightedButton === 'exit'}
            ariaLabel="Exit"
            className="px-2 py-1"
          >
            Exit
          </MonitorModalAction>
        </div>
        {showPagination && (
          <div className="mt-1 flex items-center justify-between">
            <MonitorModalAction
              selected={highlightedButton === 'prev'}
              disabled={page === 1}
              ariaLabel="Previous page"
              className="px-2 py-1"
            >
              &#8592; Prev
            </MonitorModalAction>
            <span className="text-black/70">
              Page {page} of {totalPages}
            </span>
            <MonitorModalAction
              selected={highlightedButton === 'next'}
              disabled={page === totalPages}
              ariaLabel="Next page"
              className="px-2 py-1"
            >
              Next &#8594;
            </MonitorModalAction>
          </div>
        )}
      </div>
    </section>
  )
}
