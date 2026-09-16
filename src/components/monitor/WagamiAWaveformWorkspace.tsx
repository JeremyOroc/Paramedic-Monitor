import type { Vitals } from '@/store/monitorStore'
import type { AlarmChannel, VitalActiveState } from '@/types/vitals'
import { ECGCanvas } from './ECGCanvas'
import { SecondaryChannel } from './SecondaryChannel'

type WagamiAWaveformWorkspaceProps = {
  vitals: Vitals
  active: VitalActiveState
  alarms: AlarmChannel[]
}

const ALARM_LABELS: Record<AlarmChannel, string> = { hr: 'FC', bp: 'PNI', spo2: 'SpO₂' }

export function WagamiAWaveformWorkspace({ vitals, active, alarms }: WagamiAWaveformWorkspaceProps) {
  const alarmText = alarms.length > 0 ? `ALARME · ${alarms.map((channel) => ALARM_LABELS[channel]).join(' / ')}` : 'AUCUNE ALARME'
  return (
    <section aria-label="Wagami A waveform workspace" className="grid min-h-0 grid-rows-[clamp(28px,3.3cqw,46px)_minmax(0,1fr)]">
      <div className="grid grid-cols-1 items-center gap-1.5 pr-1 font-sans text-[clamp(10px,1cqw,15px)]">
        <span role="status" className={alarms.length > 0 ? 'font-semibold text-wagami-a-alarm' : 'text-wagami-a-muted-text'}>{alarmText}</span>
      </div>
      <div className="grid min-h-0 grid-rows-[minmax(0,1.9fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] gap-[clamp(3px,0.55cqw,9px)]">
        <div className="relative min-h-0 overflow-hidden rounded-[5px] border border-wagami-a-border bg-wagami-a-screen">
          <ECGCanvas rhythm={vitals.rhythm} hr={vitals.hr} connected={active.hr && vitals.rhythm !== 'off'} palette="wagamiA" className="h-full w-full" />
          <div aria-hidden="true" className="wagami-a-grid-overlay absolute inset-0 pointer-events-none" />
          <span className="absolute left-2 top-1 z-10 font-sans text-[clamp(12px,1.3cqw,19px)] font-semibold text-wagami-a-ecg">ECG</span>
          <span className="absolute right-2 top-1 z-10 font-mono text-[clamp(9px,0.85cqw,13px)] text-wagami-a-muted-text">25 mm/s · 10 mm/mV</span>
        </div>
        <div className="relative min-h-0 overflow-hidden rounded-[5px] border border-wagami-a-border bg-wagami-a-screen">
          <SecondaryChannel channel="spo2" hr={vitals.hr} spo2={vitals.spo2} etco2={vitals.etco2} spo2Waveform={vitals.spo2_waveform} etco2Waveform={vitals.etco2_waveform} connected={active.spo2 && vitals.spo2_waveform !== 'off'} showLabels={false} palette="wagamiA" />
          <div aria-hidden="true" className="wagami-a-grid-overlay absolute inset-0 pointer-events-none" />
          <span className="absolute left-2 top-1 z-10 font-sans text-[clamp(11px,1.2cqw,17px)] font-semibold text-wagami-a-spo2">SpO₂</span>
        </div>
        <div className="relative min-h-0 overflow-hidden rounded-[5px] border border-wagami-a-border bg-wagami-a-screen">
          <SecondaryChannel channel="etco2" hr={vitals.hr} spo2={vitals.spo2} etco2={vitals.etco2} spo2Waveform={vitals.spo2_waveform} etco2Waveform={vitals.etco2_waveform} connected={active.etco2 && vitals.etco2_waveform !== 'off'} showLabels={false} palette="wagamiA" />
          <div aria-hidden="true" className="wagami-a-grid-overlay absolute inset-0 pointer-events-none" />
          <span className="absolute left-2 top-1 z-10 font-sans text-[clamp(11px,1.2cqw,17px)] font-semibold text-wagami-a-etco2">EtCO₂</span>
        </div>
      </div>
    </section>
  )
}
