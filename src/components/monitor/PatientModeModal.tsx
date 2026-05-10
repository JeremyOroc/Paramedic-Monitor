'use client'

import { useEffect } from 'react'
import type { PatientMode } from '@/types/vitals'
import { cn } from '@/lib/utils'

type PatientModeModalProps = {
  open: boolean
  current: PatientMode
  onSelect: (mode: PatientMode) => void
  onClose: () => void
}

const OPTIONS: ReadonlyArray<{ value: PatientMode; label: string }> = [
  { value: 'adult', label: 'Adulte' },
  { value: 'pediatric', label: 'Pédiatrique' },
  { value: 'neonate', label: 'Néonatal' },
]

export function PatientModeModal({ open, current, onSelect, onClose }: PatientModeModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mode patient"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative w-72 bg-neutral-900 border border-cyan-bp text-white font-mono shadow-xl">
        <div className="px-3 py-2 border-b border-neutral-700 text-cyan-bp text-sm uppercase tracking-wider">
          Mode patient
        </div>
        <ul role="listbox" className="py-1">
          {OPTIONS.map((opt) => {
            const selected = opt.value === current
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onSelect(opt.value)}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm',
                    'hover:bg-cyan-900/40',
                    selected && 'bg-cyan-bp text-black font-bold',
                  )}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
