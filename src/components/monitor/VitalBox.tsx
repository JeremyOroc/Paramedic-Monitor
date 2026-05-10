'use client'

import { cn } from '@/lib/utils'

type VitalColor = 'ecgGreen' | 'cyanBP' | 'purpleEtCO2' | 'yellowSpO2'

type VitalBoxProps = {
  label: string
  value: string | number
  unit?: string
  color: VitalColor
  subLabel?: string
  className?: string
}

const COLOR_CLASS: Record<VitalColor, string> = {
  ecgGreen: 'text-ecg-green',
  cyanBP: 'text-cyan-bp',
  purpleEtCO2: 'text-purple-etco2',
  yellowSpO2: 'text-yellow-spo2',
}

export function VitalBox({ label, value, unit, color, subLabel, className }: VitalBoxProps) {
  const colorClass = COLOR_CLASS[color]
  return (
    <div
      className={cn(
        'flex flex-col justify-between',
        'border-b border-neutral-800 px-3 py-2',
        className,
      )}
    >
      <div className="flex items-baseline justify-between">
        <span className={cn('text-xs font-mono uppercase tracking-wider', colorClass)}>
          {label}
        </span>
        {unit && <span className="text-[10px] font-mono text-neutral-500">{unit}</span>}
      </div>
      <div
        className={cn(
          'font-mono font-bold text-5xl leading-none tabular-nums',
          colorClass,
        )}
      >
        {value}
      </div>
      {subLabel && (
        <div className="text-[10px] font-mono text-neutral-400 mt-1">{subLabel}</div>
      )}
    </div>
  )
}
