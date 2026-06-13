'use client'

import {
  parseTimedVitalsAutoSort,
  type TimedVitalsSlot,
} from '@/lib/vitalsAutoSort'
import { useMonitorStore } from '@/store/monitorStore'
import type { NumericVitalField } from '@/types/vitals'

import { EcgRhythmSelector } from './EcgRhythmSelector'
import { VitalInput } from './VitalInput'

const AUTO_SORT_FIELDS: ReadonlyArray<NumericVitalField> = [
  'hr',
  'spo2',
  'bp_sys',
  'bp_dia',
  'etco2',
]

const TIMED_VITAL_BUTTONS: ReadonlyArray<TimedVitalsSlot> = ['T1', 'T2', 'T3', 'U1', 'U2', 'U3']

type VitalsControlsProps = {
  autoSortText: string
}

export function VitalsControls({ autoSortText }: VitalsControlsProps) {
  const resetVitalsToNormal = useMonitorStore((s) => s.resetVitalsToNormal)
  const setDraft = useMonitorStore((s) => s.setDraft)

  const applyParsedVitals = (parsed: ReturnType<typeof parseTimedVitalsAutoSort>) => {
    for (const field of AUTO_SORT_FIELDS) {
      const value = parsed[field]
      if (value !== undefined) {
        setDraft(field, value)
      }
    }
  }

  const handleTimedVitalsClick = (slot: TimedVitalsSlot) => {
    applyParsedVitals(parseTimedVitalsAutoSort(autoSortText, slot))
  }

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
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(21rem,1fr)] items-start gap-3">
        <div className="flex flex-col gap-3" data-testid="admin-vitals-column">
          <div className="flex items-center" data-testid="admin-vital-row-fc">
            <VitalInput field="hr" label="FC" unit="bpm" min={0} max={300} />
          </div>

          <div className="flex items-center" data-testid="admin-vital-row-spo2">
            <VitalInput field="spo2" label="SpO2" unit="%" min={0} max={100} />
          </div>

          <div className="flex items-center" data-testid="admin-vital-row-bp-sys">
            <VitalInput field="bp_sys" label="BP sys" unit="mmHg" min={0} max={300} />
          </div>

          <div className="flex items-center" data-testid="admin-vital-row-bp-dia">
            <VitalInput field="bp_dia" label="BP dia" unit="mmHg" min={0} max={300} />
          </div>

          <div className="flex items-center" data-testid="admin-vital-row-etco2">
            <VitalInput field="etco2" label="EtCO2" unit="mmHg" min={0} max={150} />
          </div>
        </div>

        <div className="self-start" data-testid="admin-ecg-column">
          <div data-testid="admin-graph-row-ecg">
            <EcgRhythmSelector />
          </div>
          <div
            className="relative z-10 mt-3 grid grid-cols-3 grid-rows-2 gap-2"
            aria-label="Timed vitals"
          >
            {TIMED_VITAL_BUTTONS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => handleTimedVitalsClick(slot)}
                className="relative z-10 flex h-[3.75rem] min-h-[3.75rem] w-full cursor-pointer appearance-none items-center justify-center border border-neutral-600 bg-neutral-900 px-3 py-3 text-sm font-mono font-bold uppercase tracking-wider text-neutral-200 pointer-events-auto hover:border-cyan-bp hover:bg-cyan-bp/10 hover:text-cyan-bp focus:outline-none focus:ring-2 focus:ring-cyan-bp"
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
