'use client'

import {
  CALLER_INFO_DISPLAY_FIELDS,
  hasCallerInfo,
  type CallerInfo,
} from '@/types/callerInfo'

type CallerInfoModalProps = {
  open: boolean
  info: CallerInfo
}

export function CallerInfoModal({ open, info }: CallerInfoModalProps) {
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
    </section>
  )
}
