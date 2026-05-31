'use client'

import { ECG_RHYTHMS, ECG_SWEEP_MS, getEcgRhythm } from '@/lib/ecg/rhythms'
import { useWaveformRenderer } from '@/hooks/useWaveformRenderer'
import { COLORS, cn } from '@/lib/utils'
import type { Rhythm } from '@/types/vitals'

type ECGCanvasProps = {
  rhythm: Rhythm
  hr: number
  className?: string
}

export function ECGCanvas({ rhythm, hr, className }: ECGCanvasProps) {
  const canvasRef = useWaveformRenderer(
    { rhythm, hr },
    (get) => ({
      color: COLORS.ecgGreen,
      sweepMs: ECG_SWEEP_MS,
      ampJitter: 0.05,
      cycleJitter: 0.03,
      getWaveform: () => getEcgRhythm(get().rhythm),
      getSignalKey: () => get().rhythm,
      getCycleMs: () =>
        ECG_RHYTHMS[get().rhythm].cycleMs ?? 60000 / Math.max(20, get().hr),
    }),
    [],
  )

  return <canvas ref={canvasRef} className={cn('block h-full w-full', className)} />
}
