'use client'

import type { ReactNode } from 'react'
import type { DefibState } from '@/hooks/useDefibSequence'
import { ProgressBar } from '@/components/shared/ProgressBar'
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
}: DefibButtonRowProps) {
  return (
    <div className="h-full w-full grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 px-1 py-1 bg-bottom-bar">
      <DefibButton
        label="ANALYSE"
        onClick={onAnalyse}
        disabled={!canAnalyse}
        active={state === 'analysing'}
        progress={state === 'analysing' ? progress : undefined}
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
        progress={state === 'charging' ? progress : undefined}
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
  progress,
}: {
  label: ReactNode
  onClick: () => void
  disabled: boolean
  active: boolean
  progress?: number
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
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-orange-700/80',
        active && 'bg-orange-500',
      )}
    >
      <span className="text-sm">{label}</span>
      {typeof progress === 'number' && (
        <div className="absolute inset-x-1 bottom-1">
          <ProgressBar progress={progress} fillClassName="bg-yellow-spo2" />
        </div>
      )}
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
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-700',
        ready && 'bg-alarm-red animate-pulse',
      )}
    >
      <span className="mr-2">⚡</span>
      CHOC
    </button>
  )
}
