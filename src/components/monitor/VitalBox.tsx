'use client'

import { cn } from '@/lib/utils'

type VitalColor = 'ecgGreen' | 'cyanBP' | 'purpleEtCO2' | 'yellowSpO2'

type StackedValues = {
  top: string | number
  bottom: string | number
}

type VitalBoxProps = {
  label: string
  value?: string | number
  stackedValues?: StackedValues
  unit?: string
  color: VitalColor
  subLabel?: string
  alarming?: boolean
  className?: string
}

const COLOR_CLASS: Record<VitalColor, string> = {
  ecgGreen: 'text-ecg-green',
  cyanBP: 'text-cyan-bp',
  purpleEtCO2: 'text-purple-etco2',
  yellowSpO2: 'text-yellow-spo2',
}

export function VitalBox({
  label,
  value,
  stackedValues,
  unit,
  color,
  subLabel,
  alarming = false,
  className,
}: VitalBoxProps) {
  const colorClass = COLOR_CLASS[color]
  const valueColorClass = alarming ? 'text-alarm-red' : colorClass
  return (
    <div
      className={cn(
        'grid grid-rows-[auto_1fr_auto]',
        'border-b border-neutral-800 px-1 py-1',
        alarming && 'bg-white border-alarm-red',
        className,
      )}
      data-alarming={alarming ? 'true' : 'false'}
    >
      <div
        className={cn(
          'flex items-baseline justify-between',
          alarming && '-mx-1 -mt-1 bg-alarm-red px-1 py-1',
        )}
      >
        <span className={cn('text-[10px] font-mono uppercase tracking-normal', alarming ? 'text-white' : colorClass)}>
          {label}
        </span>
        {unit && (
          <span className={cn('text-[9px] font-mono', alarming ? 'text-white' : 'text-neutral-500')}>
            {unit}
          </span>
        )}
      </div>
      {stackedValues ? (
        <div
          className={cn(
            'flex w-full flex-col items-center justify-center self-stretch text-center font-mono font-bold text-[1.75rem] leading-none tabular-nums',
            valueColorClass,
          )}
        >
          <div>{stackedValues.top}</div>
          <hr className={cn('mx-auto my-1 w-4/5 border-t opacity-60', valueColorClass)} />
          <div>{stackedValues.bottom}</div>
        </div>
      ) : (
        <div
          className={cn(
            'flex w-full items-center justify-center self-stretch text-center font-mono font-bold text-[2.1rem] leading-none tabular-nums',
            valueColorClass,
          )}
        >
          {value}
        </div>
      )}
      {subLabel && (
        <div className={cn('text-[10px] font-mono mt-1', alarming ? 'text-alarm-red' : 'text-neutral-400')}>
          {subLabel}
        </div>
      )}
    </div>
  )
}
