'use client'

import {
  parseTimedVitalsAutoSort,
  type TimedVitalsSlot,
} from '@/lib/vitalsAutoSort'
import { useMonitorStore } from '@/store/monitorStore'
import type { CprMode, NumericVitalField } from '@/types/vitals'

import { EcgRhythmSelector } from './EcgRhythmSelector'
import {
  PatientSnsControls,
  type PatientSnsControlsProps,
} from './PatientSnsControls'
import { VitalInput } from './VitalInput'

const AUTO_SORT_FIELDS: ReadonlyArray<NumericVitalField> = [
  'hr',
  'spo2',
  'bp_sys',
  'bp_dia',
  'etco2',
]

const TIMED_VITAL_BUTTONS: ReadonlyArray<TimedVitalsSlot> = ['T1', 'T2', 'T3', 'U1', 'U2', 'U3']

const CPR_MODES: ReadonlyArray<{ mode: Exclude<CprMode, 'off'>; label: string }> = [
  { mode: 'regular', label: 'Regular CPR' },
  { mode: 'weak', label: 'Weak CPR' },
]

type VitalsControlsProps = {
  autoSortText: string
  patientSns?: PatientSnsControlsProps
  onTimedVitalsClick?: (slot: TimedVitalsSlot) => void
  /**
   * Set in a session, where calibration happens on a trainee's monitor and only
   * reaches the instructor through the student-event stream. Left undefined in
   * local dev mode, where one store serves both roles and the store's own
   * calibration status is the truth.
   */
  sessionEtco2Calibrated?: boolean
}

export function VitalsControls({
  autoSortText,
  patientSns,
  onTimedVitalsClick,
  sessionEtco2Calibrated,
}: VitalsControlsProps) {
  const setTimedDraftVitals = useMonitorStore((s) => s.setTimedDraftVitals)
  const etco2CalibrationStatus = useMonitorStore((s) => s.etco2CalibrationStatus)
  const cprMode = useMonitorStore((s) => s.cprMode)
  const setCprMode = useMonitorStore((s) => s.setCprMode)
  const etco2Calibrated =
    sessionEtco2Calibrated ?? etco2CalibrationStatus === 'calibrated'

  const applyParsedVitals = (parsed: ReturnType<typeof parseTimedVitalsAutoSort>) => {
    const timedVitals: Partial<Record<NumericVitalField, number>> = {}
    for (const field of AUTO_SORT_FIELDS) {
      const value = parsed[field]
      if (value !== undefined) timedVitals[field] = value
    }
    setTimedDraftVitals(timedVitals)
  }

  const handleTimedVitalsClick = (slot: TimedVitalsSlot) => {
    applyParsedVitals(parseTimedVitalsAutoSort(autoSortText, slot))
    onTimedVitalsClick?.(slot)
  }

  return (
    <section className="flex flex-col gap-3 border border-neutral-800 bg-neutral-950 p-4">
      <h2 className="text-sm uppercase tracking-wider text-neutral-400">Vitals</h2>
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
          <div
            role="status"
            aria-label="EtCO2 calibration status"
            data-testid="admin-etco2-calibration-indicator"
            data-calibrated={etco2Calibrated}
            className={[
              'ml-[5.75rem] flex h-9 w-24 items-center justify-center border px-2',
              'font-mono text-xs font-bold uppercase tracking-wider transition-colors',
              etco2Calibrated
                ? 'border-purple-etco2 bg-purple-etco2/15 text-purple-etco2 shadow-[0_0_16px_-6px_var(--color-purple-etco2)]'
                : 'border-neutral-700 bg-neutral-950 text-neutral-600',
            ].join(' ')}
          >
            EtCO2
          </div>
        </div>

        <div className="self-start" data-testid="admin-ecg-column">
          <div data-testid="admin-graph-row-ecg">
            <EcgRhythmSelector />
          </div>
          <div
            role="group"
            className="mt-3 grid grid-cols-2 gap-2"
            aria-label="CPR mode"
          >
            {CPR_MODES.map(({ mode, label }) => {
              const active = cprMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCprMode(active ? 'off' : mode)}
                  className={[
                    'flex h-11 w-full items-center justify-center border px-3',
                    'font-mono text-sm font-bold uppercase tracking-wider transition-colors',
                    active
                      ? 'border-ecg-green bg-ecg-green/15 text-ecg-green shadow-[0_0_18px_-8px_var(--color-ecg-green)]'
                      : 'border-neutral-600 bg-neutral-900 text-neutral-300 hover:border-ecg-green hover:bg-ecg-green/10 hover:text-ecg-green',
                  ].join(' ')}
                >
                  {label}
                </button>
              )
            })}
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
      {patientSns ? <PatientSnsControls {...patientSns} /> : null}
    </section>
  )
}
