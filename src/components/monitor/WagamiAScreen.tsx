import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import type { DefibChargeOrigin, DefibState } from '@/hooks/useDefibSequence'
import type { NibpPhase } from '@/hooks/useNibpReading'
import { getWagamiAText } from '@/lib/wagamiALocalization'
import type { BeatClock } from '@/lib/ecg/beatClock'
import type { WagamiAEtco2CalibrationStatus, WagamiALocale } from '@/types/wagamiA'
import type { WagamiATask } from './WagamiATaskDock'
import { WagamiAClinicalStatusLine } from './WagamiAClinicalStatusLine'
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
  waveformSequenceKey?: string | number
  etco2CalibrationStatus?: WagamiAEtco2CalibrationStatus
  etco2CalibrationStartedAt?: number | null
  etco2CalibrationEndsAt?: number | null
}

export function WagamiAScreen({ display, energy, defibState = 'idle', chargeProgress = 0, chargeOrigin = null, cprTime, cprOverride = false, nibpPhase = 'idle', nibpDisplayValue = '', patientMode = 'adult', selectedAction, canAdjustEnergy = false, onTask, onEnergyDown, onEnergyUp, onOpenNibpSettings, locale = 'fr', callInfoDisabled = false, waveformOccluded = false, onWaveformsReady, beatClock, date = '0000-00-00', time = '--:--:--', sessionTimer = '00:00:00', waveformSequenceKey, etco2CalibrationStatus = 'calibrated', etco2CalibrationStartedAt = null, etco2CalibrationEndsAt = null }: WagamiAScreenProps) {
  const text = getWagamiAText(locale)
  const { vitals, active, alarms } = display
  const isNibpReadingActive = nibpPhase === 'please_wait' || nibpPhase === 'reading' || nibpPhase === 'counting'
  const pniValue = isNibpReadingActive
    ? String(typeof nibpDisplayValue === 'number' ? nibpDisplayValue : 0)
    : active.bp_sys || active.bp_dia
      ? `${vitals.bp_sys}/${vitals.bp_dia}`
      : '--/--'
  const etco2Available = etco2CalibrationStatus === 'calibrated' && active.etco2
  return (
    <section aria-label="Wagami A live display" className="grid h-full min-h-0 w-full grid-cols-[minmax(0,1fr)_minmax(183px,21.5%)] gap-[clamp(5px,0.85cqw,13px)] overflow-hidden bg-wagami-a-screen p-[clamp(5px,0.85cqw,13px)] text-wagami-a-text">
      <div data-testid="wagami-a-main-clinical-column" className="grid min-h-0 grid-rows-[clamp(82px,11.4cqw,160px)_clamp(28px,3.1cqw,42px)_minmax(0,1fr)] gap-[clamp(3px,0.45cqw,7px)]">
        <div aria-label="Fixed A vital card strip" className="grid min-h-0 grid-cols-4 gap-[clamp(4px,0.65cqw,10px)]">
          <WagamiAVitalCard channel="fc" label={text.heartRate} value={active.hr ? String(vitals.hr) : '--'} unit="bpm" alarming={alarms.includes('hr')} />
          <WagamiAVitalCard channel="spo2" label="SpO₂" value={active.spo2 ? String(vitals.spo2) : '--'} unit="%" alarming={alarms.includes('spo2')} />
          <WagamiAVitalCard channel="pni" label={text.bloodPressure} value={pniValue} unit="mmHg" alarming={alarms.includes('bp')} actionLabel={text.openPniSettings} onClick={onOpenNibpSettings} />
          <WagamiAVitalCard channel="etco2" label="EtCO₂" value={etco2Available ? String(vitals.etco2) : '--'} unit="mmHg" />
        </div>
        <div data-testid="wagami-a-monitor-metadata" className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center font-mono text-[clamp(13px,1.15cqw,18px)] leading-none text-wagami-a-muted-text">
          <WagamiAClinicalStatusLine patientMode={patientMode} alarms={alarms} locale={locale} className="min-w-0 pr-3" />
          <time
            aria-label={text.montrealDateTime}
            dateTime={`${date}T${time}`}
            className="whitespace-nowrap tabular-nums"
          >
            {date} {time}
          </time>
          <span
            aria-label={text.monitorElapsedTimer}
            className="justify-self-end whitespace-nowrap text-right tabular-nums text-wagami-a-text"
          >
            {sessionTimer}
          </span>
        </div>
        <WagamiAWaveformWorkspace vitals={vitals} active={active} cprOverride={cprOverride} occluded={waveformOccluded} onReady={onWaveformsReady} beatClock={beatClock} sequenceKey={waveformSequenceKey} locale={locale} etco2CalibrationStatus={etco2CalibrationStatus} etco2CalibrationStartedAt={etco2CalibrationStartedAt} etco2CalibrationEndsAt={etco2CalibrationEndsAt} />
      </div>
      <aside aria-label="Wagami A right-side task and defib rail" className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-[clamp(4px,0.65cqw,10px)]">
        <WagamiATaskDock onTask={onTask} selectedAction={selectedAction} activeTask={etco2CalibrationStatus === 'calibrating' ? 'etco2' : null} locale={locale} callInfoDisabled={callInfoDisabled} />
        <WagamiADefibPanel state={defibState} energy={energy} chargeProgress={chargeProgress} chargeOrigin={chargeOrigin} cprTime={cprTime} canAdjustEnergy={canAdjustEnergy} onEnergyDown={onEnergyDown} onEnergyUp={onEnergyUp} selectedAction={selectedAction} locale={locale} />
      </aside>
    </section>
  )
}
