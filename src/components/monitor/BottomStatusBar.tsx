'use client'

import type { PatientMode } from '@/types/vitals'

type BottomStatusBarProps = {
  patientMode: PatientMode
  joules: number
  shockCount: number
}

const MODE_LABEL: Record<PatientMode, string> = {
  adult: 'Adulte',
  pediatric: 'Pédiatrique',
  neonate: 'Néonatal',
}

export function BottomStatusBar({ patientMode, joules, shockCount }: BottomStatusBarProps) {
  return (
    <div className="h-full w-full flex items-center gap-6 px-4 font-mono text-sm border-t border-neutral-800 bg-bottom-bar">
      <span className="text-neutral-200">Mode {MODE_LABEL[patientMode]}</span>
      <span className="text-neutral-400">|</span>
      <span className="text-neutral-200">{joules} J Sélectionné</span>
      <span className="text-neutral-400">|</span>
      <span className="text-alarm-red" aria-label="shock">
        ⚡
      </span>
      <span className="tabular-nums text-neutral-200">{shockCount}</span>
    </div>
  )
}
