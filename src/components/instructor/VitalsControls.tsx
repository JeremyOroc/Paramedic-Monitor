'use client'

import { useMonitorStore } from '@/store/monitorStore'

import { EcgRhythmSelector } from './EcgRhythmSelector'
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
          aria-label="Set vitals to normal"
          className="shrink-0 border border-ecg-green/70 bg-ecg-green/10 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-ecg-green hover:bg-ecg-green/20 focus:outline-none focus:ring-2 focus:ring-ecg-green"
        >
          Normal
        </button>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(21rem,1fr)] gap-3">
        <div className="flex items-center" data-testid="admin-vital-row-fc">
          <VitalInput field="hr" label="FC" unit="bpm" min={0} max={300} />
        </div>
        <div data-testid="admin-graph-row-ecg">
          <EcgRhythmSelector />
        </div>

        <div className="flex items-center" data-testid="admin-vital-row-spo2">
          <VitalInput field="spo2" label="SpO2" unit="%" min={0} max={100} />
        </div>
        <div aria-hidden="true" />

        <div className="flex items-center" data-testid="admin-vital-row-bp-sys">
          <VitalInput field="bp_sys" label="BP sys" unit="mmHg" min={0} max={300} />
        </div>
        <div aria-hidden="true" />

        <div className="flex items-center" data-testid="admin-vital-row-bp-dia">
          <VitalInput field="bp_dia" label="BP dia" unit="mmHg" min={0} max={300} />
        </div>
        <div aria-hidden="true" />

        <div className="flex items-center" data-testid="admin-vital-row-etco2">
          <VitalInput field="etco2" label="EtCO2" unit="mmHg" min={0} max={150} />
        </div>
        <div aria-hidden="true" />
      </div>
    </section>
  )
}
