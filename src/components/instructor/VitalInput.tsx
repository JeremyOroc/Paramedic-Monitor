'use client'

import { useEffect, useState } from 'react'
import { useMonitorStore, type Vitals } from '@/store/monitorStore'
import { fieldStatus } from '@/store/fieldState'
import { cn } from '@/lib/utils'

type VitalInputProps = {
  field: keyof Vitals
  label: string
  unit?: string
  min?: number
  max?: number
}

const STATUS_CLASS: Record<'clean' | 'dirty' | 'pending', string> = {
  clean: 'border-neutral-700 bg-neutral-900',
  dirty: 'border-cyan-bp/60 bg-neutral-900 ring-1 ring-cyan-bp/40',
  pending: 'border-pending-amber bg-pending-amber/20 ring-1 ring-pending-amber',
}

const STATUS_PILL: Record<'clean' | 'dirty' | 'pending', { label: string; cls: string }> = {
  clean: { label: '—', cls: 'text-neutral-500' },
  dirty: { label: 'edited', cls: 'text-cyan-bp' },
  pending: { label: 'pending', cls: 'text-pending-amber' },
}

export function VitalInput({ field, label, unit, min, max }: VitalInputProps) {
  const draft = useMonitorStore((s) => s.draft)
  const saved = useMonitorStore((s) => s.saved)
  const confirmed = useMonitorStore((s) => s.confirmed)
  const setDraft = useMonitorStore((s) => s.setDraft)

  const status = fieldStatus(field, draft, saved, confirmed)
  const value = draft[field] as number
  const pill = STATUS_PILL[status]

  // Local text mirrors what's typed so the field can sit empty mid-edit instead of
  // snapping back to a leading "0" (which made entries read like "020"). The store
  // stays numeric; an empty field is treated as 0.
  const [text, setText] = useState(() => String(value))

  // Resync when the store value changes from outside this input (save/send/reset,
  // scenario load). The guard skips our own keystrokes so an in-progress empty or
  // lone-zero entry isn't clobbered.
  useEffect(() => {
    if (parseVital(text) !== value) setText(String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <label className="flex items-center gap-3">
      <span className="w-20 text-sm text-neutral-300">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={text}
        onChange={(e) => {
          // Strip leading zeros ("020" → "20") but keep a single "0"; allow empty.
          const raw = e.target.value.replace(/^0+(?=\d)/, '')
          setText(raw)
          setDraft(field, parseVital(raw) as never)
        }}
        onBlur={() => setText(String(value))}
        aria-label={label}
        className={cn(
          'flex-1 px-3 py-2 border font-mono text-white tabular-nums',
          'focus:outline-none focus:ring-2 focus:ring-cyan-bp',
          STATUS_CLASS[status],
        )}
      />
      {unit && <span className="w-12 text-xs text-neutral-500">{unit}</span>}
      <span
        className={cn('w-16 text-right text-xs uppercase tracking-wider', pill.cls)}
        data-testid={`status-${field}`}
      >
        {pill.label}
      </span>
    </label>
  )
}

// Empty input counts as 0; anything non-numeric falls back to 0 too.
function parseVital(text: string): number {
  if (text === '') return 0
  const n = Number(text)
  return Number.isFinite(n) ? n : 0
}
