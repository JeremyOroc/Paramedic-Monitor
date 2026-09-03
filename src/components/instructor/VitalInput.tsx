'use client'

import { useEffect, useState } from 'react'

import { useMonitorStore } from '@/store/monitorStore'
import { vitalStatus } from '@/store/fieldState'
import { cn } from '@/lib/utils'
import type { NumericVitalField } from '@/types/vitals'
import {
  isAutomaticHeartRateRhythm,
  isHeartRateToggleLockedRhythm,
} from '@/lib/automaticHeartRate'

import { OnOffToggle } from './OnOffToggle'

type VitalInputProps = {
  compact?: boolean
  field: NumericVitalField
  label: string
  unit?: string
  min?: number
  max?: number
}

const STATUS_CLASS: Record<'clean' | 'dirty' | 'pending', string> = {
  clean: 'border-transparent border-b-neutral-700 bg-transparent',
  dirty:
    'border-transparent border-b-cyan-bp bg-cyan-bp/5 shadow-[0_8px_18px_-18px_rgba(0,255,255,0.9)]',
  pending:
    'border-transparent border-b-pending-amber bg-pending-amber/10 shadow-[0_8px_18px_-18px_rgba(255,170,0,0.9)]',
}

export function VitalInput({
  compact = false,
  field,
  label,
  unit,
  min,
  max,
}: VitalInputProps) {
  const draft = useMonitorStore((s) => s.draft)
  const saved = useMonitorStore((s) => s.saved)
  const confirmed = useMonitorStore((s) => s.confirmed)
  const draftVitalActive = useMonitorStore((s) => s.draftVitalActive)
  const savedVitalActive = useMonitorStore((s) => s.savedVitalActive)
  const confirmedVitalActive = useMonitorStore((s) => s.confirmedVitalActive)
  const setDraft = useMonitorStore((s) => s.setDraft)
  const setDraftVitalActive = useMonitorStore((s) => s.setDraftVitalActive)
  const rhythm = useMonitorStore((s) => s.draft.rhythm)

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
  const automaticHeartRate = field === 'hr' && isAutomaticHeartRateRhythm(rhythm)
  const heartRateToggleLocked =
    field === 'hr' && isHeartRateToggleLockedRhythm(rhythm)
  const automaticDisplay = automaticHeartRate
    ? rhythm === 'vf'
      ? 'AUTO 190–220'
      : String(value)
    : null

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
    <label className={cn('flex w-full items-center', compact ? 'gap-2 xl:[@media(min-height:800px)]:gap-3' : 'gap-3')}>
      <span className={cn('text-neutral-300', compact ? 'w-12 text-xs xl:[@media(min-height:800px)]:w-14 xl:[@media(min-height:800px)]:text-sm' : 'w-20 text-sm')}>
        {label}
      </span>
      <div
        className={cn(
          'group relative flex shrink-0 items-center border border-b',
          compact ? 'w-20 xl:[@media(min-height:800px)]:w-24' : 'w-24',
          automaticDisplay === 'AUTO 190–220' && (compact ? 'w-28 xl:[@media(min-height:800px)]:w-32' : 'w-32'),
          'transition-[border-color,box-shadow,background-color] duration-150',
          'focus-within:border-transparent focus-within:border-b-cyan-bp focus-within:bg-cyan-bp/5',
          'focus-within:shadow-[0_8px_18px_-18px_rgba(0,255,255,0.9)]',
          STATUS_CLASS[status],
        )}
        data-testid={`vital-input-shell-${field}`}
      >
        <input
          type={automaticHeartRate ? 'text' : 'number'}
          inputMode="numeric"
          min={automaticHeartRate ? undefined : min}
          max={automaticHeartRate ? undefined : max}
          value={automaticDisplay ?? text}
          disabled={automaticHeartRate}
          onFocus={() => {
            if (!automaticHeartRate && value === 0) setText('')
          }}
          onChange={(e) => {
            // Strip leading zeros ("020" → "20") but keep a single "0"; allow empty.
            const raw = e.target.value.replace(/^0+(?=\d)/, '')
            setText(raw)
            setDraft(field, parseVital(raw) as never)
          }}
          onBlur={() => setText(String(value))}
          aria-label={label}
          className={cn(
            'min-w-0 flex-1 bg-transparent py-1 pl-1 text-right',
            'font-mono font-semibold text-white tabular-nums outline-none',
            compact ? 'h-7 pr-6 text-sm xl:[@media(min-height:800px)]:h-9 xl:[@media(min-height:800px)]:pr-8 xl:[@media(min-height:800px)]:text-base' : 'h-8 pr-8 text-base',
            'placeholder:text-neutral-700 [appearance:textfield]',
            'disabled:cursor-not-allowed disabled:text-neutral-400 disabled:opacity-100',
            automaticDisplay === 'AUTO 190–220' && 'pr-1 text-center text-xs',
            '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          )}
        />
        {unit && automaticDisplay !== 'AUTO 190–220' && (
          <span className={cn(
            'pointer-events-none absolute text-[9px] font-bold uppercase tracking-wider',
            'text-neutral-500 group-focus-within:text-cyan-bp',
            compact ? 'right-1 xl:[@media(min-height:800px)]:right-2' : 'right-2',
          )}>
            {unit}
          </span>
        )}
      </div>
      <OnOffToggle
        active={active}
        compact={compact}
        disabled={heartRateToggleLocked}
        label={label}
        onToggle={(nextActive) => setDraftVitalActive(field, nextActive)}
        status={status}
        testId={`status-${field}`}
      />
    </label>
  )
}

// Empty input counts as 0; anything non-numeric falls back to 0 too.
function parseVital(text: string): number {
  if (text === '') return 0
  const n = Number(text)
  return Number.isFinite(n) ? n : 0
}
