'use client'

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
  if (!open) return null

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
            log.map((entry, i) => (
              <div
                key={i}
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
      </section>
    </div>
  )
}
