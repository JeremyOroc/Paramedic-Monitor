import type { DefibState } from '@/hooks/useDefibSequence'
import { getWagamiADefibLabel, getWagamiAText } from '@/lib/wagamiALocalization'
import type { WagamiALocale } from '@/types/wagamiA'

type WagamiADefibPanelProps = {
  state: DefibState
  energy: number
  progress: number
  canAdjustEnergy: boolean
  cprTime?: string
  selectedAction?: string | null
  onEnergyDown?: () => void
  onEnergyUp?: () => void
  locale?: WagamiALocale
}

export function WagamiADefibPanel({ state, energy, progress, canAdjustEnergy, cprTime = '--:--', selectedAction, onEnergyDown, onEnergyUp, locale = 'fr' }: WagamiADefibPanelProps) {
  const text = getWagamiAText(locale)
  const ready = state === 'charged'
  const progressPercent = Math.max(0, Math.min(100, Math.round(progress * 100)))
  return (
    <section aria-label="Wagami A defibrillation status" className="grid min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] gap-[clamp(3px,0.5cqw,8px)] rounded-[7px] border border-wagami-a-border bg-wagami-a-surface p-[clamp(7px,0.9cqw,15px)] font-sans text-[clamp(9px,0.9cqw,14px)]">
      <h2 className="font-semibold tracking-wide text-wagami-a-text">{text.defibrillation}</h2>
      <div className="grid gap-1">
        <span className="text-wagami-a-muted-text">{text.energy}</span>
        <div className="grid min-h-[44px] grid-cols-[44px_minmax(0,1fr)_44px] overflow-hidden rounded-[5px] border border-wagami-a-border text-center font-mono text-[clamp(15px,1.7cqw,25px)] font-bold">
          <button type="button" aria-label={text.energyDown} disabled={!canAdjustEnergy || !onEnergyDown} onClick={onEnergyDown} data-navigation-selected={selectedAction === 'energyDown' ? 'true' : 'false'} className="border-r border-wagami-a-border text-wagami-a-pni disabled:cursor-not-allowed enabled:hover:bg-wagami-a-surface-raised data-[navigation-selected=true]:ring-2 data-[navigation-selected=true]:ring-inset data-[navigation-selected=true]:ring-wagami-a-pni">−</button>
          <span className="grid place-items-center tabular-nums">{energy}</span>
          <button type="button" aria-label={text.energyUp} disabled={!canAdjustEnergy || !onEnergyUp} onClick={onEnergyUp} data-navigation-selected={selectedAction === 'energyUp' ? 'true' : 'false'} className="border-l border-wagami-a-border text-wagami-a-pni disabled:cursor-not-allowed enabled:hover:bg-wagami-a-surface-raised data-[navigation-selected=true]:ring-2 data-[navigation-selected=true]:ring-inset data-[navigation-selected=true]:ring-wagami-a-pni">+</button>
        </div>
      </div>
      <span role="status" className="text-center font-mono text-wagami-a-pending">{getWagamiADefibLabel(locale, state)}</span>
      <div className="grid min-h-0 content-end gap-1.5 text-wagami-a-muted-text">
        <div className="flex justify-between"><span>{text.chargeProgress}</span><span className="font-mono tabular-nums">{progressPercent} %</span></div>
        <progress aria-label="Charge progress" className="wagami-a-charge-progress h-[7px] w-full" max="100" value={progressPercent} />
        <div className="flex items-center gap-2"><span>{text.shockReady}</span><strong className={ready ? 'text-wagami-a-alarm' : 'text-wagami-a-pni'}>{ready ? text.ready : text.notReady}</strong></div>
        <div className="flex justify-between"><span>{text.cprTime}</span><strong className="font-mono text-wagami-a-pni tabular-nums">{cprTime}</strong></div>
      </div>
    </section>
  )
}
