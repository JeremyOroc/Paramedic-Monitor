'use client'

import type { PatientMode } from '@/types/vitals'
import type { MonitorSelection } from '@/types/monitorSelection'
import { cn } from '@/lib/utils'

type TopStatusBarProps = {
  date: string
  time: string
  patientMode: PatientMode
  patientModeActive?: boolean
  batteryPercent: number
  sessionTimer: string
  selected?: MonitorSelection
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
  batteryPercent,
  sessionTimer,
  selected,
}: TopStatusBarProps) {
  return (
    <div className="h-full w-full flex items-center justify-between px-3 bg-black border-b border-neutral-800 font-mono text-xs text-neutral-300">
      <div className="flex items-center gap-4">
        <span
          aria-label="Date and time"
          className={cn(
            'flex items-center gap-4 px-1 py-0.5',
            selected === 'dateTime' && 'bg-[var(--color-selection-blue)] text-white',
          )}
        >
          <span>{date}</span>
          <span>{time}</span>
        </span>
        <div className="flex items-center gap-3">
          <span
            aria-label="Patient mode"
            className={cn(
              'px-2 py-0.5 font-bold',
              selected === 'patientMode' ? 'bg-[var(--color-selection-blue)] text-white' : '',
              patientModeActive && 'ring-1 ring-white',
            )}
          >
            {MODE_LABEL[patientMode]}
          </span>
          <span
            aria-label="Beacon"
            className={cn(
              'grid h-5 w-5 place-items-center px-0.5',
              selected === 'beacon' && 'bg-[var(--color-selection-blue)] text-white',
            )}
          >
            <BeaconIcon />
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <BatteryIndicator percent={batteryPercent} selected={selected === 'battery'} />
        <span className="text-ecg-green">{sessionTimer}</span>
      </div>
    </div>
  )
}

function BeaconIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
      <path
        d="M12 20V9M8.5 9a3.5 3.5 0 0 1 7 0M5.5 8.5a6.5 6.5 0 0 1 13 0M10 20h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="9" r="1.4" fill="currentColor" />
    </svg>
  )
}

function BatteryIndicator({ percent, selected = false }: { percent: number; selected?: boolean }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div
      className={cn(
        'flex items-center gap-1 px-1 py-0.5',
        selected && 'bg-[var(--color-selection-blue)] text-white',
      )}
      aria-label={`Battery ${clamped}%`}
    >
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
