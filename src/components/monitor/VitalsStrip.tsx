'use client'

import { getActiveAlarms, type AlarmChannel } from '@/types/vitals'
import type { MonitorSelection } from '@/types/monitorSelection'
import { cn } from '@/lib/utils'
import type { NibpPhase } from '@/hooks/useNibpReading'

import { VitalBox } from './VitalBox'

type VitalsStripProps = {
  hr: number | string
  bpSys: number | string
  bpDia: number | string
  etco2: number | string
  spo2: number | string
  activeAlarms?: AlarmChannel[]
  searching?: boolean
  selected?: MonitorSelection
  nibpPhase?: NibpPhase
  nibpDisplayValue?: string | number
}

function toNumber(value: number | string): number {
  if (typeof value === 'number') return value
  return Number(value)
}

export function VitalsStrip({
  hr,
  bpSys,
  bpDia,
  etco2,
  spo2,
  activeAlarms,
  searching = true,
  selected,
  nibpPhase,
  nibpDisplayValue,
}: VitalsStripProps) {
  const alarms = activeAlarms ?? getActiveAlarms({
    hr: toNumber(hr),
    bp_sys: toNumber(bpSys),
    bp_dia: toNumber(bpDia),
    spo2: toNumber(spo2),
  })

  return (
    <div className="h-full w-full flex flex-col bg-black">
      <VitalBox
        label="FC"
        value={hr}
        unit="bpm"
        color="ecgGreen"
        alarming={alarms.includes('hr')}
        selected={selected === 'hrVital'}
        className="flex-1 min-h-0"
      />
      {nibpPhase === 'please_wait' || nibpPhase === 'reading' ? (
        <div
          className={cn(
            'flex-1 min-h-0 grid grid-rows-[auto_1fr_auto]',
            'border-b border-neutral-800 px-1 py-1',
          )}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-mono uppercase tracking-normal text-cyan-bp">PNI</span>
            <span className="text-[9px] font-mono text-neutral-500">mmHg</span>
          </div>
          <div className="flex h-full min-h-0 flex-col items-center justify-center text-center">
            <span className="font-mono text-[10px] leading-tight text-cyan-bp">
              {nibpDisplayValue}
            </span>
          </div>
        </div>
      ) : nibpPhase === 'counting' || nibpPhase === 'settled' ? (
        <VitalBox
          label="PNI"
          value={nibpDisplayValue}
          unit="mmHg"
          color="cyanBP"
          alarming={alarms.includes('bp')}
          selected={selected === 'nibpVital'}
          className="flex-1 min-h-0"
        />
      ) : (
        <VitalBox
          label="PNI"
          stackedValues={{ top: bpSys, bottom: bpDia }}
          unit="mmHg"
          color="cyanBP"
          alarming={alarms.includes('bp')}
          selected={selected === 'nibpVital'}
          className="flex-1 min-h-0"
        />
      )}
      <VitalBox
        label="EtCO2"
        value={etco2}
        unit="mmHg"
        color="purpleEtCO2"
        selected={selected === 'etco2Vital'}
        className="flex-1 min-h-0"
      />
      <VitalBox
        label="SpO2"
        value={spo2}
        unit="%"
        color="yellowSpO2"
        alarming={alarms.includes('spo2')}
        selected={selected === 'spo2Vital'}
        className="flex-1 min-h-0"
      />
      {searching && (
        <div className="px-3 py-1 text-[10px] font-mono text-neutral-400 italic">
          Recherche…
        </div>
      )}
    </div>
  )
}
