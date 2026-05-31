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
  selected?: boolean
  className?: string
}

const COLOR_CLASS: Record<VitalColor, string> = {
  ecgGreen: 'text-ecg-green',
  cyanBP: 'text-cyan-bp',
  purpleEtCO2: 'text-purple-etco2',
  yellowSpO2: 'text-yellow-spo2',
}

const LABEL_BG_CLASS: Record<VitalColor, string> = {
  ecgGreen: 'bg-ecg-green',
  cyanBP: 'bg-cyan-bp',
  purpleEtCO2: 'bg-purple-etco2',
  yellowSpO2: 'bg-yellow-spo2',
}

const VALUE_CLASS = [
  'flex w-full items-center justify-center self-stretch text-center font-mono font-bold text-[2.8rem] leading-none tabular-nums',
]

const STACKED_VALUE_CLASS = [
  'flex w-full flex-col items-center justify-center self-stretch text-center font-mono font-bold text-[2.2rem] leading-none tabular-nums',
]

const ALARM_FLASH_CLASS = 'vital-alarm-flash'

export function VitalBox({
  label,
  value,
  stackedValues,
  unit,
  color,
  subLabel,
  alarming = false,
  selected = false,
  className,
}: VitalBoxProps) {
  const colorClass = COLOR_CLASS[color]
  const labelBgClass = LABEL_BG_CLASS[color]
  const valueColorClass = alarming ? 'text-alarm-red' : colorClass
  const flashClass = alarming ? ALARM_FLASH_CLASS : null
  return (
    <div
      className={cn(
        'grid grid-rows-[auto_1fr_auto]',
        'border-b border-neutral-800 px-1 py-1',
        alarming && 'bg-white border-alarm-red',
        className,
      )}
      data-alarming={alarming ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
    >
      <div
        className={cn(
          'flex items-baseline justify-between -mx-1 -mt-1 px-1 py-0.5',
          alarming ? 'bg-alarm-red' : labelBgClass,
        )}
      >
        <span className={cn('text-[12px] font-mono uppercase tracking-normal', alarming ? 'text-white' : 'text-black')}>
          {label}
        </span>
        {unit && (
          <span className={cn('text-[10px] font-mono', alarming ? 'text-white' : 'text-black/70')}>
            {unit}
          </span>
        )}
      </div>
      <div className={cn('flex h-full min-h-0 flex-col justify-center', selected && 'bg-[var(--color-selection-blue)] text-white')}>
        {stackedValues ? (
          <div
            className={cn(STACKED_VALUE_CLASS, valueColorClass, flashClass)}
            data-testid="vital-value"
          >
            <div>{stackedValues.top}</div>
            <hr className={cn('mx-auto my-1 w-4/5 border-t opacity-60', valueColorClass)} />
            <div>{stackedValues.bottom}</div>
          </div>
        ) : (
          <div
            className={cn(VALUE_CLASS, valueColorClass, flashClass)}
            data-testid="vital-value"
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
    </div>
  )
}
