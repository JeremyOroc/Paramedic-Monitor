import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import type { DefibChargeOrigin, DefibState } from '@/hooks/useDefibSequence'
import type { NibpPhase } from '@/hooks/useNibpReading'
import { getWagamiAText } from '@/lib/wagamiALocalization'
import type { BeatClock } from '@/lib/ecg/beatClock'
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
  onOpenNibpSettings?: () => void
  locale?: WagamiALocale
  callInfoDisabled?: boolean
  waveformOccluded?: boolean
  onWaveformsReady?: () => void
  beatClock?: BeatClock
  date?: string
  time?: string
  sessionTimer?: string
}

export function WagamiAScreen({ display, energy, defibState = 'idle', chargeProgress = 0, chargeOrigin = null, cprTime, cprOverride = false, nibpPhase = 'idle', nibpDisplayValue = '', patientMode = 'adult', selectedAction, canAdjustEnergy = false, onTask, onEnergyDown, onEnergyUp, onOpenNibpSettings, locale = 'fr', callInfoDisabled = false, waveformOccluded = false, onWaveformsReady, beatClock, date = '0000-00-00', time = '--:--:--', sessionTimer = '00:00:00' }: WagamiAScreenProps) {
  const text = getWagamiAText(locale)
  const { vitals, active, alarms } = display
  const isNibpReadingActive = nibpPhase === 'please_wait' || nibpPhase === 'reading' || nibpPhase === 'counting'
  const pniValue = isNibpReadingActive
    ? String(typeof nibpDisplayValue === 'number' ? nibpDisplayValue : 0)
    : active.bp_sys || active.bp_dia
      ? `${vitals.bp_sys}/${vitals.bp_dia}`
      : '--/--'
  return (
    <section aria-label="Wagami A live display" className="grid h-full min-h-0 w-full grid-cols-[minmax(0,1fr)_minmax(183px,21.5%)] gap-[clamp(5px,0.85cqw,13px)] overflow-hidden bg-wagami-a-screen p-[clamp(5px,0.85cqw,13px)] text-wagami-a-text">
      <div data-testid="wagami-a-main-clinical-column" className="grid min-h-0 grid-rows-[clamp(82px,11.4cqw,160px)_clamp(18px,2.2cqw,30px)_minmax(0,1fr)] gap-[clamp(3px,0.45cqw,7px)]">
        <div aria-label="Fixed A vital card strip" className="grid min-h-0 grid-cols-4 gap-[clamp(4px,0.65cqw,10px)]">
          <WagamiAVitalCard channel="fc" label={text.heartRate} value={active.hr ? String(vitals.hr) : '--'} unit="bpm" />
          <WagamiAVitalCard channel="spo2" label="SpO₂" value={active.spo2 ? String(vitals.spo2) : '--'} unit="%" />
          <WagamiAVitalCard channel="pni" label={text.bloodPressure} value={pniValue} unit="mmHg" actionLabel={text.openPniSettings} onClick={onOpenNibpSettings} />
          <WagamiAVitalCard channel="etco2" label="EtCO₂" value={active.etco2 ? String(vitals.etco2) : '--'} unit="mmHg" />
        </div>
        <div data-testid="wagami-a-monitor-metadata" className="relative min-h-0 font-mono text-[clamp(9px,0.86cqw,13px)] leading-none text-wagami-a-muted-text">
          <time
            aria-label={text.montrealDateTime}
            dateTime={`${date}T${time}`}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap tabular-nums"
          >
            {date} {time}
          </time>
          <span
            aria-label={text.monitorElapsedTimer}
            className="absolute right-0 top-1/2 -translate-y-1/2 whitespace-nowrap text-right tabular-nums text-wagami-a-text"
          >
            {sessionTimer}
          </span>
        </div>
        <WagamiAWaveformWorkspace vitals={vitals} active={active} alarms={alarms} patientMode={patientMode} cprOverride={cprOverride} locale={locale} occluded={waveformOccluded} onReady={onWaveformsReady} beatClock={beatClock} />
      </div>
      <aside aria-label="Wagami A right-side task and defib rail" className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-[clamp(4px,0.65cqw,10px)]">
        <WagamiATaskDock onTask={onTask} selectedAction={selectedAction} locale={locale} callInfoDisabled={callInfoDisabled} />
        <WagamiADefibPanel state={defibState} energy={energy} chargeProgress={chargeProgress} chargeOrigin={chargeOrigin} cprTime={cprTime} canAdjustEnergy={canAdjustEnergy} onEnergyDown={onEnergyDown} onEnergyUp={onEnergyUp} selectedAction={selectedAction} locale={locale} />
      </aside>
    </section>
  )
}
