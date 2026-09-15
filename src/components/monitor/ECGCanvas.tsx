'use client'

import {
  CPR_COMPRESSION_WAVEFORM,
  ECG_RHYTHMS,
  ECG_SWEEP_MS,
  getCprCompressionCycleMs,
  getEcgRhythm,
} from '@/lib/ecg/rhythms'
import { useWaveformRenderer } from '@/hooks/useWaveformRenderer'
import { getTorsadesPacketDurationMs } from '@/lib/automaticHeartRate'
import { COLORS, WAGAMI_A_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Rhythm } from '@/types/vitals'
import { DisconnectedWaveform } from './DisconnectedWaveform'

type ECGCanvasProps = {
  rhythm: Rhythm
  hr: number
  connected?: boolean
  cprOverride?: boolean
  className?: string
  occluded?: boolean
  onReady?: () => void
  palette?: 'wagamiX' | 'wagamiA'
}

function LiveECGCanvas({
  rhythm,
  hr,
  cprOverride = false,
  className,
  occluded = false,
  onReady,
  palette = 'wagamiX',
}: Omit<ECGCanvasProps, 'connected'>) {
  const color = palette === 'wagamiA' ? WAGAMI_A_COLORS.ecg : COLORS.ecgGreen
  const canvasRef = useWaveformRenderer(
    { rhythm, hr, cprOverride },
    (get) => ({
      color,
      background: palette === 'wagamiA' ? WAGAMI_A_COLORS.screen : COLORS.bg,
      sweepMs: ECG_SWEEP_MS,
      synchronizeSweep: true,
      ampJitter: 0.05,
      cycleJitter: 0.03,
      getWaveform: () =>
        get().cprOverride ? CPR_COMPRESSION_WAVEFORM : getEcgRhythm(get().rhythm),
      getSignalKey: () => (get().cprOverride ? 'cpr-compression' : get().rhythm),
      getCycleMs: () => {
        if (get().cprOverride) return getCprCompressionCycleMs(get().hr)
        if (get().rhythm === 'torsades') return getTorsadesPacketDurationMs(get().hr)
        return ECG_RHYTHMS[get().rhythm].cycleMs ?? 60000 / Math.max(20, get().hr)
      },
    }),
    [color],
    { occluded, onReady },
  )

  return (
    <canvas
      ref={canvasRef}
      data-testid={cprOverride ? 'cpr-ecg-canvas' : 'live-ecg-canvas'}
      data-rhythm={rhythm}
      data-cpr-override={cprOverride ? 'true' : 'false'}
      data-heart-rate={hr}
      data-palette={palette}
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
  occluded = false,
  onReady,
  palette = 'wagamiX',
}: ECGCanvasProps) {
  if (!connected && !cprOverride) {
    if (palette === 'wagamiA') {
      return (
        <div data-testid="disconnected-waveform" data-channel="ecg" className={cn('grid h-full w-full place-items-center bg-wagami-a-screen', className)}>
          <span className="w-[94%] border-t-2 border-dashed border-wagami-a-ecg/60" />
        </div>
      )
    }
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
      occluded={occluded}
      onReady={onReady}
      palette={palette}
    />
  )
}
