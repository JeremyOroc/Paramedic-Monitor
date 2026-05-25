'use client'

import { useEffect, useState } from 'react'

const ITEMS_PER_PAGE = 8

export type MedicationLogEntry = {
  name: string
  time: string
}

type MedicationLogModalProps = {
  open: boolean
  log: MedicationLogEntry[]
  onClose: () => void
}

export function MedicationLogModal({ open, log, onClose }: MedicationLogModalProps) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (open) setPage(1)
  }, [open])

  if (!open) return null

  const totalPages = Math.max(1, Math.ceil(log.length / ITEMS_PER_PAGE))
  const pageEntries = log.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const showPagination = log.length > ITEMS_PER_PAGE

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/65 p-6">
      <section
        aria-label="Medication log"
        className="w-full max-w-[520px] border-2 border-ecg-green bg-black font-mono text-white shadow-[0_0_24px_rgba(0,255,65,0.35)]"
      >
        <header className="flex items-center justify-between bg-ecg-green px-4 py-2 text-black">
          <h2 className="text-sm font-bold uppercase tracking-wider">Medication Log</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close medication log"
            className="grid h-7 w-7 place-items-center border border-black/50 text-base font-bold hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-black"
          >
            X
          </button>
        </header>
        <div className="grid gap-2 p-4 text-sm">
          {log.length > 0 ? (
            pageEntries.map((entry, i) => (
              <div
                key={(page - 1) * ITEMS_PER_PAGE + i}
                className="grid grid-cols-[1fr_auto] gap-3 border-b border-neutral-800 pb-2 last:border-b-0 last:pb-0"
              >
                <span className="text-ecg-green">{entry.name}</span>
                <span className="text-neutral-100 tabular-nums">{entry.time}</span>
              </div>
            ))
          ) : (
            <p className="text-neutral-400">No medications administered.</p>
          )}
        </div>
        {showPagination && (
          <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-2 text-xs">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 text-ecg-green disabled:opacity-30 hover:text-white focus:outline-none"
            >
              &#8592; Prev
            </button>
            <span className="text-neutral-400">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 text-ecg-green disabled:opacity-30 hover:text-white focus:outline-none"
            >
              Next &#8594;
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
