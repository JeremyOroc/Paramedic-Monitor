'use client'

import { useEffect, useState } from 'react'

import { isAutomaticHeartRateRhythm } from '@/lib/automaticHeartRate'
import { isValidVitalTrendTarget } from '@/lib/vitalTrend'
import { cn } from '@/lib/utils'
import { useMonitorStore } from '@/store/monitorStore'
import type { NumericVitalField } from '@/types/vitals'

type VitalTrendInputProps = {
  field: NumericVitalField
  label: string
  min: number
  max: number
}

export function VitalTrendInput({
  field,
  label,
  min,
  max,
}: VitalTrendInputProps) {
  const target = useMonitorStore((state) => state.vitalTrendDraft.targets[field])
  const savedTarget = useMonitorStore((state) => state.vitalTrendSaved.targets[field])
  const savedRevision = useMonitorStore((state) => state.vitalTrendSavedRevision)
  const consumedRevision = useMonitorStore((state) => state.vitalTrendConsumedRevision)
  const rhythm = useMonitorStore((state) => state.draft.rhythm)
  const setTarget = useMonitorStore((state) => state.setVitalTrendTarget)
  const automaticHeartRate = field === 'hr' && isAutomaticHeartRateRhythm(rhythm)
  const valid = isValidVitalTrendTarget(field, target)
  const status =
    target !== savedTarget ? 'dirty' : savedRevision !== consumedRevision ? 'pending' : 'clean'
  const [text, setText] = useState(() => (target === null ? '' : String(target)))

  useEffect(() => {
    const next = target === null ? '' : String(target)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (text !== next) setText(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={text}
      disabled={automaticHeartRate}
      aria-label={`${label} trend target`}
      aria-invalid={!valid}
      placeholder="—"
      onChange={(event) => {
        const raw = event.target.value.replace(/^0+(?=\d)/, '')
        setText(raw)
        setTarget(field, raw === '' ? null : Number(raw))
      }}
      onBlur={() => setText(target === null ? '' : String(target))}
      className={cn(
        'h-7 w-16 appearance-none border border-b bg-transparent px-1 text-right',
        'font-mono text-sm font-semibold tabular-nums text-white outline-none',
        'placeholder:text-neutral-700 focus:border-transparent focus:border-b-cyan-bp focus:bg-cyan-bp/5',
        'disabled:cursor-not-allowed disabled:text-neutral-600',
        '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        status === 'dirty' && 'border-transparent border-b-cyan-bp bg-cyan-bp/5',
        status === 'pending' &&
          'border-transparent border-b-pending-amber bg-pending-amber/10',
        status === 'clean' && 'border-transparent border-b-neutral-700',
        !valid && 'border-alarm-red bg-alarm-red/10 text-alarm-red',
        'xl:[@media(min-height:800px)]:h-9 xl:[@media(min-height:800px)]:w-20 xl:[@media(min-height:800px)]:text-base',
      )}
    />
  )
}
