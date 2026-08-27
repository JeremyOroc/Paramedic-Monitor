'use client'

import {
  CPR_COMPRESSION_WAVEFORM,
  ECG_RHYTHMS,
  ECG_SWEEP_MS,
  getCprCompressionCycleMs,
  getEcgRhythm,
} from '@/lib/ecg/rhythms'
import { useWaveformRenderer } from '@/hooks/useWaveformRenderer'
import { COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Rhythm } from '@/types/vitals'
import { DisconnectedWaveform } from './DisconnectedWaveform'

type ECGCanvasProps = {
  rhythm: Rhythm
  hr: number
  connected?: boolean
  cprOverride?: boolean
  className?: string
}

function LiveECGCanvas({
  rhythm,
  hr,
  cprOverride = false,
  className,
}: Omit<ECGCanvasProps, 'connected'>) {
  const canvasRef = useWaveformRenderer(
    { rhythm, hr, cprOverride },
    (get) => ({
      color: COLORS.ecgGreen,
      sweepMs: ECG_SWEEP_MS,
      synchronizeSweep: true,
      ampJitter: 0.05,
      cycleJitter: 0.03,
      getWaveform: () =>
        get().cprOverride ? CPR_COMPRESSION_WAVEFORM : getEcgRhythm(get().rhythm),
      getSignalKey: () => (get().cprOverride ? 'cpr-compression' : get().rhythm),
      getCycleMs: () => {
        if (get().cprOverride) return getCprCompressionCycleMs(get().hr)
        return ECG_RHYTHMS[get().rhythm].cycleMs ?? 60000 / Math.max(20, get().hr)
      },
    }),
    [],
  )

  return (
    <canvas
      ref={canvasRef}
      data-testid={cprOverride ? 'cpr-ecg-canvas' : 'live-ecg-canvas'}
      data-rhythm={rhythm}
      data-cpr-override={cprOverride ? 'true' : 'false'}
      data-heart-rate={hr}
      className={cn('block h-full w-full', className)}
    />
  )
}

export function ECGCanvas({
  rhythm,
  hr,
  connected = true,
  cprOverride = false,
  className,
}: ECGCanvasProps) {
  if (!connected && !cprOverride) {
    return (
      <DisconnectedWaveform
        channel="ecg"
        color={COLORS.ecgGreen}
        className={className}
      />
    )
  }

  return (
    <LiveECGCanvas
      rhythm={rhythm}
      hr={hr}
      cprOverride={cprOverride}
      className={className}
    />
  )
}
