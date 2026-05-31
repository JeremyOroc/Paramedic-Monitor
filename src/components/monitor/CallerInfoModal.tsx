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
      className="absolute left-[56px] right-0 bottom-0 z-30 flex h-2/3 flex-col font-mono shadow-[0_-8px_24px_rgba(0,0,0,0.55)]"
    >
      <header className="bg-white px-5 py-2 text-black">
        <h2 className="text-lg font-bold">Caller Info</h2>
      </header>
      <div className="flex-1 overflow-y-auto bg-[#8ba88c] px-5 py-4">
        {hasInfo ? (
          <ul className="flex flex-col gap-1.5">
            {displayFields.map(({ field, label, labelField }) => (
              <li key={field} className="grid grid-cols-[1fr_1fr] items-stretch">
                <span className="px-3 py-2 text-base font-bold text-black">
                  {labelField && info[labelField].trim() !== '' ? info[labelField] : label}
                </span>
                <span className="flex items-center justify-center bg-black px-3 py-2 text-base font-bold text-white">
                  {info[field] || '—'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-black/70 text-base">Aucune information d&apos;appel.</p>
        )}
      </div>
    </section>
  )
}
