'use client'

import { VitalBox } from './VitalBox'

type VitalsStripProps = {
  hr: number | string
  bpSys: number | string
  bpDia: number | string
  etco2: number | string
  spo2: number | string
  searching?: boolean
}

export function VitalsStrip({
  hr,
  bpSys,
  bpDia,
  etco2,
  spo2,
  searching = true,
}: VitalsStripProps) {
  return (
    <div className="h-full w-full flex flex-col bg-black">
      <VitalBox
        label="FC"
        value={hr}
        unit="bpm"
        color="ecgGreen"
        className="flex-1 min-h-0"
      />
      <VitalBox
        label="PNI"
        value={`${bpSys}/${bpDia}`}
        unit="mmHg"
        color="cyanBP"
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
