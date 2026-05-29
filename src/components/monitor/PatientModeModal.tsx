'use client'

import type { PatientMode } from '@/types/vitals'
import { cn } from '@/lib/utils'

type PatientModeModalProps = {
  open: boolean
  current: PatientMode
  highlighted: PatientMode
  onSelect: (mode: PatientMode) => void
  onClose: () => void
}

export const PATIENT_MODE_OPTIONS: ReadonlyArray<{ value: PatientMode; label: string }> = [
  { value: 'adult', label: 'Adulte' },
  { value: 'pediatric', label: 'Pédiatrique' },
  { value: 'neonate', label: 'Néonatal' },
]

export function PatientModeModal({ open, current, highlighted, onSelect, onClose }: PatientModeModalProps) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mode patient"
      className="absolute inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop — visual dim only, no interaction */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-72 bg-neutral-900 border border-cyan-bp text-white font-mono shadow-xl">
        <div className="px-3 py-2 border-b border-neutral-700 text-cyan-bp text-sm uppercase tracking-wider">
          Mode patient
        </div>
        <ul role="listbox" className="py-1">
          {PATIENT_MODE_OPTIONS.map((opt) => {
            const isCurrent = opt.value === current
            const isHighlighted = opt.value === highlighted
            return (
              <li key={opt.value}>
                <div
                  role="option"
                  aria-selected={isCurrent}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm flex items-center justify-between',
                    isHighlighted && 'bg-[var(--color-selection-blue)] text-white',
                    !isHighlighted && isCurrent && 'bg-cyan-bp text-black font-bold',
                  )}
                >
                  <span>{opt.label}</span>
                  {isCurrent && <span className="text-xs opacity-70">✓</span>}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
