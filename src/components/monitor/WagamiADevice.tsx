'use client'

import type { ReactNode } from 'react'

import { useWagamiANavigation } from '@/hooks/useWagamiANavigation'
import type { DefibChargeOrigin, DefibState } from '@/hooks/useDefibSequence'
import type { NibpPhase } from '@/hooks/useNibpReading'
import { WAGAMI_A_MONITOR_ACTION_ORDER, type WagamiANavigationAction } from '@/lib/wagamiANavigation'
import { isWagamiACallInfoBlocked } from '@/lib/wagamiACallInfo'
import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import { getWagamiAText } from '@/lib/wagamiALocalization'
import type { WagamiALocale } from '@/types/wagamiA'
import { WagamiAScreen } from './WagamiAScreen'
import type { WagamiATask } from './WagamiATaskDock'

type WagamiADeviceProps = {
  display: WagamiADisplayState
  energy: number
  defibState?: DefibState
  chargeProgress?: number
  chargeOrigin?: DefibChargeOrigin
  cprTime?: string
  cprOverride?: boolean
  nibpPhase?: NibpPhase
  nibpDisplayValue?: string | number
  bpReadingActive?: boolean
  poweredOn: boolean
  onPowerToggle: () => void
  patientMode?: 'adult' | 'pediatric' | 'neonate'
  patientModeLocked?: boolean
  muted?: boolean
  canAnalyse?: boolean
  canCharge?: boolean
  canShock?: boolean
  canReadBP?: boolean
  canAdjustEnergy?: boolean
  onAnalyse?: () => void
  onCharge?: () => void
  onShock?: () => void
  onMute?: () => void
  onPatientModeCycle?: () => void
  onReadBP?: () => void
  onEnergyDown?: () => void
  onEnergyUp?: () => void
  onTask?: (task: WagamiATask) => void
  navigationView?: string
  secondaryActions?: ReadonlyArray<WagamiANavigationAction>
  screenContent?: ReactNode | ((selectedAction: string | null) => ReactNode)
  locale?: WagamiALocale
  shellAlarmLedEnabled?: boolean
  date?: string
  time?: string
  sessionTimer?: string
}

const SIDE_KEY = 'wagami-a-shell-control absolute z-20 grid w-[5.4%] min-w-[44px] place-content-center justify-items-center rounded-[10px] border-2 border-wagami-a-border bg-wagami-a-surface-raised font-sans text-[clamp(9px,0.95cqw,14px)] font-bold leading-tight text-wagami-a-text disabled:cursor-not-allowed enabled:hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wagami-a-pni'
const NAV_KEY = 'wagami-a-navigation-button grid aspect-square h-full min-h-[44px] place-items-center rounded-full border-2 border-wagami-a-border bg-wagami-a-surface-raised disabled:cursor-not-allowed enabled:hover:brightness-125 focus-visible:outline-2 focus-visible:outline-wagami-a-pni'

function ShellIcon({ kind, muted = false }: { kind: 'power' | 'analyze' | 'shock' | 'sound' | 'patient' | 'bp' | 'left' | 'enter' | 'right'; muted?: boolean }) {
  const className = 'h-[clamp(20px,2.3cqw,35px)] w-[clamp(20px,2.3cqw,35px)] fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]'
  if (kind === 'power') return <svg viewBox="0 0 24 24" aria-hidden="true" className={className}><path d="M12 2v9M7.2 5.1a8.5 8.5 0 1 0 9.6 0" /></svg>
  if (kind === 'analyze') return <svg viewBox="0 0 24 24" aria-hidden="true" className={className}><path d="M2 13h5l2-5 3 10 2-5h8" /></svg>
  if (kind === 'shock') return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[clamp(20px,2.3cqw,35px)] w-[clamp(20px,2.3cqw,35px)] fill-current"><path d="m13.6 1-8 13h5.1L9 23l9.5-14h-5.1z" /></svg>
  if (kind === 'sound') return <svg viewBox="0 0 24 24" aria-hidden="true" className={className}><path d="M3 9h4l5-4v14l-5-4H3z" />{muted ? <path d="M5 20 20 4" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />}</svg>
  if (kind === 'patient') return <svg viewBox="0 0 24 24" aria-hidden="true" className={className}><circle cx="12" cy="5" r="2" /><path d="M12 8v10m-5 3 2-7 3-2 3 2 2 7M7 11l5-2 5 2" /></svg>
  // Original cuff-and-gauge drawing; the supplied icon is not embedded, traced, or reused.
  if (kind === 'bp') return <svg viewBox="0 0 32 32" aria-hidden="true" className={className}><rect x="5" y="8" width="18" height="14" rx="2" /><path d="M7 12h14M8 22c1 4 5 6 9 6 5 0 9-3 9-8" /><circle cx="25" cy="14" r="5" /><path d="m25 14 2-2M11 5h6" /></svg>
  if (kind === 'enter') return <svg viewBox="0 0 24 24" aria-hidden="true" className={className}><path d="m4 12 5 5L20 6" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[45%] w-[45%] fill-current"><path d={kind === 'left' ? 'M16 3 5 12l11 9z' : 'M8 3v18l11-9z'} /></svg>
}

export function WagamiADevice({ display, energy, defibState = 'idle', chargeProgress = 0, chargeOrigin = null, cprTime, cprOverride = false, nibpPhase = 'idle', nibpDisplayValue = '', bpReadingActive = false, poweredOn, onPowerToggle, patientMode = 'adult', patientModeLocked = false, muted = false, canAnalyse = false, canCharge = false, canShock = false, canReadBP = false, canAdjustEnergy = false, onAnalyse, onCharge, onShock, onMute, onPatientModeCycle, onReadBP, onEnergyDown, onEnergyUp, onTask, navigationView = 'monitor', secondaryActions, screenContent, locale = 'fr', shellAlarmLedEnabled = true, date, time, sessionTimer }: WagamiADeviceProps) {
  const text = getWagamiAText(locale)
  const patientModeLabel = { adult: text.adult, pediatric: text.pediatric, neonate: text.neonate } as const
  const patientModeAccessibleLabel = `${text.patientMode}, ${text.currentMode} ${patientModeLabel[patientMode]}`
  const alarming = display.alarms.length > 0 && poweredOn && shellAlarmLedEnabled
  const callInfoBlocked = isWagamiACallInfoBlocked(defibState)
  const activateTask = (task: WagamiATask) => {
    if (task === 'callInfo' && callInfoBlocked) return
    onTask?.(task)
  }
  const monitorActions: WagamiANavigationAction[] = WAGAMI_A_MONITOR_ACTION_ORDER.map((id) => {
    if (id === 'energyDown') return { id, enabled: poweredOn && canAdjustEnergy && !!onEnergyDown, activate: () => onEnergyDown?.() }
    if (id === 'energyUp') return { id, enabled: poweredOn && canAdjustEnergy && !!onEnergyUp, activate: () => onEnergyUp?.() }
    return { id, enabled: poweredOn && !!onTask && !(id === 'callInfo' && callInfoBlocked), activate: () => activateTask(id as WagamiATask) }
  })
  const navigation = useWagamiANavigation(navigationView, navigationView === 'monitor' ? monitorActions : secondaryActions ?? [])
  const resolvedScreenContent = typeof screenContent === 'function'
    ? screenContent(navigation.selectedId)
    : screenContent
  return (
    <div data-testid="wagami-a-shell" className="wagami-a-shell relative aspect-[1.53] w-[min(96vw,calc(89vh*1.53))] max-w-[1500px] min-w-[920px] overflow-hidden text-wagami-a-text [container-type:inline-size]">
      <div aria-hidden="true" className="wagami-a-shell-inner absolute inset-[1.4%]" />
      <div aria-hidden="true" className="wagami-a-shell-grip absolute left-[1.8%] top-[47%] h-[22%] w-[2.1%]" />
      <div aria-hidden="true" className="wagami-a-shell-grip absolute right-[1.8%] top-[41%] h-[24%] w-[2.1%]" />
      <span data-testid="wagami-a-shell-led" data-enabled={shellAlarmLedEnabled ? 'true' : 'false'} data-alarming={alarming ? 'true' : 'false'} aria-label={!shellAlarmLedEnabled ? text.ledDisabled : alarming ? text.ledActive : text.ledNormal} className="wagami-a-shell-led absolute left-[7.4%] top-[4%] z-10 h-[clamp(10px,1.35cqw,19px)] w-[clamp(10px,1.35cqw,19px)] rounded-full" />
      <div className="absolute left-[14%] top-[2.7%] z-10 font-sans text-[clamp(19px,2.35cqw,36px)] font-bold tracking-[0.1em]">WAGAMI A</div>
      <div data-testid="wagami-a-inner-display" className="wagami-a-inner-display absolute bottom-[10.6%] left-[6.9%] right-[6.9%] top-[10.5%] overflow-hidden rounded-[12px] border-[clamp(3px,0.4cqw,7px)] border-wagami-a-border bg-wagami-a-screen">
        {poweredOn ? (resolvedScreenContent ?? <WagamiAScreen display={display} energy={energy} defibState={defibState} chargeProgress={chargeProgress} chargeOrigin={chargeOrigin} cprTime={cprTime} cprOverride={cprOverride} nibpPhase={nibpPhase} nibpDisplayValue={nibpDisplayValue} patientMode={patientMode} selectedAction={navigation.selectedId} canAdjustEnergy={canAdjustEnergy} onTask={onTask ? navigation.touch : undefined} onEnergyDown={onEnergyDown ? () => navigation.touch('energyDown') : undefined} onEnergyUp={onEnergyUp ? () => navigation.touch('energyUp') : undefined} locale={locale} callInfoDisabled={callInfoBlocked} date={date} time={time} sessionTimer={sessionTimer} />) : <div data-testid="wagami-a-screen-off" className="grid h-full w-full place-items-center bg-wagami-a-screen font-mono text-[clamp(12px,1.2cqw,18px)] tracking-widest text-wagami-a-muted-text">{text.powerOff}</div>}
      </div>
      <button type="button" aria-label={text.power} aria-pressed={poweredOn} onClick={onPowerToggle} className="wagami-a-power-button wagami-a-shell-control absolute right-[3.4%] top-[2.8%] z-20 grid h-[6.4%] w-[5%] min-h-[44px] min-w-[44px] place-items-center rounded-[9px] border-2 border-wagami-a-border bg-wagami-a-surface-raised text-wagami-a-text enabled:hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wagami-a-pni"><ShellIcon kind="power" /></button>
      <button type="button" aria-label={muted ? text.unmute : text.mute} aria-pressed={muted} disabled={!poweredOn || !onMute} onClick={onMute} className={`${SIDE_KEY} left-[2%] top-[18%] h-[10%]`}><ShellIcon kind="sound" muted={muted} /></button>
      <button type="button" aria-label={patientModeAccessibleLabel} disabled={!poweredOn || patientModeLocked || !onPatientModeCycle} title={patientModeLocked ? text.patientModeLocked : undefined} onClick={onPatientModeCycle} className={`${SIDE_KEY} left-[2%] top-[30%] h-[11%]`}><ShellIcon kind="patient" /><span className="max-w-full break-all px-0.5 text-center text-[clamp(8px,0.8cqw,12px)]">MODE</span></button>
      <button type="button" aria-label={bpReadingActive ? text.bpCancel : text.bpRead} disabled={!poweredOn || !canReadBP || !onReadBP} onClick={onReadBP} className={`${SIDE_KEY} bottom-[15.3%] left-[2%] h-[11%]`}><ShellIcon kind="bp" /><span>{text.bloodPressure}</span></button>
      <div aria-label="Wagami A right clinical shell controls" className="contents">
        <button type="button" aria-label={text.analyze} disabled={!poweredOn || !canAnalyse || !onAnalyse} onClick={onAnalyse} className={`${SIDE_KEY} right-[2%] top-[27%] h-[12%]`}><ShellIcon kind="analyze" /><span>{locale === 'fr' ? 'ANALYSE' : 'ANALYZE'}</span></button>
        <button type="button" aria-label={text.charge} disabled={!poweredOn || !canCharge || !onCharge} onClick={onCharge} className="wagami-a-charge-button absolute right-[2%] top-[41%] z-20 grid h-[13%] w-[5.4%] min-w-[44px] place-items-center rounded-[10px] border-2 border-wagami-a-pending bg-wagami-a-pending font-sans text-[clamp(9px,0.95cqw,14px)] font-bold text-wagami-a-screen disabled:cursor-not-allowed enabled:hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wagami-a-pending">CHARGE</button>
        <div aria-hidden="true" className="wagami-a-shock-guard absolute right-[1.35%] top-[55.8%] z-10 h-[18%] w-[6.7%]" />
        <button type="button" aria-label={text.shock} disabled={!poweredOn || !canShock || !onShock} onClick={onShock} className="wagami-a-shock-button absolute right-[2%] top-[57%] z-20 grid h-[15.6%] w-[5.4%] min-w-[44px] place-content-center justify-items-center gap-1 rounded-[9px] border-2 border-wagami-a-alarm bg-wagami-a-shock-shell font-sans text-[clamp(9px,0.95cqw,14px)] font-bold text-wagami-a-text disabled:cursor-not-allowed enabled:hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wagami-a-alarm"><ShellIcon kind="shock" />{locale === 'fr' ? 'CHOC' : 'SHOCK'}</button>
      </div>
      <div aria-hidden="true" className="wagami-a-navigation-well absolute bottom-[0.9%] left-1/2 z-10 h-[10%] w-[25%] -translate-x-1/2" />
      <nav aria-label={text.shellNavigation} className="absolute bottom-[1.8%] left-1/2 z-20 grid h-[7.1%] w-[22%] -translate-x-1/2 grid-cols-3 gap-[7%]">
        <button type="button" aria-label={text.left} disabled={!poweredOn || !navigation.hasEnabledActions} onClick={() => navigation.move(-1)} className={NAV_KEY}><ShellIcon kind="left" /></button>
        <button type="button" aria-label={text.enter} disabled={!poweredOn || !navigation.selectedId} onClick={navigation.enter} className={NAV_KEY}><ShellIcon kind="enter" /></button>
        <button type="button" aria-label={text.right} disabled={!poweredOn || !navigation.hasEnabledActions} onClick={() => navigation.move(1)} className={NAV_KEY}><ShellIcon kind="right" /></button>
      </nav>
    </div>
  )
}
