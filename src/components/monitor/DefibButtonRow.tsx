'use client'

import type { ReactNode } from 'react'
import type { DefibState } from '@/hooks/useDefibSequence'
import { cn } from '@/lib/utils'

type DefibButtonRowProps = {
  state: DefibState
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

export function DefibButtonRow({
  state,
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
}: DefibButtonRowProps) {
  return (
    <div className="h-full w-full grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 px-1 py-1 bg-bottom-bar">
      <DefibButton
        label="ANALYSE"
        onClick={onAnalyse}
        disabled={!canAnalyse}
        active={state.startsWith('analyzing')}
      />
      <div className="flex flex-col items-center justify-center bg-orange-700/80 text-white border border-orange-900">
        <div className="text-[10px] font-mono uppercase tracking-wider">Énergie</div>
        <div className="flex items-center gap-2 mt-0.5">
          <button
            type="button"
            onClick={onEnergyDown}
            disabled={!canAdjustEnergy}
            aria-label="Decrease energy"
            className="px-2 text-lg font-bold hover:bg-orange-600/60 disabled:opacity-40"
          >
            ▼
          </button>
          <span className="font-mono font-bold tabular-nums text-lg">{energy} J</span>
          <button
            type="button"
            onClick={onEnergyUp}
            disabled={!canAdjustEnergy}
            aria-label="Increase energy"
            className="px-2 text-lg font-bold hover:bg-orange-600/60 disabled:opacity-40"
          >
            ▲
          </button>
        </div>
      </div>
      <DefibButton
        label="CHARGE"
        onClick={onCharge}
        disabled={!canCharge}
        active={state === 'charging'}
      />
      <ShockButton
        onClick={onShock}
        disabled={!canShock}
        ready={state === 'charged'}
      />
    </div>
  )
}

function DefibButton({
  label,
  onClick,
  disabled,
  active,
}: {
  label: ReactNode
  onClick: () => void
  disabled: boolean
  active: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex flex-col items-center justify-center',
        'bg-orange-700/80 text-white border border-orange-900',
        'font-mono font-bold uppercase tracking-wider',
        'hover:bg-orange-600 transition-colors',
        'disabled:cursor-not-allowed disabled:hover:bg-orange-700/80',
        active && 'bg-orange-500',
      )}
    >
      <span className="text-sm">{label}</span>
    </button>
  )
}

function ShockButton({
  onClick,
  disabled,
  ready,
}: {
  onClick: () => void
  disabled: boolean
  ready: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Shock"
      className={cn(
        'flex items-center justify-center',
        'bg-red-700 text-white border border-red-900',
        'font-mono font-bold uppercase tracking-wider text-sm',
        'hover:bg-red-600 transition-colors',
        'disabled:cursor-not-allowed disabled:hover:bg-red-700',
        ready && 'bg-[#ffea00] text-[#ff2020] animate-pulse border-[#ff2020]',
      )}
    >
      <span className="mr-2">⚡</span>
      CHOC
    </button>
  )
}
