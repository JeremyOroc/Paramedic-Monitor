'use client'

import type { ReactNode } from 'react'
import type { DefibState } from '@/hooks/useDefibSequence'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { cn } from '@/lib/utils'

type PhysicalButtonProps = {
  ariaLabel: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  className?: string
  children?: ReactNode
}

function PhysicalButton({
  ariaLabel,
  onClick,
  disabled = false,
  active = false,
  className,
  children,
}: PhysicalButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center select-none',
        'rounded-[12px] border border-[#eef0f2] bg-[#d2d4d5]',
        'text-[#424242] shadow-[inset_3px_4px_5px_rgba(255,255,255,0.62),inset_-4px_-5px_6px_rgba(90,90,90,0.28),4px_5px_5px_rgba(60,60,60,0.22)]',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300',
        active && 'bg-[#4a90b8] text-white',
        disabled && 'cursor-default',
        !disabled && 'hover:bg-[#e0e2e3] active:bg-[#bec2c4]',
        className,
      )}
    >
      {children}
    </button>
  )
}

type DefibButtonProps = {
  label: string
  ariaLabel: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  progress?: number
  className?: string
}

function DefibButton({
  label,
  ariaLabel,
  onClick,
  disabled = false,
  active = false,
  progress,
  className,
}: DefibButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex items-center justify-center',
        'h-[clamp(44px,6.5vh,70px)] w-[clamp(72px,6.8vw,102px)]',
        'rounded-[14px] border-[5px] border-[#efe4b4] bg-[#d7bd74]',
        'font-mono text-[clamp(10px,1.2vw,16px)] font-bold uppercase text-[#c41212]',
        'shadow-[0_4px_0_rgba(120,104,62,0.6),inset_3px_4px_4px_rgba(255,255,255,0.55),inset_-3px_-4px_5px_rgba(112,92,42,0.36)]',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-amber-200',
        active && 'animate-pulse bg-[#eccf83]',
        disabled && 'opacity-55 cursor-default',
        !disabled && 'hover:bg-[#e6cc82] active:translate-y-px',
        className,
      )}
    >
      <span>{label}</span>
      {typeof progress === 'number' && (
        <div className="absolute inset-x-2 bottom-1.5">
          <ProgressBar progress={progress} fillClassName="bg-amber-100" />
        </div>
      )}
    </button>
  )
}

type DeviceShellProps = {
  screen: ReactNode
  defibState: DefibState
  energy: number
  progress: number
  canAnalyse: boolean
  canCharge: boolean
  canShock: boolean
  canAdjustEnergy: boolean
  onAnalyse: () => void
  onCharge: () => void
  onShock: () => void
  onEnergyUp: () => void
  onEnergyDown: () => void
  onTwelveLead: () => void
  onBack: () => void
  twelveLeadActive?: boolean
}

export function DeviceShell({
  screen,
  defibState,
  energy,
  progress,
  canAnalyse,
  canCharge,
  canShock,
  canAdjustEnergy,
  onAnalyse,
  onCharge,
  onShock,
  onEnergyUp,
  onEnergyDown,
  onTwelveLead,
  onBack,
  twelveLeadActive = false,
}: DeviceShellProps) {
  return (
    <div className="grid h-screen w-screen min-w-[1024px] place-items-center overflow-hidden bg-[#101010]">
      <div className="relative aspect-[1.36] h-[96vh] max-h-[calc(98vw/1.36)]">
        <div className="absolute inset-0 overflow-hidden rounded-[72px] bg-[#06317f] shadow-[0_26px_55px_rgba(0,0,0,0.55),inset_0_0_0_12px_rgba(0,67,154,0.92),inset_0_0_30px_rgba(0,0,0,0.36)]">
          <div className="absolute inset-x-[8%] top-[-3.2%] h-[8%] rounded-b-[42px] bg-[#f2f2f2] shadow-[inset_0_-8px_12px_rgba(0,0,0,0.18)]" />
          <div className="absolute inset-[3.2%] grid grid-rows-[13%_1fr_21%] overflow-hidden rounded-[58px] border-[3px] border-[#0a2362] bg-[#c7c8c7] shadow-[inset_0_0_32px_rgba(255,255,255,0.54),inset_0_0_0_2px_rgba(78,78,78,0.2)]">
            <DeviceHeader />
            <div className="grid min-h-0 grid-cols-[10.5%_1fr_17.5%] gap-[1.4%] px-[2.8%]">
              <LeftSoftKeys
                onTwelveLead={onTwelveLead}
                onBack={onBack}
                twelveLeadActive={twelveLeadActive}
              />
              <div className="min-h-0 rounded-[17px] bg-[#2b2b2b] p-[clamp(5px,0.6vw,9px)] shadow-[0_6px_7px_rgba(0,0,0,0.28),inset_0_0_0_2px_rgba(255,255,255,0.2)]">
                <div className="h-full min-h-0 overflow-hidden rounded-[6px] bg-black">
                  {screen}
                </div>
              </div>
              <RightControlCluster />
            </div>
            <BottomDefibStrip
              defibState={defibState}
              energy={energy}
              progress={progress}
              canAnalyse={canAnalyse}
              canCharge={canCharge}
              canShock={canShock}
              canAdjustEnergy={canAdjustEnergy}
              onAnalyse={onAnalyse}
              onCharge={onCharge}
              onShock={onShock}
              onEnergyUp={onEnergyUp}
              onEnergyDown={onEnergyDown}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function DeviceHeader() {
  return (
    <div className="relative flex items-start justify-center pt-[2.1%]">
      <span className="select-none text-[clamp(30px,4.6vw,68px)] font-black leading-none tracking-[0.02em] text-white/45">
        ZOLL
      </span>
      <div className="absolute right-[22%] top-[10%] grid h-[clamp(30px,3.6vw,52px)] w-[clamp(58px,6.5vw,94px)] place-items-center rounded-full bg-[#6f92d1] shadow-[inset_0_2px_4px_rgba(255,255,255,0.45),0_3px_7px_rgba(0,0,0,0.22)]">
        <div className="grid h-[72%] w-[72%] place-items-center rounded-full bg-[#22b938] shadow-[inset_0_4px_4px_rgba(255,255,255,0.32),inset_0_-5px_5px_rgba(0,0,0,0.22)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-[62%] w-[62%]" aria-hidden="true">
            <path
              d="M12 3v9M6.3 6.7A8 8 0 1 0 17.7 6.7"
              stroke="white"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

type LeftSoftKeysProps = {
  onTwelveLead: () => void
  onBack: () => void
  twelveLeadActive: boolean
}

function LeftSoftKeys({ onTwelveLead, onBack, twelveLeadActive }: LeftSoftKeysProps) {
  const keys = [
    { ariaLabel: 'Brightness soft key', disabled: true },
    { ariaLabel: '12-lead view', onClick: onTwelveLead, active: twelveLeadActive },
    { ariaLabel: 'EtCO2 soft key', disabled: true },
    { ariaLabel: 'Treatment soft key', disabled: true },
    { ariaLabel: 'Sync soft key', disabled: true },
    { ariaLabel: 'Printer soft key', disabled: true },
    { ariaLabel: 'Back', onClick: onBack },
  ]

  return (
    <div className="grid min-h-0 grid-rows-[56px_1fr_40px] py-[clamp(4px,0.65vh,9px)]">
      <div />
      <div className="flex min-h-0 flex-col justify-between">
        {keys.map((key) => (
          <div key={key.ariaLabel} className="flex items-center justify-end gap-[9px]">
            <PhysicalButton
              ariaLabel={key.ariaLabel}
              onClick={key.onClick}
              disabled={key.disabled}
              active={key.active}
              className="h-[clamp(43px,6.2vh,68px)] w-[clamp(48px,4.8vw,76px)]"
            />
            <div className="h-[clamp(8px,1.1vh,14px)] w-[clamp(11px,1.1vw,18px)] rounded-[3px] bg-[#aeb0b0] shadow-[inset_1px_1px_1px_rgba(255,255,255,0.38)]" />
          </div>
        ))}
      </div>
      <div />
    </div>
  )
}

function RightControlCluster() {
  return (
    <div className="relative min-h-0">
      <PhysicalButton
        ariaLabel="Alarm acknowledge"
        disabled
        className="absolute left-[23%] top-[1.5%] h-[22%] w-[54%] rounded-[24px] bg-[#474747] border-[#dfe1e2]"
      />
      <div className="absolute inset-x-[2%] bottom-[5%] top-[29%] rounded-[19px] bg-[#b9b9b8] shadow-[inset_7px_8px_10px_rgba(255,255,255,0.26),inset_-8px_-9px_10px_rgba(102,102,102,0.2)]">
        <PhysicalButton
          ariaLabel="Home"
          disabled
          className="absolute left-[10%] top-[10%] h-[13.5%] w-[39%] rounded-[13px] text-[clamp(16px,1.7vw,26px)]"
        >
          ⌂
        </PhysicalButton>
        <PhysicalButton
          ariaLabel="Alarm"
          disabled
          className="absolute right-[7%] top-[0%] h-[18%] w-[40%] rounded-[13px] text-[clamp(15px,1.6vw,24px)]"
        >
          ♫
        </PhysicalButton>
        <PhysicalButton
          ariaLabel="Enter"
          disabled
          className="absolute left-[10%] top-[45%] h-[16%] w-[40%] rounded-[13px]"
        >
          <span className="h-[32%] w-[32%] rounded-full bg-[#4a4a4a]" />
        </PhysicalButton>
        <PhysicalButton
          ariaLabel="Move up"
          disabled
          className="absolute right-[12%] top-[30%] h-[24%] w-[42%] rounded-[12px] text-[clamp(28px,3.2vw,48px)]"
        >
          ↗
        </PhysicalButton>
        <PhysicalButton
          ariaLabel="Move down"
          disabled
          className="absolute right-[12%] top-[58%] h-[24%] w-[42%] rounded-[12px] text-[clamp(28px,3.2vw,48px)]"
        >
          ↘
        </PhysicalButton>
        <PhysicalButton
          ariaLabel="Snapshot"
          disabled
          className="absolute left-[10%] bottom-[8%] h-[14%] w-[39%] rounded-[13px] text-[clamp(16px,1.7vw,25px)]"
        >
          ◫
        </PhysicalButton>
        <PhysicalButton
          ariaLabel="Patient event"
          disabled
          className="absolute right-[8%] bottom-[-7%] h-[14%] w-[39%] rotate-[-5deg] rounded-[13px] text-[clamp(15px,1.6vw,23px)]"
        >
          ◢
        </PhysicalButton>
      </div>
    </div>
  )
}

type BottomDefibStripProps = {
  defibState: DefibState
  energy: number
  progress: number
  canAnalyse: boolean
  canCharge: boolean
  canShock: boolean
  canAdjustEnergy: boolean
  onAnalyse: () => void
  onCharge: () => void
  onShock: () => void
  onEnergyUp: () => void
  onEnergyDown: () => void
}

function BottomDefibStrip({
  defibState,
  energy,
  progress,
  canAnalyse,
  canCharge,
  canShock,
  canAdjustEnergy,
  onAnalyse,
  onCharge,
  onShock,
  onEnergyUp,
  onEnergyDown,
}: BottomDefibStripProps) {
  return (
    <div className="relative grid min-h-0 grid-cols-[38%_41%_21%] px-[3.2%] pb-[1.6%] pt-[1%]">
      <div className="relative">
        <div className="absolute bottom-[18%] left-[5%] flex items-end gap-[clamp(12px,1.5vw,24px)] text-[#4d4d4d]">
          <span className="h-[clamp(13px,1.4vw,22px)] w-[clamp(13px,1.4vw,22px)] rounded-full bg-[#656565] shadow-[inset_2px_2px_3px_rgba(255,255,255,0.3)]" />
          <span className="h-[clamp(13px,1.4vw,22px)] w-[clamp(13px,1.4vw,22px)] rounded-full bg-[#656565] shadow-[inset_2px_2px_3px_rgba(255,255,255,0.3)]" />
        </div>
      </div>

      <div className="relative rounded-t-[17px] bg-[#bbbbba] shadow-[inset_5px_7px_9px_rgba(255,255,255,0.24),inset_-6px_-7px_10px_rgba(94,94,94,0.18)]">
        <span className="absolute left-[20%] top-[4%] z-10 font-mono text-[clamp(22px,3vw,44px)] font-bold text-[#d00000]">
          1
        </span>
        <span className="absolute left-[70%] top-[4%] z-10 font-mono text-[clamp(22px,3vw,44px)] font-bold text-[#d00000]">
          2
        </span>
        <div className="absolute inset-x-[8%] bottom-[16%] flex items-end justify-between">
          <DefibButton
            label="ANALYZE"
            ariaLabel="Analyze rhythm"
            onClick={onAnalyse}
            disabled={!canAnalyse}
            active={defibState === 'analysing'}
            progress={defibState === 'analysing' ? progress : undefined}
          />
          <EnergySelectButton
            energy={energy}
            canAdjustEnergy={canAdjustEnergy}
            onEnergyUp={onEnergyUp}
            onEnergyDown={onEnergyDown}
          />
          <DefibButton
            label="CHARGE"
            ariaLabel="Charge defibrillator"
            onClick={onCharge}
            disabled={!canCharge}
            active={defibState === 'charging'}
            progress={defibState === 'charging' ? progress : undefined}
          />
        </div>
      </div>

      <div className="relative rounded-t-[17px] bg-[#bbbbba] shadow-[inset_5px_7px_9px_rgba(255,255,255,0.24),inset_-6px_-7px_10px_rgba(94,94,94,0.18)]">
        <span className="absolute left-[8%] top-[4%] font-mono text-[clamp(22px,3vw,44px)] font-bold text-[#d00000]">
          3
        </span>
        <span className="absolute left-[36%] top-[7%] font-mono text-[clamp(12px,1.4vw,20px)] font-bold uppercase text-[#d00000]">
          SHOCK
        </span>
        <button
          type="button"
          aria-label="Shock"
          onClick={onShock}
          disabled={!canShock}
          className={cn(
            'absolute bottom-[12%] left-[25%] grid h-[clamp(78px,12vh,130px)] w-[clamp(78px,12vh,130px)] place-items-center rounded-full',
            'border-[9px] border-[#ff6532] bg-[#d51b0f] text-white',
            'shadow-[0_5px_0_rgba(114,30,18,0.55),inset_5px_7px_10px_rgba(255,116,84,0.42),inset_-6px_-8px_10px_rgba(105,0,0,0.36)]',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-red-200',
            defibState === 'charged' && 'animate-pulse bg-[#ff2020]',
            !canShock && 'cursor-default',
            canShock && 'hover:bg-[#eb2416] active:translate-y-px',
          )}
        >
          <span className="text-[clamp(36px,5.2vw,76px)] leading-none">⚡</span>
        </button>
      </div>
    </div>
  )
}

type EnergySelectButtonProps = {
  energy: number
  canAdjustEnergy: boolean
  onEnergyUp: () => void
  onEnergyDown: () => void
}

function EnergySelectButton({
  energy,
  canAdjustEnergy,
  onEnergyUp,
  onEnergyDown,
}: EnergySelectButtonProps) {
  return (
    <div
      className={cn(
        'relative flex h-[clamp(72px,10.5vh,116px)] w-[clamp(76px,7vw,106px)] flex-col items-center justify-center',
        'rounded-[18px] border-[7px] border-[#efe4b4] bg-[#d7bd74]',
        'font-mono font-bold uppercase text-[#c41212]',
        'shadow-[0_4px_0_rgba(120,104,62,0.6),inset_3px_4px_4px_rgba(255,255,255,0.55),inset_-3px_-4px_5px_rgba(112,92,42,0.36)]',
        !canAdjustEnergy && 'opacity-55',
      )}
    >
      <button
        type="button"
        aria-label="Increase energy"
        onClick={onEnergyUp}
        disabled={!canAdjustEnergy}
        className="absolute top-[8%] text-[clamp(18px,2vw,30px)] leading-none disabled:cursor-default"
      >
        ▲
      </button>
      <span className="text-center text-[clamp(10px,1.2vw,16px)] leading-[1.05]">
        ENERGY
        <br />
        SELECT
      </span>
      <span className="sr-only">
        <span>{energy}</span> J
      </span>
      <button
        type="button"
        aria-label="Decrease energy"
        onClick={onEnergyDown}
        disabled={!canAdjustEnergy}
        className="absolute bottom-[7%] text-[clamp(18px,2vw,30px)] leading-none disabled:cursor-default"
      >
        ▼
      </button>
    </div>
  )
}
