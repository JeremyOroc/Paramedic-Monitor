'use client'

import { ECG_SWEEP_MS, getLeadWaveform, type LeadName } from '@/lib/ecg/rhythms'
import { useWaveformRenderer } from '@/hooks/useWaveformRenderer'
import { COLORS } from '@/lib/constants'
import { getTorsadesPacketDurationMs } from '@/lib/automaticHeartRate'
import type { BeatClock } from '@/lib/ecg/beatClock'
import { cn } from '@/lib/utils'
import type { Rhythm } from '@/types/vitals'

type LeadCellProps = {
  label: LeadName
  rhythm: Rhythm
  hr: number
  className?: string
  occluded?: boolean
  onReady?: () => void
  beatClock?: BeatClock
  readyOnStart?: boolean
  freshReveal?: boolean
  sequenceKey?: string | number
  hideLabel?: boolean
}

export function LeadCell({
  label,
  rhythm,
  hr,
  className,
  occluded = false,
  onReady,
  beatClock,
  readyOnStart = false,
  freshReveal = false,
  sequenceKey,
  hideLabel = false,
}: LeadCellProps) {
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
        cycleJitter: 0,
        synchronizeSweep: true,
        getWaveform: pick,
        getSignalKey: () => `${get().rhythm}:${label}:${get().hr}`,
        getCycleMs: () => beatClock && get().rhythm === 'torsades'
          ? getTorsadesPacketDurationMs(get().hr)
          : pick().cycleMs ?? 60000 / Math.max(20, get().hr),
        getPhaseAt: beatClock ? (nowMs, cycleMs) => beatClock.phase(nowMs, cycleMs) : undefined,
        readyOnStart,
        freshReveal,
      }
    },
    [label, beatClock, readyOnStart, freshReveal, sequenceKey],
    { occluded, onReady },
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
      {!hideLabel ? (
        <span className="absolute top-1 left-2 z-10 text-xs font-mono font-bold text-ecg-green drop-shadow-[0_0_2px_black]">
          {label}
        </span>
      ) : null}
      <canvas
        ref={canvasRef}
        data-testid={`lead-canvas-${label}`}
        data-fresh-reveal={freshReveal ? 'true' : 'false'}
        className="block h-full w-full"
      />
    </div>
  )
}
