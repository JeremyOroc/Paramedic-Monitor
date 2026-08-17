'use client'

export const EVENT_LOG_ITEMS_PER_PAGE = 8

export type EventLogEntry = {
  name: string
  time: string
}

type EventLogModalProps = {
  open: boolean
  log: EventLogEntry[]
  rightOffset?: number
  page?: number
  highlightedButton?: 'prev' | 'next'
}

export function EventLogModal({
  open,
  log,
  rightOffset = 96,
  page = 1,
  highlightedButton = 'next',
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
      <header className="bg-white px-4 py-1.5 text-black">
        <h2 className="text-base font-bold">Event Log</h2>
      </header>
      <div className="flex-1 overflow-hidden bg-[#8ba88c] px-4 py-2">
        {log.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {pageEntries.map((entry, i) => (
              <li
                key={(page - 1) * EVENT_LOG_ITEMS_PER_PAGE + i}
                className="grid grid-cols-[1fr_1fr] items-stretch"
              >
                <span className="px-2 py-1 text-xs font-bold text-black">{entry.name}</span>
                <span className="flex items-center justify-center bg-black px-2 py-1 text-xs font-bold tabular-nums text-white text-center">
                  {entry.time}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-black/70 text-sm">No events recorded.</p>
        )}
      </div>
      {showPagination && (
        <div className="flex items-center justify-between bg-[#8ba88c] border-t border-black/20 px-4 py-1.5 text-xs font-mono">
          <span
            aria-disabled={page === 1}
            className={`px-2 py-1 font-bold ${highlightedButton === 'prev' ? 'bg-[#2f6df6] text-white' : 'text-black opacity-50'} ${page === 1 ? 'opacity-30' : ''}`}
          >
            &#8592; Prev
          </span>
          <span className="text-black/70">
            Page {page} of {totalPages}
          </span>
          <span
            aria-disabled={page === totalPages}
            className={`px-2 py-1 font-bold ${highlightedButton === 'next' ? 'bg-[#2f6df6] text-white' : 'text-black opacity-50'} ${page === totalPages ? 'opacity-30' : ''}`}
          >
            Next &#8594;
          </span>
        </div>
      )}
    </section>
  )
}
