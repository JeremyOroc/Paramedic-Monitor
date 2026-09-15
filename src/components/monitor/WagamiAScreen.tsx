import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import { WagamiADefibPanel } from './WagamiADefibPanel'
import { WagamiATaskDock } from './WagamiATaskDock'
import { WagamiAVitalCard } from './WagamiAVitalCard'
import { WagamiAWaveformWorkspace } from './WagamiAWaveformWorkspace'

type WagamiAScreenProps = {
  display: WagamiADisplayState
  energy: number
}

export function WagamiAScreen({ display, energy }: WagamiAScreenProps) {
  const { vitals, active, alarms, simulated } = display
  const pniValue = active.bp_sys && active.bp_dia ? `${vitals.bp_sys}/${vitals.bp_dia}` : '--/--'
  return (
    <section aria-label="Wagami A live display" className="grid h-full min-h-0 w-full grid-cols-[minmax(0,1fr)_minmax(183px,21.5%)] gap-[clamp(5px,0.85cqw,13px)] overflow-hidden bg-wagami-a-screen p-[clamp(5px,0.85cqw,13px)] text-wagami-a-text">
      <div className="grid min-h-0 grid-rows-[clamp(82px,11.4cqw,160px)_minmax(0,1fr)_clamp(22px,2.5cqw,36px)] gap-[clamp(4px,0.65cqw,10px)]">
        <div aria-label="Fixed A vital card strip" className="grid min-h-0 grid-cols-4 gap-[clamp(4px,0.65cqw,10px)]">
          <WagamiAVitalCard channel="fc" label="FC" value={active.hr ? String(vitals.hr) : '--'} unit="bpm" />
          <WagamiAVitalCard channel="spo2" label="SpO₂" value={active.spo2 ? String(vitals.spo2) : '--'} unit="%" />
          <WagamiAVitalCard channel="pni" label="PNI" value={pniValue} unit="mmHg" />
          <WagamiAVitalCard channel="etco2" label="EtCO₂" value={active.etco2 ? String(vitals.etco2) : '--'} unit="mmHg" />
        </div>
        <WagamiAWaveformWorkspace vitals={vitals} active={active} alarms={alarms} />
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-[4px] border border-wagami-a-border bg-wagami-a-surface px-[clamp(6px,0.8cqw,12px)] font-mono text-[clamp(9px,0.9cqw,13px)] text-wagami-a-muted-text">
          <span>MODE ADULTE</span><span className="truncate">PREVIEW · {simulated ? 'DONNÉES SIMULÉES' : 'DONNÉES CONFIRMÉES'}</span>
        </div>
      </div>
      <aside aria-label="Wagami A right-side task and defib rail" className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-[clamp(4px,0.65cqw,10px)]">
        <WagamiATaskDock />
        <WagamiADefibPanel state="idle" energy={energy} progress={0} canAnalyse={false} canAdjustEnergy={false} />
      </aside>
    </section>
  )
}
