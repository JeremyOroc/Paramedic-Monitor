'use client'

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

  return (
    <label className="flex items-center gap-3">
      <span className="w-20 text-sm text-neutral-300">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => {
          const next = e.target.value === '' ? 0 : Number(e.target.value)
          if (Number.isFinite(next)) setDraft(field, next as never)
        }}
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
