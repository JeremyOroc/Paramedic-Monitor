'use client'

import { VitalInput } from './VitalInput'

export function VitalsControls() {
  return (
    <section className="flex flex-col gap-3 border border-neutral-800 bg-neutral-950 p-4">
      <h2 className="text-sm uppercase tracking-wider text-neutral-400">Vitals</h2>
      <VitalInput field="hr" label="FC" unit="bpm" min={0} max={300} />
      <VitalInput field="bp_sys" label="BP sys" unit="mmHg" min={0} max={300} />
      <VitalInput field="bp_dia" label="BP dia" unit="mmHg" min={0} max={300} />
      <VitalInput field="etco2" label="EtCO2" unit="mmHg" min={0} max={100} />
      <VitalInput field="spo2" label="SpO2" unit="%" min={0} max={100} />
    </section>
  )
}
