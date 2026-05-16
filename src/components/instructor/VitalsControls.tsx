'use client'

import { useMonitorStore } from '@/store/monitorStore'

import { VitalInput } from './VitalInput'

export function VitalsControls() {
  const resetVitalsToNormal = useMonitorStore((s) => s.resetVitalsToNormal)

  return (
    <section className="flex flex-col gap-3 border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm uppercase tracking-wider text-neutral-400">Vitals</h2>
        <button
          type="button"
          onClick={resetVitalsToNormal}
          className="shrink-0 border border-ecg-green/70 bg-ecg-green/10 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-ecg-green hover:bg-ecg-green/20 focus:outline-none focus:ring-2 focus:ring-ecg-green"
        >
          Normal
        </button>
      </div>
      <VitalInput field="hr" label="FC" unit="bpm" min={0} max={300} />
      <VitalInput field="bp_sys" label="BP sys" unit="mmHg" min={0} max={300} />
      <VitalInput field="bp_dia" label="BP dia" unit="mmHg" min={0} max={300} />
      <VitalInput field="etco2" label="EtCO2" unit="mmHg" min={0} max={150} />
      <VitalInput field="spo2" label="SpO2" unit="%" min={0} max={100} />
    </section>
  )
}
