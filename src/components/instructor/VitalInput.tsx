'use client'

import { useEffect, useState } from 'react'
import { useMonitorStore } from '@/store/monitorStore'
import { vitalStatus } from '@/store/fieldState'
import { cn } from '@/lib/utils'
import type { NumericVitalField } from '@/types/vitals'

type VitalInputProps = {
  field: NumericVitalField
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

export function VitalInput({ field, label, unit, min, max }: VitalInputProps) {
  const draft = useMonitorStore((s) => s.draft)
  const saved = useMonitorStore((s) => s.saved)
  const confirmed = useMonitorStore((s) => s.confirmed)
  const draftVitalActive = useMonitorStore((s) => s.draftVitalActive)
  const savedVitalActive = useMonitorStore((s) => s.savedVitalActive)
  const confirmedVitalActive = useMonitorStore((s) => s.confirmedVitalActive)
  const setDraft = useMonitorStore((s) => s.setDraft)
  const setDraftVitalActive = useMonitorStore((s) => s.setDraftVitalActive)

  const status = vitalStatus(
    field,
    draft,
    saved,
    confirmed,
    draftVitalActive,
    savedVitalActive,
    confirmedVitalActive,
  )
  const value = draft[field] as number
  const active = draftVitalActive[field]

  // Local text mirrors what's typed so the field can sit empty mid-edit instead of
  // snapping back to a leading "0" (which made entries read like "020"). The store
  // stays numeric; an empty field is treated as 0.
  const [text, setText] = useState(() => String(value))

  // Resync when the store value changes from outside this input (save/send/reset,
  // scenario load). The guard skips our own keystrokes so an in-progress empty or
  // lone-zero entry isn't clobbered.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <button
        type="button"
        onClick={() => setDraftVitalActive(field, !active)}
        aria-label={`${label} ${active ? 'on' : 'off'}`}
        aria-pressed={active}
        className={cn(
          'grid w-20 grid-cols-2 overflow-hidden border border-neutral-700 font-mono text-[10px] font-bold uppercase tracking-wider',
          active ? 'border-cyan-bp' : 'border-neutral-700',
        )}
        data-testid={`status-${field}`}
        data-status={status}
      >
        <span
          className={cn(
            'px-1.5 py-1 text-center',
            !active
              ? 'bg-neutral-300 text-black'
              : 'bg-neutral-900 text-neutral-500',
          )}
        >
          Off
        </span>
        <span
          className={cn(
            'border-l border-neutral-700 px-1.5 py-1 text-center',
            active
              ? 'bg-cyan-bp text-black'
              : 'bg-neutral-900 text-neutral-500',
          )}
        >
          On
        </span>
      </button>
    </label>
  )
}

// Empty input counts as 0; anything non-numeric falls back to 0 too.
function parseVital(text: string): number {
  if (text === '') return 0
  const n = Number(text)
  return Number.isFinite(n) ? n : 0
}
