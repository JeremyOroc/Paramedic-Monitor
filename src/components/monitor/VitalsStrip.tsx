'use client'

import { getActiveAlarms, type AlarmChannel } from '@/types/vitals'

import { VitalBox } from './VitalBox'

type VitalsStripProps = {
  hr: number | string
  bpSys: number | string
  bpDia: number | string
  etco2: number | string
  spo2: number | string
  activeAlarms?: AlarmChannel[]
  searching?: boolean
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
        className="flex-1 min-h-0"
      />
      <VitalBox
        label="PNI"
        stackedValues={{ top: bpSys, bottom: bpDia }}
        unit="mmHg"
        color="cyanBP"
        alarming={alarms.includes('bp')}
        className="flex-1 min-h-0"
      />
      <VitalBox
        label="EtCO2"
        value={etco2}
        unit="mmHg"
        color="purpleEtCO2"
        className="flex-1 min-h-0"
      />
      <VitalBox
        label="SpO2"
        value={spo2}
        unit="%"
        color="yellowSpO2"
        alarming={alarms.includes('spo2')}
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
