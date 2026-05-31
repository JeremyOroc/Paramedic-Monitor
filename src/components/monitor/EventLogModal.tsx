'use client'

import { useEffect, useState } from 'react'

const ITEMS_PER_PAGE = 8

export type EventLogEntry = {
  name: string
  time: string
}

type EventLogModalProps = {
  open: boolean
  log: EventLogEntry[]
}

export function EventLogModal({ open, log }: EventLogModalProps) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (open) setPage(1)
  }, [open])

  if (!open) return null

  const totalPages = Math.max(1, Math.ceil(log.length / ITEMS_PER_PAGE))
  const pageEntries = log.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const showPagination = log.length > ITEMS_PER_PAGE

  return (
    <section
      aria-label="Event log"
      className="absolute left-[56px] right-0 bottom-0 z-30 flex h-2/3 flex-col font-mono shadow-[0_-8px_24px_rgba(0,0,0,0.55)]"
    >
      <header className="bg-white px-5 py-2 text-black">
        <h2 className="text-lg font-bold">Event Log</h2>
      </header>
      <div className="flex-1 overflow-y-auto bg-[#8ba88c] px-5 py-4">
        {log.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {pageEntries.map((entry, i) => (
              <li
                key={(page - 1) * ITEMS_PER_PAGE + i}
                className="grid grid-cols-[1fr_auto] items-stretch"
              >
                <span className="px-3 py-2 text-base font-bold text-black">{entry.name}</span>
                <span className="flex items-center justify-center bg-black px-3 py-2 text-base font-bold tabular-nums text-white">
                  {entry.time}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-black/70 text-base">No events recorded.</p>
        )}
      </div>
      {showPagination && (
        <div className="flex items-center justify-between bg-[#8ba88c] border-t border-black/20 px-5 py-2 text-sm font-mono">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 text-black font-bold disabled:opacity-30 hover:bg-black/10 focus:outline-none"
          >
            &#8592; Prev
          </button>
          <span className="text-black/70">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 text-black font-bold disabled:opacity-30 hover:bg-black/10 focus:outline-none"
          >
            Next &#8594;
          </button>
        </div>
      )}
    </section>
  )
}
