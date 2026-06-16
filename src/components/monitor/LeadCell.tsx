'use client'

import { ECG_SWEEP_MS, getLeadWaveform, type LeadName } from '@/lib/ecg/rhythms'
import { useWaveformRenderer } from '@/hooks/useWaveformRenderer'
import { COLORS, cn } from '@/lib/utils'
import type { Rhythm } from '@/types/vitals'

type LeadCellProps = {
  label: LeadName
  rhythm: Rhythm
  hr: number
  className?: string
}

export function LeadCell({ label, rhythm, hr, className }: LeadCellProps) {
  const canvasRef = useWaveformRenderer(
    { rhythm, hr },
    (get) => {
      const pick = () => getLeadWaveform(get().rhythm, label)
      return {
        color: COLORS.ecgGreen,
        sweepMs: ECG_SWEEP_MS,
        amplitude: 0.55,
        lineWidth: 1.5,
        ampJitter: 0.06,
        cycleJitter: 0.03,
        getWaveform: pick,
        getSignalKey: () => `${get().rhythm}:${label}`,
        getCycleMs: () => pick().cycleMs ?? 60000 / Math.max(20, get().hr),
      }
    },
    [label],
  )

  return (
    <div
      data-testid={`lead-cell-${label}`}
      data-rhythm={rhythm}
      className={cn(
        'relative border border-neutral-800 bg-black overflow-hidden',
        className,
      )}
    >
      <span
        className="absolute top-1 left-2 text-xs font-mono font-bold text-ecg-green z-10"
        style={{ textShadow: '0 0 2px black' }}
      >
        {label}
      </span>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
