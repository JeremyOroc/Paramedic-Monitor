'use client'

import {
  CALLER_INFO_DISPLAY_FIELDS,
  hasCallerInfo,
  type CallerInfo,
} from '@/types/callerInfo'

type CallerInfoModalProps = {
  open: boolean
  info: CallerInfo
  onClose: () => void
}

export function CallerInfoModal({ open, info, onClose }: CallerInfoModalProps) {
  if (!open) return null

  const hasInfo = hasCallerInfo(info)
  const displayFields = CALLER_INFO_DISPLAY_FIELDS.filter(({ field, labelField }) => {
    if (!labelField) return true
    return info[field].trim() !== '' || info[labelField].trim() !== ''
  })

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/65 p-6">
      <section
        aria-label="Caller info"
        className="w-full max-w-[520px] border-2 border-cyan-bp bg-black font-mono text-white shadow-[0_0_24px_rgba(0,255,255,0.35)]"
      >
        <header className="flex items-center justify-between bg-cyan-bp px-4 py-2 text-black">
          <h2 className="text-sm font-bold uppercase tracking-wider">Caller Info</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close caller info"
            className="grid h-7 w-7 place-items-center border border-black/50 text-base font-bold hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-black"
          >
            X
          </button>
        </header>
        <div className="grid gap-2 p-4 text-sm">
          {hasInfo ? (
            displayFields.map(({ field, label, labelField }) => (
              <div key={field} className="grid grid-cols-[150px_1fr] gap-3 border-b border-neutral-800 pb-2 last:border-b-0 last:pb-0">
                <span className="text-cyan-bp">
                  {labelField && info[labelField].trim() !== '' ? info[labelField] : label}
                </span>
                <span className="whitespace-pre-wrap text-neutral-100">{info[field] || '—'}</span>
              </div>
            ))
          ) : (
            <p className="text-neutral-400">Aucune information d&apos;appel.</p>
          )}
        </div>
      </section>
    </div>
  )
}
