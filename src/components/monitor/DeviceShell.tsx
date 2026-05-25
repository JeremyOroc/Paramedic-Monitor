'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { DefibState } from '@/hooks/useDefibSequence'
import { cn } from '@/lib/utils'
import { playButtonClick } from '@/lib/audio'

type PhysicalButtonProps = {
  ariaLabel: string
  onClick?: () => void
  active?: boolean
  className?: string
  children?: ReactNode
}

function PhysicalButton({
  ariaLabel,
  onClick,
  active = false,
  className,
  children,
}: PhysicalButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => { playButtonClick(); onClick?.() }}
      className={cn(
        'flex items-center justify-center select-none',
        'rounded-[12px] border border-[#eef0f2] bg-[#d2d4d5]',
        'text-[#424242] shadow-[inset_3px_4px_5px_rgba(255,255,255,0.62),inset_-4px_-5px_6px_rgba(90,90,90,0.28),4px_5px_5px_rgba(60,60,60,0.22)]',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300',
        active && 'bg-[#4a90b8] text-white',
        'hover:bg-[#e0e2e3] active:bg-[#bec2c4]',
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
  className,
}: Omit<DefibButtonProps, 'progress'>) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => { if (!disabled) { playButtonClick(); onClick?.() } }}
      disabled={disabled}
      className={cn(
        'relative flex items-center justify-center',
        'h-[clamp(44px,6.5vh,70px)] w-[clamp(72px,6.8vw,102px)]',
        'rounded-[14px] border-[5px] border-[#efe4b4] bg-[#d7bd74]',
        'font-mono text-[clamp(10px,1.2vw,16px)] font-bold uppercase text-[#c41212]',
        'shadow-[0_4px_0_rgba(120,104,62,0.6),inset_3px_4px_4px_rgba(255,255,255,0.55),inset_-3px_-4px_5px_rgba(112,92,42,0.36)]',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-amber-200',
        active && 'bg-[#eccf83]',
        disabled && 'cursor-default',
        !disabled && 'hover:bg-[#e6cc82] active:translate-y-px',
        className,
      )}
    >
      <span>{label}</span>
    </button>
  )
}

type PowerState = 'on' | 'booting' | 'off'

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
  onToggleEtco2: () => void
  onLeftAnalyse: () => void
  onBack: () => void
  twelveLeadActive?: boolean
  onPowerOn?: () => void
  onPowerOff?: () => void
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
  onToggleEtco2,
  onLeftAnalyse,
  onBack,
  twelveLeadActive = false,
  onPowerOn,
  onPowerOff,
}: DeviceShellProps) {
  const [powerState, setPowerState] = useState<PowerState>('on')
  const bootTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handlePowerToggle() {
    if (powerState === 'booting') return
    if (bootTimerRef.current) clearTimeout(bootTimerRef.current)
    if (powerState === 'on') {
      onPowerOff?.()
      setPowerState('off')
    } else {
      setPowerState('booting')
      bootTimerRef.current = setTimeout(() => {
        setPowerState('on')
        onPowerOn?.()
      }, 2000)
    }
  }

  return (
    <div className="grid h-screen w-screen min-w-[1024px] place-items-center overflow-hidden bg-[#101010]">
      <div className="relative aspect-[1.36] h-[96vh] max-h-[calc(98vw/1.36)]">
        <div className="absolute inset-0 overflow-hidden rounded-[72px] bg-[#06317f] shadow-[0_26px_55px_rgba(0,0,0,0.55),inset_0_0_0_12px_rgba(0,67,154,0.92),inset_0_0_30px_rgba(0,0,0,0.36)]">
          <div className="absolute left-[10%] top-[-2.6%] h-[7.5%] w-[22%] rounded-b-[18px] bg-[#f2f2f2] shadow-[inset_0_-8px_12px_rgba(0,0,0,0.18),0_4px_6px_rgba(0,0,0,0.22)]" />
          <PowerButton powerState={powerState} onToggle={handlePowerToggle} />
          <div className="absolute inset-[3.2%] grid grid-rows-[13%_1fr_21%] overflow-hidden rounded-[58px] border-[3px] border-[#0a2362] bg-[#c7c8c7] shadow-[inset_0_0_32px_rgba(255,255,255,0.54),inset_0_0_0_2px_rgba(78,78,78,0.2)]">
            <DeviceHeader />
            <div className="grid min-h-0 grid-cols-[10.5%_1fr_17.5%] gap-[1.4%] px-[2.8%]">
              <LeftSoftKeys
                onTwelveLead={onTwelveLead}
                onToggleEtco2={onToggleEtco2}
                onLeftAnalyse={onLeftAnalyse}
                onBack={onBack}
                twelveLeadActive={twelveLeadActive}
              />
              <div className="min-h-0 rounded-[17px] bg-[#2b2b2b] p-[clamp(5px,0.6vw,9px)] shadow-[0_6px_7px_rgba(0,0,0,0.28),inset_0_0_0_2px_rgba(255,255,255,0.2)]">
                <div className="h-full min-h-0 overflow-hidden rounded-[6px] bg-black">
                  {powerState === 'on' && screen}
                  {powerState === 'booting' && <BootScreen />}
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

type PowerButtonProps = {
  powerState: PowerState
  onToggle: () => void
}

function PowerButton({ powerState, onToggle }: PowerButtonProps) {
  return (
    <button
      type="button"
      aria-label="Power"
      aria-pressed={powerState === 'on'}
      onClick={() => { playButtonClick(); onToggle() }}
      className="absolute right-[22%] top-[1.2%] z-20 grid h-[clamp(34px,4.2vw,62px)] w-[clamp(66px,7.2vw,108px)] place-items-center rounded-full bg-[#6f92d1] shadow-[inset_0_2px_4px_rgba(255,255,255,0.45),0_3px_7px_rgba(0,0,0,0.22)] focus:outline-none focus:ring-2 focus:ring-cyan-200"
    >
      <span
        className={cn(
          'grid h-[72%] w-[72%] place-items-center rounded-full shadow-[inset_0_4px_4px_rgba(255,255,255,0.32),inset_0_-5px_5px_rgba(0,0,0,0.22)] transition-colors',
          powerState === 'on' && 'bg-[#22b938]',
          powerState === 'off' && 'bg-[#d51b1b]',
          powerState === 'booting' && 'animate-pulse bg-[#ffaa00]',
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-[62%] w-[62%]" aria-hidden="true">
          <path
            d="M12 3v9M6.3 6.7A8 8 0 1 0 17.7 6.7"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </button>
  )
}

function BootScreen() {
  const [prankCombo] = useState<1 | 2 | null>(() =>
    Math.random() < 1 / 3 ? (Math.random() < 0.5 ? 1 : 2) : null
  )
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    const video = videoRef.current

    if (!audio) return
    if (!video) return

    video.playbackRate = 1
    if (prankCombo === 1) {
      audio.currentTime = 0.3
      video.playbackRate = 1.5
    }
    audio.play().catch(() => {})
    const cutoff = setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
    }, 2500)
    return () => {
      clearTimeout(cutoff)
      audio.pause()
    }
  }, [prankCombo])

  return (
    <div className="relative h-full w-full bg-black">
      {prankCombo !== null && (
        <>
          <video
            ref={videoRef}
            src={prankCombo === 1 ? '/videos/jumpscare1.mov' : '/videos/jumpscare2.mov'}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
          <audio
            ref={audioRef}
            src={prankCombo === 1 ? '/audio/jumpscare_fnaf2.mp3' : '/audio/jumpscare_fnaf1.mp3'}
          />
        </>
      )}
      <span className="absolute bottom-[8%] right-[6%] select-none font-mono text-[clamp(18px,2.4vw,36px)] font-black text-white">
        WAGAMI
      </span>
    </div>
  )
}

function DeviceHeader() {
  return (
    <div className="relative flex items-start justify-center pt-[2.1%]">
      <span className="select-none text-[clamp(30px,4.6vw,68px)] font-black leading-none tracking-[0.02em] text-white/45">
        WAGAMI
      </span>
    </div>
  )
}

type LeftSoftKeysProps = {
  onTwelveLead: () => void
  onToggleEtco2: () => void
  onLeftAnalyse: () => void
  onBack: () => void
  twelveLeadActive: boolean
}

function LeftSoftKeys({
  onTwelveLead,
  onToggleEtco2,
  onLeftAnalyse,
  onBack,
  twelveLeadActive,
}: LeftSoftKeysProps) {
  const keys = [
    { ariaLabel: 'Brightness soft key' },
    { ariaLabel: '12-lead view', onClick: onTwelveLead, active: twelveLeadActive },
    { ariaLabel: 'Toggle EtCO2', onClick: onToggleEtco2 },
    { ariaLabel: 'Treatment soft key' },
    { ariaLabel: 'Analyse (sidebar)', onClick: onLeftAnalyse },
    { ariaLabel: 'Printer soft key' },
    { ariaLabel: 'Back', onClick: onBack },
  ]

  return (
    // Mirror the on-screen LeftSidebar geometry so the physical soft keys line
    // up 1:1 with the menu rows: same top offset (32px top bar + 24px sub bar,
    // plus the screen bezel inset), same pb-[54px], same button height, same
    // justify-between distribution over the shared device row.
    <div className="relative z-10 flex h-full min-h-0 flex-col justify-between pt-[calc(clamp(5px,0.6vw,9px)+56px)] pb-[calc(clamp(5px,0.6vw,9px)+54px)]">
      {keys.map((key) => (
        <div key={key.ariaLabel} className="flex items-center justify-end gap-[9px]">
          <PhysicalButton
            ariaLabel={key.ariaLabel}
            onClick={key.onClick}
            active={key.active}
            className="h-[clamp(43px,6.2vh,68px)] w-[clamp(48px,4.8vw,76px)]"
          />
          <div className="h-[clamp(8px,1.1vh,14px)] w-[clamp(11px,1.1vw,18px)] rounded-[3px] bg-[#aeb0b0] shadow-[inset_1px_1px_1px_rgba(255,255,255,0.38)]" />
        </div>
      ))}
    </div>
  )
}

function RightControlCluster() {
  return (
    <div className="relative min-h-0">
      <PhysicalButton
        ariaLabel="Alarm acknowledge"
        className="absolute left-[23%] top-[1.5%] h-[22%] w-[54%] rounded-[24px] bg-[#474747] border-[#dfe1e2]"
      />
      <div className="absolute inset-x-[2%] bottom-[0%] top-[29%] rounded-[19px] bg-[#b9b9b8] shadow-[inset_7px_8px_10px_rgba(255,255,255,0.26),inset_-8px_-9px_10px_rgba(102,102,102,0.2)]">
        <PhysicalButton
          ariaLabel="Home"
          className="absolute left-[10%] top-[10%] h-[13.5%] w-[39%] rounded-[13px]"
        >
          <HomeIcon />
        </PhysicalButton>
        <PhysicalButton
          ariaLabel="Alarm"
          className="absolute right-[7%] top-[0%] h-[18%] w-[40%] rounded-[13px] text-[clamp(15px,1.6vw,24px)]"
        >
          🔔
        </PhysicalButton>
        <PhysicalButton
          ariaLabel="Enter"
          className="absolute left-[10%] top-[45%] h-[16%] w-[40%] rounded-[13px]"
        >
          <span className="h-[32%] w-[32%] rounded-full bg-[#4a4a4a]" />
        </PhysicalButton>
        <PhysicalButton
          ariaLabel="Move up"
          className="absolute right-[13%] top-[30%] h-[18%] w-[35%] rounded-[13px]"
        >
          <CurvedArrowIcon direction="up" />
        </PhysicalButton>
        <PhysicalButton
          ariaLabel="Move down"
          className="absolute right-[13%] top-[56%] h-[18%] w-[35%] rounded-[13px]"
        >
          <CurvedArrowIcon direction="down" />
        </PhysicalButton>
        <PhysicalButton
          ariaLabel="Snapshot"
          className="absolute left-[10%] bottom-[8%] h-[14%] w-[39%] rounded-[13px] text-[clamp(16px,1.7vw,25px)]"
        >
          📷
        </PhysicalButton>
        <PhysicalButton
          ariaLabel="Patient event"
          className="absolute right-[8%] bottom-[3%] h-[13%] w-[37%] rounded-[13px] text-[clamp(15px,1.6vw,23px)]"
        >
          💪
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
        <button
          type="button"
          aria-label="Pacer"
          onClick={() => { playButtonClick() }}
          className="absolute bottom-[34%] right-[8%] grid h-[clamp(56px,9.6vh,104px)] w-[clamp(56px,9.6vh,104px)] place-items-center rounded-full border-[7px] border-[#10a99e] bg-[#4d575d] font-mono text-[clamp(11px,1.4vw,20px)] font-bold uppercase text-white shadow-[0_4px_0_rgba(0,74,75,0.58),inset_3px_5px_8px_rgba(255,255,255,0.22),inset_-5px_-7px_8px_rgba(0,0,0,0.34)] transition-colors hover:bg-[#5b666d] active:translate-y-px focus:outline-none focus:ring-2 focus:ring-cyan-300"
        >
          PACER
        </button>
        <div className="absolute bottom-[15%] left-[5%] flex items-end gap-[clamp(13px,1.7vw,26px)] text-[#4d4d4d]">
          <div className="flex flex-col items-center gap-1">
            <span className="h-[clamp(13px,1.4vw,22px)] w-[clamp(13px,1.4vw,22px)] rounded-full bg-[#656565] shadow-[inset_2px_2px_3px_rgba(255,255,255,0.3)]" />
            <span className="text-[clamp(15px,1.7vw,25px)] leading-none">🔌</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="h-[clamp(13px,1.4vw,22px)] w-[clamp(13px,1.4vw,22px)] rounded-full bg-[#656565] shadow-[inset_2px_2px_3px_rgba(255,255,255,0.3)]" />
            <span className="text-[clamp(15px,1.7vw,25px)] leading-none">🔋</span>
          </div>
        </div>
      </div>

      <div className="relative rounded-t-[17px] bg-[#bbbbba] shadow-[inset_5px_7px_9px_rgba(255,255,255,0.24),inset_-6px_-7px_10px_rgba(94,94,94,0.18)]">
        <span className="absolute left-[35%] top-[11%] z-10 font-mono text-[clamp(14px,1.75vw,24px)] font-bold text-[#d00000]">
          1
        </span>
        <span className="absolute left-[70%] top-[10%] z-10 font-mono text-[clamp(14px,1.75vw,24px)] font-bold text-[#d00000]">
          2
        </span>
        <div className="absolute inset-x-[8%] bottom-[18%] flex items-center justify-between">
          <DefibButton
            label="ANALYZE"
            ariaLabel="Analyze rhythm"
            onClick={onAnalyse}
            disabled={!canAnalyse}
            active={defibState.startsWith('analyzing')}
            className="scale-95"
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
            className="scale-95"
          />
        </div>
      </div>

      <div className="relative rounded-t-[17px] bg-[#bbbbba] shadow-[inset_5px_7px_9px_rgba(255,255,255,0.24),inset_-6px_-7px_10px_rgba(94,94,94,0.18)]">
        <span className="absolute left-[13%] top-[4%] z-10 font-mono text-[clamp(16px,2vw,28px)] font-bold text-[#d00000]">
          3
        </span>
        <span className="absolute left-[34%] top-[-3%] z-10 font-mono text-[clamp(12px,1.4vw,20px)] font-bold uppercase text-[#d00000]">
          SHOCK
        </span>
        <button
          type="button"
          aria-label="Shock"
          onClick={() => { if (canShock) { playButtonClick(); onShock() } }}
          disabled={!canShock}
          className={cn(
            'absolute bottom-[13%] left-[27%] grid h-[clamp(72px,10.8vh,118px)] w-[clamp(72px,10.8vh,118px)] place-items-center rounded-full',
            'border-[9px] bg-[#d51b0f] text-white',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-red-200',
            defibState === 'charged' ? 'border-[#ff2020] bg-[#ffea00] text-[#ff2020] shadow-[0_0_25px_rgba(255,32,32,0.8),inset_0_0_15px_rgba(255,100,50,0.8)] animate-pulse' : 'border-[#ff6532] shadow-[0_5px_0_rgba(114,30,18,0.55),inset_5px_7px_10px_rgba(255,116,84,0.42),inset_-6px_-8px_10px_rgba(105,0,0,0.36)]',
            !canShock && 'cursor-default',
            canShock && 'hover:bg-[#ffea00] active:translate-y-px',
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
        'grid h-[clamp(88px,12.4vh,138px)] w-[clamp(66px,6.1vw,92px)] grid-rows-[1fr_auto_1fr] place-items-center px-1.5 py-2',
        'rounded-[18px] border-[7px] border-[#efe4b4] bg-[#d7bd74]',
        'font-mono font-bold uppercase text-[#c41212]',
        'shadow-[0_4px_0_rgba(120,104,62,0.6),inset_3px_4px_4px_rgba(255,255,255,0.55),inset_-3px_-4px_5px_rgba(112,92,42,0.36)]',
      )}
    >
      <button
        type="button"
        aria-label="Increase energy"
        onClick={onEnergyUp}
        disabled={!canAdjustEnergy}
        className="grid h-[clamp(12px,1.4vw,18px)] w-[clamp(24px,2.6vw,38px)] place-items-center disabled:cursor-default"
      >
        <WideTriangleIcon direction="up" />
      </button>
      <span className="text-center text-[clamp(7px,0.82vw,11px)] leading-[1.08]">
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
        className="grid h-[clamp(12px,1.4vw,18px)] w-[clamp(24px,2.6vw,38px)] place-items-center disabled:cursor-default"
      >
        <WideTriangleIcon direction="down" />
      </button>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-[58%] w-[58%]" aria-hidden="true">
      <path
        d="M7 15.5 16 8l9 7.5M10 14.5V25h12V14.5M14 25v-7h4v7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CurvedArrowIcon({ direction }: { direction: 'up' | 'down' }) {
  const path =
    direction === 'up'
      ? 'M8 24c0-10 6-16 17-16'
      : 'M8 8c0 10 6 16 17 16'
  const arrow =
    direction === 'up'
      ? 'M19 4h7v7'
      : 'M19 28h7v-7'

  return (
    <svg viewBox="0 0 32 32" className="h-[76%] w-[76%]" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d={arrow}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WideTriangleIcon({ direction }: { direction: 'up' | 'down' }) {
  const points = direction === 'up' ? '16 3 30 17 2 17' : '2 3 30 3 16 17'

  return (
    <svg viewBox="0 0 32 20" className="h-full w-full" aria-hidden="true">
      <polygon points={points} fill="currentColor" />
    </svg>
  )
}
