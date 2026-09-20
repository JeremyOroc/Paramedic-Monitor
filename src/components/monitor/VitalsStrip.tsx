'use client'

import { getActiveAlarms, type AlarmChannel } from '@/types/vitals'
import type { MonitorSelection } from '@/types/monitorSelection'
import type { Spo2Waveform } from '@/types/vitals'
import { cn } from '@/lib/utils'
import type { NibpPhase } from '@/hooks/useNibpReading'

import { VitalBox } from './VitalBox'
import { Spo2PulseBar } from './Spo2PulseBar'

type VitalsStripProps = {
  hr: number | string
  pulseHeartRate?: number
  bpSys: number | string
  bpDia: number | string
  etco2: number | string
  spo2: number | string
  spo2Waveform?: Spo2Waveform
  spo2Unit?: string
  activeAlarms?: AlarmChannel[]
  searching?: boolean
  selected?: MonitorSelection
  nibpPhase?: NibpPhase
  nibpDisplayValue?: string | number
  orientation?: 'vertical' | 'horizontal'
}

function toNumber(value: number | string): number {
  if (typeof value === 'number') return value
  return Number(value)
}

export function VitalsStrip({
  hr,
  pulseHeartRate,
  bpSys,
  bpDia,
  etco2,
  spo2,
  spo2Waveform = 'normal',
  spo2Unit = '%',
  activeAlarms,
  searching = true,
  selected,
  nibpPhase,
  nibpDisplayValue,
  orientation = 'vertical',
}: VitalsStripProps) {
  const spo2ValueClassName = typeof spo2 === 'string' ? 'text-[1.25rem]' : 'text-[2.35rem]'
  const hrNumber = toNumber(hr)
  const pulseHeartRateNumber = pulseHeartRate ?? hrNumber
  const showSpo2PulseBar =
    typeof spo2 === 'number' &&
    Number.isFinite(pulseHeartRateNumber) &&
    spo2Waveform !== 'off'
  const alarms = activeAlarms ?? getActiveAlarms({
    hr: hrNumber,
    bp_sys: toNumber(bpSys),
    bp_dia: toNumber(bpDia),
    spo2: toNumber(spo2),
  })
  const vitalCellClassName =
    orientation === 'horizontal'
      ? 'min-h-0 min-w-0 border-b-0 border-r border-neutral-800 last:border-r-0'
      : 'flex-1 min-h-0'

  return (
    <div
      className={cn(
        'h-full w-full bg-black',
        orientation === 'horizontal' ? 'grid grid-cols-4' : 'flex flex-col',
      )}
      data-orientation={orientation}
    >
      <VitalBox
        label="FC"
        value={hr}
        unit="bpm"
        color="ecgGreen"
        alarming={alarms.includes('hr')}
        selected={selected === 'hrVital'}
        className={vitalCellClassName}
      />
      {nibpPhase === 'please_wait' || nibpPhase === 'reading' || nibpPhase === 'counting' ? (
        <VitalBox
          label="PNI"
          value={typeof nibpDisplayValue === 'number' ? nibpDisplayValue : 0}
          unit="mmHg"
          color="cyanBP"
          alarming={alarms.includes('bp')}
          selected={selected === 'nibpVital'}
          className={vitalCellClassName}
        />
      ) : nibpPhase === 'settled' ? (
        <VitalBox
          label="PNI"
          stackedValues={{ top: bpSys, bottom: bpDia }}
          unit="mmHg"
          color="cyanBP"
          alarming={alarms.includes('bp')}
          selected={selected === 'nibpVital'}
          className={vitalCellClassName}
        />
      ) : (
        <VitalBox
          label="PNI"
          stackedValues={{ top: bpSys, bottom: bpDia }}
          unit="mmHg"
          color="cyanBP"
          alarming={alarms.includes('bp')}
          selected={selected === 'nibpVital'}
          className={vitalCellClassName}
        />
      )}
      <VitalBox
        label="EtCO2"
        value={etco2}
        unit="mmHg"
        color="purpleEtCO2"
        selected={selected === 'etco2Vital'}
        className={vitalCellClassName}
      />
      <VitalBox
        label="SpO2"
        value={spo2}
        unit={spo2Unit}
        color="yellowSpO2"
        alarming={alarms.includes('spo2')}
        selected={selected === 'spo2Vital'}
        className={vitalCellClassName}
        valueClassName={spo2ValueClassName}
        valueAccessory={
          showSpo2PulseBar ? (
            <Spo2PulseBar
              hr={pulseHeartRateNumber}
              spo2={spo2}
              spo2Waveform={spo2Waveform}
            />
          ) : undefined
        }
      />
      {searching && (
        <div className="px-3 py-1 text-[10px] font-mono text-neutral-400 italic">
          Recherche…
        </div>
      )}
    </div>
  )
}
