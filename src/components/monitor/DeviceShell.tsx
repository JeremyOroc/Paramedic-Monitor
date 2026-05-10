'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { DefibState } from '@/hooks/useDefibSequence'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { cn } from '@/lib/utils'

// ─── Outer Shell Button ────────────────────────────────────────────────────────

type OuterShellButtonProps = {
  ariaLabel: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}

function OuterShellButton({
  ariaLabel,
  onClick,
  disabled = false,
  active = false,
  className,
  style,
  children,
}: OuterShellButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5',
        'bg-[#7b838a] border border-[#5f6872] rounded',
        'text-white font-mono text-[10px] font-bold',
        'transition-colors select-none',
        'hover:bg-[#6b717a] active:bg-[#5c6168]',
        'focus:outline-none focus:ring-1 focus:ring-cyan-300',
        active && 'bg-[#4a90b8] border-cyan-300',
        disabled && 'opacity-40 cursor-default hover:bg-[#7b838a] active:bg-[#7b838a]',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ─── Defib Button ─────────────────────────────────────────────────────────────

type DefibButtonProps = {
  label: string
  ariaLabel: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  progress?: number
}

function DefibButton({
  label,
  ariaLabel,
  onClick,
  disabled = false,
  active = false,
  progress,
}: DefibButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex flex-col items-center justify-center',
        'bg-[#c8893a] border border-[#9a6820] rounded',
        'text-white font-mono font-bold uppercase tracking-wide text-xs',
        'hover:bg-[#d4924a] active:bg-[#b87830] transition-colors',
        'focus:outline-none focus:ring-1 focus:ring-amber-300',
        active && 'bg-[#e0a040] animate-pulse',
        disabled && 'opacity-40 cursor-default hover:bg-[#c8893a] active:bg-[#c8893a]',
      )}
    >
      <span>{label}</span>
      {typeof progress === 'number' && (
        <div className="absolute inset-x-1.5 bottom-1.5">
          <ProgressBar progress={progress} fillClassName="bg-amber-200" />
        </div>
      )}
    </button>
  )
}

// ─── DeviceShell Props ────────────────────────────────────────────────────────

type DeviceShellProps = {
  screen: ReactNode
  // defib
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
  // navigation
  onTwelveLead: () => void
  onBack: () => void
  twelveLeadActive?: boolean
}

// ─── DeviceShell ──────────────────────────────────────────────────────────────

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
    // Viewport background — dark room feel
    <div className="w-screen h-screen bg-[#111111] flex items-center justify-center overflow-hidden">
      {/* Device frame */}
      <div
        className="flex flex-col bg-[#9ca3af] rounded-[14px] shadow-2xl overflow-hidden"
        style={{ height: '95vh', aspectRatio: '7 / 5' }}
      >
        {/* ── Top strip: ZOLL branding ── */}
        <div className="relative flex items-center justify-center shrink-0 bg-[#9ca3af] px-4"
          style={{ height: '52px' }}
        >
          {/* Connector ports (left decoration) */}
          <div className="absolute left-3 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-sm bg-[#7b838a] border border-[#5f6872]" />
            <div className="w-5 h-5 rounded-sm bg-[#7b838a] border border-[#5f6872]" />
          </div>

          {/* ZOLL wordmark */}
          <span className="text-white font-bold text-2xl tracking-[0.45em] select-none drop-shadow">
            WAGAMI
          </span>

          {/* Power button */}
          <div className="absolute right-4 flex items-center justify-center w-8 h-8 rounded-full bg-[#22c55e] border-2 border-[#16a34a] shadow-inner select-none">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
              <path
                d="M12 3v9M6.3 6.3A8 8 0 1 0 17.7 6.3"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* ── Middle section: left strip + screen + right nav ── */}
        <div className="flex flex-row flex-1 overflow-hidden px-2 pb-1 gap-2 min-h-0">
          {/* Left decorative strip */}
          <div className="flex flex-col justify-center shrink-0 gap-1.5 py-2" style={{ width: '22px' }}>
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-full rounded bg-[#7b838a] border border-[#5f6872]"
                style={{ height: '100%', flex: 1 }}
              />
            ))}
          </div>

          {/* Screen slot */}
          <div className="flex-1 overflow-hidden rounded-sm min-w-0 min-h-0 bg-black">
            {screen}
          </div>

          {/* Right nav panel */}
          <RightNavPanel
            onTwelveLead={onTwelveLead}
            onBack={onBack}
            twelveLeadActive={twelveLeadActive}
          />
        </div>

        {/* ── Bottom strip: physical defib buttons ── */}
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
  )
}

// ─── Right Nav Panel ──────────────────────────────────────────────────────────

type RightNavPanelProps = {
  onTwelveLead: () => void
  onBack: () => void
  twelveLeadActive?: boolean
}

function RightNavPanel({ onTwelveLead, onBack, twelveLeadActive }: RightNavPanelProps) {
  return (
    <div className="flex flex-col shrink-0 gap-1.5 py-2" style={{ width: '90px' }}>
      {/* Large alarm/mute button */}
      <OuterShellButton
        ariaLabel="Alarm mute"
        disabled
        className="w-full rounded"
        style={{ minHeight: '48px' }}
      >
        <span className="text-base leading-none">🔕</span>
        <span className="text-[9px] tracking-wide">ALARM</span>
      </OuterShellButton>

      {/* 2-column nav grid */}
      <div className="grid grid-cols-2 gap-1.5 flex-1">
        {/* Row 1 */}
        <OuterShellButton ariaLabel="Home" disabled>
          <span className="text-base leading-none">⌂</span>
        </OuterShellButton>
        <OuterShellButton
          ariaLabel="12-lead view"
          onClick={onTwelveLead}
          active={twelveLeadActive}
        >
          <span className="text-[10px] font-bold leading-none">12</span>
          <span className="text-[9px] leading-none">LEAD</span>
        </OuterShellButton>

        {/* Row 2 */}
        <OuterShellButton ariaLabel="Move forward" disabled>
          <span className="text-base leading-none">↪</span>
        </OuterShellButton>
        <OuterShellButton ariaLabel="Back" onClick={onBack}>
          <span className="text-base leading-none">↩</span>
          <span className="text-[9px]">BACK</span>
        </OuterShellButton>

        {/* Row 3 */}
        <OuterShellButton ariaLabel="Enter" disabled>
          <span className="text-base leading-none">●</span>
        </OuterShellButton>
        <OuterShellButton ariaLabel="Move up" disabled>
          <span className="text-base leading-none">▲</span>
        </OuterShellButton>

        {/* Row 4 */}
        <OuterShellButton ariaLabel="Snapshot" disabled>
          <span className="text-base leading-none">📷</span>
        </OuterShellButton>
        <OuterShellButton ariaLabel="Settings" disabled>
          <span className="text-base leading-none">⚙</span>
        </OuterShellButton>
      </div>
    </div>
  )
}

// ─── Bottom Defib Strip ───────────────────────────────────────────────────────

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
  // Number labels for orientation
  const buttonNumbers = ['1', '2', '3']

  return (
    <div className="shrink-0 bg-[#9ca3af] border-t border-[#8b9099] px-4 py-2">
      {/* Number labels */}
      <div className="flex flex-row mb-1 pl-[calc(36px+8px)]">
        {buttonNumbers.map((n) => (
          <div key={n} className="flex-1 text-center text-[10px] font-mono text-[#cc1111] font-bold">
            {n}
          </div>
        ))}
        {/* spacer for shock button */}
        <div className="w-16" />
      </div>

      <div className="flex flex-row items-stretch gap-2">
        {/* PACER placeholder (narrow) */}
        <div className="shrink-0 flex items-center justify-center" style={{ width: '36px' }}>
          <button
            type="button"
            aria-label="Pacer"
            disabled
            className="w-full h-full rounded-full bg-[#169c7c] border-2 border-[#0f7560] text-white font-mono font-bold text-[8px] opacity-70 cursor-default flex items-center justify-center"
          >
            PACER
          </button>
        </div>

        {/* ANALYZE */}
        <DefibButton
          label="ANALYZE"
          ariaLabel="Analyze rhythm"
          onClick={onAnalyse}
          disabled={!canAnalyse}
          active={defibState === 'analysing'}
          progress={defibState === 'analysing' ? progress : undefined}
        />

        {/* ENERGY SELECT */}
        <div
          className={cn(
            'relative flex flex-col items-center justify-center',
            'flex-1 bg-[#c8893a] border border-[#9a6820] rounded',
            'text-white font-mono font-bold',
            !canAdjustEnergy && 'opacity-40',
          )}
        >
          <span className="text-[8px] uppercase tracking-wider mb-0.5">Energy</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Decrease energy"
              onClick={onEnergyDown}
              disabled={!canAdjustEnergy}
              className="px-1.5 text-sm hover:bg-[#b87830] rounded disabled:cursor-default"
            >
              ▼
            </button>
            <span className="text-sm tabular-nums font-bold min-w-[3ch] text-center">
              {energy}
            </span>
            <button
              type="button"
              aria-label="Increase energy"
              onClick={onEnergyUp}
              disabled={!canAdjustEnergy}
              className="px-1.5 text-sm hover:bg-[#b87830] rounded disabled:cursor-default"
            >
              ▲
            </button>
          </div>
          <span className="text-[8px] mt-0.5">J SELECT</span>
        </div>

        {/* CHARGE */}
        <DefibButton
          label="CHARGE"
          ariaLabel="Charge defibrillator"
          onClick={onCharge}
          disabled={!canCharge}
          active={defibState === 'charging'}
          progress={defibState === 'charging' ? progress : undefined}
        />

        {/* SHOCK — large round red button */}
        <button
          type="button"
          aria-label="Shock"
          onClick={onShock}
          disabled={!canShock}
          className={cn(
            'shrink-0 flex flex-col items-center justify-center',
            'w-16 rounded-full border-4',
            'bg-[#cc1111] border-[#990000] text-white font-bold',
            'hover:bg-[#dd2222] active:bg-[#aa0000] transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-red-300',
            defibState === 'charged' && 'animate-pulse bg-[#ff2020] border-[#cc0000]',
            !canShock && 'opacity-40 cursor-default hover:bg-[#cc1111] active:bg-[#cc1111]',
          )}
        >
          <span className="text-xl leading-none">⚡</span>
          <span className="text-[9px] font-mono uppercase mt-0.5 tracking-wide">SHOCK</span>
        </button>
      </div>

      {/* "SHOCK" label above the red button area */}
      <div className="flex justify-end mt-1 pr-0.5">
        <span className="text-[10px] font-mono font-bold text-[#cc1111] tracking-widest uppercase">
          SHOCK
        </span>
      </div>
    </div>
  )
}
