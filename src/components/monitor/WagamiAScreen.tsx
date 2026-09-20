import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import type { DefibChargeOrigin, DefibState } from '@/hooks/useDefibSequence'
import type { NibpPhase } from '@/hooks/useNibpReading'
import { getWagamiAText } from '@/lib/wagamiALocalization'
import type { WagamiALocale } from '@/types/wagamiA'
import type { WagamiATask } from './WagamiATaskDock'
import { WagamiADefibPanel } from './WagamiADefibPanel'
import { WagamiATaskDock } from './WagamiATaskDock'
import { WagamiAVitalCard } from './WagamiAVitalCard'
import { WagamiAWaveformWorkspace } from './WagamiAWaveformWorkspace'

type WagamiAScreenProps = {
  display: WagamiADisplayState
  energy: number
  defibState?: DefibState
  chargeProgress?: number
  chargeOrigin?: DefibChargeOrigin
  cprTime?: string
  cprOverride?: boolean
  nibpPhase?: NibpPhase
  nibpDisplayValue?: string | number
  patientMode?: 'adult' | 'pediatric' | 'neonate'
  selectedAction?: string | null
  canAdjustEnergy?: boolean
  onTask?: (task: WagamiATask) => void
  onEnergyDown?: () => void
  onEnergyUp?: () => void
  locale?: WagamiALocale
}

export function WagamiAScreen({ display, energy, defibState = 'idle', chargeProgress = 0, chargeOrigin = null, cprTime, cprOverride = false, nibpPhase = 'idle', nibpDisplayValue = '', patientMode = 'adult', selectedAction, canAdjustEnergy = false, onTask, onEnergyDown, onEnergyUp, locale = 'fr' }: WagamiAScreenProps) {
  const text = getWagamiAText(locale)
  const { vitals, active, alarms } = display
  const pniValue = active.bp_sys && active.bp_dia ? `${vitals.bp_sys}/${vitals.bp_dia}` : '--/--'
  const pniDetail = nibpPhase === 'please_wait' ? text.pleaseWait :
    nibpPhase === 'reading' ? text.measuring :
    nibpPhase === 'counting' ? `${text.measuring} · ${nibpDisplayValue}` : text.lastReading
  return (
    <section aria-label="Wagami A live display" className="grid h-full min-h-0 w-full grid-cols-[minmax(0,1fr)_minmax(183px,21.5%)] gap-[clamp(5px,0.85cqw,13px)] overflow-hidden bg-wagami-a-screen p-[clamp(5px,0.85cqw,13px)] text-wagami-a-text">
      <div data-testid="wagami-a-main-clinical-column" className="grid min-h-0 grid-rows-[clamp(82px,11.4cqw,160px)_minmax(0,1fr)] gap-[clamp(4px,0.65cqw,10px)]">
        <div aria-label="Fixed A vital card strip" className="grid min-h-0 grid-cols-4 gap-[clamp(4px,0.65cqw,10px)]">
          <WagamiAVitalCard channel="fc" label="FC" value={active.hr ? String(vitals.hr) : '--'} unit="bpm" />
          <WagamiAVitalCard channel="spo2" label="SpO₂" value={active.spo2 ? String(vitals.spo2) : '--'} unit="%" />
          <WagamiAVitalCard channel="pni" label="PNI" value={pniValue} unit="mmHg" detail={pniDetail} />
          <WagamiAVitalCard channel="etco2" label="EtCO₂" value={active.etco2 ? String(vitals.etco2) : '--'} unit="mmHg" />
        </div>
        <WagamiAWaveformWorkspace vitals={vitals} active={active} alarms={alarms} patientMode={patientMode} cprOverride={cprOverride} locale={locale} />
      </div>
      <aside aria-label="Wagami A right-side task and defib rail" className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-[clamp(4px,0.65cqw,10px)]">
        <WagamiATaskDock onTask={onTask} selectedAction={selectedAction} locale={locale} />
        <WagamiADefibPanel state={defibState} energy={energy} chargeProgress={chargeProgress} chargeOrigin={chargeOrigin} cprTime={cprTime} canAdjustEnergy={canAdjustEnergy} onEnergyDown={onEnergyDown} onEnergyUp={onEnergyUp} selectedAction={selectedAction} locale={locale} />
      </aside>
    </section>
  )
}
