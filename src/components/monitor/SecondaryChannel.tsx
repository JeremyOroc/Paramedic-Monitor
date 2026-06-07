'use client'

import {
  ETCO2_SWEEP_MS,
  RESP_CYCLE_MS,
  SPO2_SWEEP_MS,
  getEtco2Waveform,
  getSpo2Waveform,
} from '@/lib/ecg/rhythms'
import { useWaveformRenderer } from '@/hooks/useWaveformRenderer'
import { COLORS, cn } from '@/lib/utils'
import type { Etco2Waveform, Spo2Waveform } from '@/types/vitals'
import { DisconnectedWaveform } from './DisconnectedWaveform'

type SecondaryChannelProps = {
  channel: 'spo2' | 'etco2'
  hr: number
  spo2: number
  etco2: number
  spo2Waveform: Spo2Waveform
  etco2Waveform: Etco2Waveform
  className?: string
  selectedLabel?: boolean
  selectedScale?: boolean
  connected?: boolean
}

function LiveSecondaryCanvas({
  channel,
  hr,
  spo2,
  etco2,
  spo2Waveform,
  etco2Waveform,
}: Pick<
  SecondaryChannelProps,
  'channel' | 'hr' | 'spo2' | 'etco2' | 'spo2Waveform' | 'etco2Waveform'
>) {
  const isEtco2 = channel === 'etco2'
  const canvasRef = useWaveformRenderer(
    { channel, hr, spo2, etco2, spo2Waveform, etco2Waveform },
    (get) => {
      const pick = () =>
        get().channel === 'etco2'
          ? getEtco2Waveform(get().etco2Waveform, get().etco2)
          : getSpo2Waveform(get().spo2Waveform, get().spo2)
      return {
        color: isEtco2 ? COLORS.purpleEtCO2 : COLORS.yellowSpO2,
        sweepMs: isEtco2 ? ETCO2_SWEEP_MS : SPO2_SWEEP_MS,
        amplitude: isEtco2 ? 0.95 : 0.85,
        fillStyle: isEtco2 ? 'area' : 'line',
        ampJitter: isEtco2 ? 0.05 : 0.07,
        cycleJitter: isEtco2 ? 0.06 : 0.03,
        getWaveform: pick,
        getSignalKey: () =>
          get().channel === 'etco2'
            ? `${get().channel}:${get().etco2Waveform}`
            : `${get().channel}:${get().spo2Waveform}`,
        getCycleMs: () => {
          const def = pick()
          if (get().channel === 'etco2') return def.cycleMs ?? RESP_CYCLE_MS
          return def.cycleMs ?? 60000 / Math.max(20, get().hr)
        },
      }
    },
    [isEtco2],
  )

  return <canvas ref={canvasRef} className="block h-full w-full" />
}

export function SecondaryChannel({
  channel,
  hr,
  spo2,
  etco2,
  spo2Waveform,
  etco2Waveform,
  className,
  selectedLabel = false,
  selectedScale = false,
  connected = true,
}: SecondaryChannelProps) {
  const isEtco2 = channel === 'etco2'

  return (
    <div className={cn('relative h-full w-full', className)}>
      <div
        className={cn(
          'absolute top-1 left-2 z-10 flex items-center gap-20 text-xs font-mono font-bold',
          isEtco2 ? 'text-purple-etco2' : 'text-yellow-spo2',
        )}
      >
        <span className={cn('px-1 py-0.5', selectedLabel && 'bg-[var(--color-selection-blue)] text-white')}>
          {isEtco2 ? 'EtCO2' : 'SpO2'}
        </span>
        <span className={cn('px-1 py-0.5', selectedScale && 'bg-[var(--color-selection-blue)] text-white')}>
          {isEtco2 ? '0 to 60 mmHg' : '1x'}
        </span>
      </div>
      {isEtco2 && (
        <div className="absolute right-2 top-1 bottom-1 flex flex-col justify-between text-[10px] font-mono text-purple-etco2 z-10">
          <span>150</span>
          <span>75</span>
          <span>0</span>
        </div>
      )}
      {connected ? (
        <LiveSecondaryCanvas
          channel={channel}
          hr={hr}
          spo2={spo2}
          etco2={etco2}
          spo2Waveform={spo2Waveform}
          etco2Waveform={etco2Waveform}
        />
      ) : (
        <DisconnectedWaveform
          channel={channel}
          color={isEtco2 ? COLORS.purpleEtCO2 : COLORS.yellowSpO2}
        />
      )}
    </div>
  )
}
