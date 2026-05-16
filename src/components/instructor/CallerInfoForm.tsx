'use client'

import { useState } from 'react'

import { useMonitorStore } from '@/store/monitorStore'

const PRIMARY_FIELDS = [
  { field: 'interventionPriorityCode', label: 'Intervention prioritaire code', multiline: false },
  { field: 'address', label: 'Adresse', multiline: false },
  { field: 'problem', label: 'Probleme', multiline: true },
  { field: 'information', label: 'Information', multiline: true },
  { field: 'update', label: 'Mise a jour', multiline: true },
  { field: 'time', label: 'Heure', multiline: false },
] as const

const EXTRA_FIELDS = [
  { labelField: 'extra1Label', valueField: 'extra1', fallbackLabel: 'Extra 1' },
  { labelField: 'extra2Label', valueField: 'extra2', fallbackLabel: 'Extra 2' },
  { labelField: 'extra3Label', valueField: 'extra3', fallbackLabel: 'Extra 3' },
] as const

export function CallerInfoForm() {
  const callerInfoDraft = useMonitorStore((s) => s.callerInfoDraft)
  const setCallerInfoDraft = useMonitorStore((s) => s.setCallerInfoDraft)
  const [visibleExtraCount, setVisibleExtraCount] = useState(() => {
    const lastFilledIndex = EXTRA_FIELDS.findLastIndex(
      ({ labelField, valueField }) =>
        callerInfoDraft[labelField].trim() !== '' ||
        callerInfoDraft[valueField].trim() !== '',
    )
    return Math.max(0, lastFilledIndex + 1)
  })
  const visibleExtras = EXTRA_FIELDS.slice(0, visibleExtraCount)
  const canAddExtra = visibleExtraCount < EXTRA_FIELDS.length

  return (
    <section className="flex flex-col gap-3 border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm uppercase tracking-wider text-neutral-400">Caller Info</h2>
        <span className="text-xs uppercase tracking-wider text-neutral-600">Analyse</span>
      </div>
      <div className="grid gap-3">
        {PRIMARY_FIELDS.map(({ field, label, multiline }) => (
          <label key={field} className="grid gap-1">
            <span className="text-xs uppercase tracking-wider text-neutral-400">{label}</span>
            {multiline ? (
              <textarea
                value={callerInfoDraft[field]}
                onChange={(e) => setCallerInfoDraft(field, e.target.value)}
                aria-label={label}
                rows={3}
                className="min-h-20 resize-y border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
              />
            ) : (
              <input
                value={callerInfoDraft[field]}
                onChange={(e) => setCallerInfoDraft(field, e.target.value)}
                aria-label={label}
                className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
              />
            )}
          </label>
        ))}
        {visibleExtras.map(({ labelField, valueField, fallbackLabel }) => (
          <div key={valueField} className="grid gap-2 border-t border-neutral-800 pt-3">
            <label>
              <span className="sr-only">{fallbackLabel} title</span>
              <input
                value={callerInfoDraft[labelField]}
                onChange={(e) => setCallerInfoDraft(labelField, e.target.value)}
                aria-label={`${fallbackLabel} title`}
                placeholder="Title"
                className="w-full border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
              />
            </label>
            <label>
              <span className="sr-only">{fallbackLabel} input</span>
              <input
                value={callerInfoDraft[valueField]}
                onChange={(e) => setCallerInfoDraft(valueField, e.target.value)}
                aria-label={`${fallbackLabel} input`}
                placeholder="Input"
                className="w-full border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
              />
            </label>
          </div>
        ))}
        {canAddExtra && (
          <button
            type="button"
            onClick={() => setVisibleExtraCount((count) => Math.min(EXTRA_FIELDS.length, count + 1))}
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-xs font-mono font-bold uppercase tracking-wider text-cyan-bp hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-cyan-bp"
          >
            Add Extra
          </button>
        )}
      </div>
    </section>
  )
}
