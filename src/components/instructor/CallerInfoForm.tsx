'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
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

type CallerInfoDraft = ReturnType<typeof useMonitorStore.getState>['callerInfoDraft']

function getInitialExtraCount(callerInfoDraft: CallerInfoDraft) {
  return EXTRA_FIELDS.reduce((count, { labelField, valueField }, index) => {
    const hasValue =
      callerInfoDraft[labelField].trim() !== '' || callerInfoDraft[valueField].trim() !== ''

    return hasValue ? index + 1 : count
  }, 0)
}

export function CallerInfoForm() {
  const callerInfoDraft = useMonitorStore((s) => s.callerInfoDraft)
  const setCallerInfoDraft = useMonitorStore((s) => s.setCallerInfoDraft)
  const dispatchMinutes = useMonitorStore((s) => s.dispatchMinutes)
  const setDispatchMinutes = useMonitorStore((s) => s.setDispatchMinutes)
  const dispatchArmed = useMonitorStore((s) => s.dispatch.armed)
  const [extraCount, setExtraCount] = useState(() => getInitialExtraCount(callerInfoDraft))
  const visibleExtraFields = EXTRA_FIELDS.slice(0, extraCount)
  const extraLimitReached = extraCount >= EXTRA_FIELDS.length

  return (
    <section className="flex flex-col gap-3 border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm uppercase tracking-wider text-neutral-400">Caller Info</h2>
        <span className="text-xs uppercase tracking-wider text-neutral-600">Analyse</span>
      </div>
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wider text-neutral-400">
            Dispatch countdown (min)
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={dispatchMinutes}
            onChange={(e) => setDispatchMinutes(Number(e.target.value))}
            aria-label="Dispatch countdown (min)"
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
          />
          <span className="text-xs text-neutral-600">
            {dispatchArmed
              ? 'Dispatch already armed — further Sends only update caller info.'
              : 'The first Send arms the dispatch and starts this countdown on the monitor.'}
          </span>
        </label>
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
        {visibleExtraFields.map(({ labelField, valueField, fallbackLabel }) => (
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
        <button
          type="button"
          onClick={() => setExtraCount((count) => Math.min(count + 1, EXTRA_FIELDS.length))}
          disabled={extraLimitReached}
          className={cn(
            'border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-semibold uppercase tracking-wider text-cyan-bp hover:border-cyan-bp focus:outline-none focus:ring-2 focus:ring-cyan-bp',
            extraLimitReached && 'cursor-not-allowed border-neutral-800 text-neutral-600 hover:border-neutral-800',
          )}
        >
          Add extra
        </button>
      </div>
    </section>
  )
}
