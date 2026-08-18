import { cn } from '@/lib/utils'
import { ALARM_THRESHOLDS } from '@/types/vitals'
import type { NibpAutoInterval, NibpModalRow, NibpMode } from '@/types/nibp'

type NibpModalProps = {
  open: boolean
  highlightedRow: NibpModalRow
  mode: NibpMode
  autoInterval: NibpAutoInterval
}

type AlarmRowProps = {
  label: string
  lower: number
  upper: number
  selected: boolean
}

type ValueRowProps = {
  label: string
  value: string
  selected: boolean
}

function RowLabel({ label, selected }: { label: string; selected: boolean }) {
  return (
    <span
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex min-w-0 items-center px-2 py-1 font-bold leading-tight text-white',
        selected && 'bg-[var(--color-selection-blue)]',
      )}
    >
      {label}
    </span>
  )
}

function AlarmRow({ label, lower, upper, selected }: AlarmRowProps) {
  return (
    <div className="grid min-h-0 grid-cols-[1fr_25%_25%] items-stretch">
      <RowLabel label={label} selected={selected} />
      <span className="flex items-center justify-start rounded-l-sm border-r border-white/20 bg-black px-3 py-1 font-bold tabular-nums text-white">
        {lower}
      </span>
      <span className="flex items-center justify-end rounded-r-sm bg-black px-3 py-1 font-bold tabular-nums text-white">
        {upper}
      </span>
    </div>
  )
}

function ValueRow({ label, value, selected }: ValueRowProps) {
  return (
    <div className="grid min-h-0 grid-cols-[1fr_50%] items-stretch">
      <RowLabel label={label} selected={selected} />
      <span className="flex items-center justify-center rounded-sm bg-black px-3 py-1 font-bold text-white">
        {value}
      </span>
    </div>
  )
}

export function NibpModal({
  open,
  highlightedRow,
  mode,
  autoInterval,
}: NibpModalProps) {
  if (!open) return null

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="NIBP settings"
      className="pointer-events-none absolute bottom-[2%] left-[56px] right-[96px] top-[31%] z-50 flex min-h-0 flex-col overflow-hidden rounded-sm border border-white/70 font-mono text-[clamp(9px,0.9vw,14px)] shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
    >
      <header className="shrink-0 border-b border-white/70 bg-cyan-bp px-2 py-1 text-[clamp(10px,1vw,15px)] font-bold text-black">
        NIBP
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-[3px] bg-[var(--color-modal-surface)] px-4 py-2">
        <div className="grid grid-cols-[1fr_25%_25%] font-bold text-black">
          <span />
          <span className="text-center">Lower</span>
          <span className="text-center">Upper</span>
        </div>
        <AlarmRow
          label="NIBP Systolic Alarm"
          lower={ALARM_THRESHOLDS.bp_sys.low}
          upper={ALARM_THRESHOLDS.bp_sys.high}
          selected={highlightedRow === 'systolicAlarm'}
        />
        <AlarmRow
          label="NIBP Diastolic Alarm"
          lower={ALARM_THRESHOLDS.bp_dia.low}
          upper={ALARM_THRESHOLDS.bp_dia.high}
          selected={highlightedRow === 'diastolicAlarm'}
        />
        <AlarmRow
          label="NIBP MAP Alarm"
          lower={46}
          upper={216}
          selected={highlightedRow === 'mapAlarm'}
        />
        <ValueRow
          label="NIBP Mode"
          value={mode === 'manual' ? 'Manual' : 'Automatic'}
          selected={highlightedRow === 'mode'}
        />
        <ValueRow
          label="NIBP Auto Mode Interval"
          value={`${autoInterval} min`}
          selected={highlightedRow === 'autoInterval'}
        />
        <ValueRow
          label="SmartCuf On/Off"
          value="On"
          selected={highlightedRow === 'smartCuf'}
        />
        <div className="mt-auto flex justify-start pt-1">
          <span
            aria-current={highlightedRow === 'exit' ? 'true' : undefined}
            className={cn(
              'px-3 py-1 font-bold text-black',
              highlightedRow === 'exit'
                ? 'bg-[var(--color-selection-blue)] text-white'
                : 'opacity-55',
            )}
          >
            Exit
          </span>
        </div>
      </div>
    </section>
  )
}
