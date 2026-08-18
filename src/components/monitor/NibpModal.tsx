import { cn } from '@/lib/utils'
import type {
  NibpAutoInterval,
  NibpFocusSide,
  NibpModalRow,
  NibpMode,
} from '@/types/nibp'
import { ALARM_THRESHOLDS } from '@/types/vitals'

import { MonitorModalAction } from './MonitorModalAction'

type NibpModalProps = {
  open: boolean
  highlightedRow: NibpModalRow
  focusSide: NibpFocusSide
  mode: NibpMode
  autoInterval: NibpAutoInterval
}

type AlarmRowProps = {
  row: NibpModalRow
  label: string
  lower: number
  upper: number
  highlightedRow: NibpModalRow
  focusSide: NibpFocusSide
}

type ValueRowProps = {
  row: NibpModalRow
  label: string
  value: string
  highlightedRow: NibpModalRow
  focusSide: NibpFocusSide
}

function RowLabel({ label, selected }: { label: string; selected: boolean }) {
  return (
    <span
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex min-w-0 items-center px-2 py-1 font-bold leading-tight text-black',
        selected && 'bg-[var(--color-selection-blue)] text-white',
      )}
    >
      {label}
    </span>
  )
}

function AlarmRow({
  row,
  label,
  lower,
  upper,
  highlightedRow,
  focusSide,
}: AlarmRowProps) {
  const rowSelected = highlightedRow === row
  const valueSelected = rowSelected && focusSide === 'value'

  return (
    <div className="grid min-h-0 grid-cols-[1fr_25%_25%] items-stretch">
      <RowLabel label={label} selected={rowSelected && focusSide === 'label'} />
      <span
        data-nibp-value-focus={valueSelected ? 'true' : undefined}
        className={cn(
          'flex items-center justify-center rounded-l-sm border-r border-white/20 bg-black px-3 py-1 text-center font-bold tabular-nums text-white',
          valueSelected && 'bg-[var(--color-selection-blue)]',
        )}
      >
        {lower}
      </span>
      <span
        data-nibp-value-focus={valueSelected ? 'true' : undefined}
        className={cn(
          'flex items-center justify-center rounded-r-sm bg-black px-3 py-1 text-center font-bold tabular-nums text-white',
          valueSelected && 'bg-[var(--color-selection-blue)]',
        )}
      >
        {upper}
      </span>
    </div>
  )
}

function ValueRow({
  row,
  label,
  value,
  highlightedRow,
  focusSide,
}: ValueRowProps) {
  const rowSelected = highlightedRow === row
  const valueSelected = rowSelected && focusSide === 'value'

  return (
    <div className="grid min-h-0 grid-cols-[1fr_50%] items-stretch">
      <RowLabel label={label} selected={rowSelected && focusSide === 'label'} />
      <span
        data-nibp-value-focus={valueSelected ? 'true' : undefined}
        className={cn(
          'flex items-center justify-center rounded-sm bg-black px-3 py-1 text-center font-bold text-white',
          valueSelected && 'bg-[var(--color-selection-blue)]',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function NibpModal({
  open,
  highlightedRow,
  focusSide,
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
      <header className="shrink-0 border-b border-white/70 bg-white px-5 py-2 text-black">
        <h2 className="text-[clamp(10px,1vw,18px)] font-bold">NIBP</h2>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-[3px] bg-[var(--color-modal-surface)] px-4 py-2">
        <div className="grid grid-cols-[1fr_25%_25%] font-bold text-black">
          <span />
          <span className="text-center">Lower</span>
          <span className="text-center">Upper</span>
        </div>
        <AlarmRow
          row="systolicAlarm"
          label="NIBP Systolic Alarm"
          lower={ALARM_THRESHOLDS.bp_sys.low}
          upper={ALARM_THRESHOLDS.bp_sys.high}
          highlightedRow={highlightedRow}
          focusSide={focusSide}
        />
        <AlarmRow
          row="diastolicAlarm"
          label="NIBP Diastolic Alarm"
          lower={ALARM_THRESHOLDS.bp_dia.low}
          upper={ALARM_THRESHOLDS.bp_dia.high}
          highlightedRow={highlightedRow}
          focusSide={focusSide}
        />
        <AlarmRow
          row="mapAlarm"
          label="NIBP MAP Alarm"
          lower={46}
          upper={216}
          highlightedRow={highlightedRow}
          focusSide={focusSide}
        />
        <ValueRow
          row="mode"
          label="NIBP Mode"
          value={mode === 'manual' ? 'Manual' : 'Automatic'}
          highlightedRow={highlightedRow}
          focusSide={focusSide}
        />
        <ValueRow
          row="autoInterval"
          label="NIBP Auto Mode Interval"
          value={`${autoInterval} min`}
          highlightedRow={highlightedRow}
          focusSide={focusSide}
        />
        <ValueRow
          row="smartCuf"
          label="SmartCuf On/Off"
          value="On"
          highlightedRow={highlightedRow}
          focusSide={focusSide}
        />
        <div className="mt-auto flex justify-start pt-1">
          <MonitorModalAction
            selected={highlightedRow === 'exit' && focusSide === 'label'}
            ariaLabel="Exit"
            className="px-3 py-1"
          >
            Exit
          </MonitorModalAction>
        </div>
      </div>
    </section>
  )
}
