'use client'

import type { PatientMode } from '@/types/vitals'
import { cn } from '@/lib/utils'

type TopStatusBarProps = {
  date: string
  time: string
  patientMode: PatientMode
  patientModeActive?: boolean
  onPatientModeClick?: () => void
  batteryPercent: number
  sessionTimer: string
}

const MODE_LABEL: Record<PatientMode, string> = {
  adult: 'Adulte',
  pediatric: 'Pédiatrique',
  neonate: 'Néonatal',
}

export function TopStatusBar({
  date,
  time,
  patientMode,
  patientModeActive = false,
  onPatientModeClick,
  batteryPercent,
  sessionTimer,
}: TopStatusBarProps) {
  return (
    <div className="h-full w-full flex items-center justify-between px-3 bg-black border-b border-neutral-800 font-mono text-xs text-neutral-300">
      <div className="flex items-center gap-4">
        <span>{date}</span>
        <span>{time}</span>
        <button
          type="button"
          onClick={onPatientModeClick}
          aria-label="Patient mode"
          aria-pressed={patientModeActive}
          className={cn(
            'px-2 py-0.5 transition-[filter,box-shadow] font-bold',
            'bg-cyan-bp text-black',
            'hover:brightness-110',
            patientModeActive && 'ring-1 ring-white',
          )}
        >
          {MODE_LABEL[patientMode]}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <BatteryIndicator percent={batteryPercent} />
        <span className="text-ecg-green">{sessionTimer}</span>
      </div>
    </div>
  )
}

function BatteryIndicator({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="flex items-center gap-1" aria-label={`Battery ${clamped}%`}>
      <div className="relative h-3 w-8 border border-neutral-400">
        <div
          className="absolute inset-y-0 left-0 bg-ecg-green"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="h-2 w-0.5 bg-neutral-400" />
    </div>
  )
}
