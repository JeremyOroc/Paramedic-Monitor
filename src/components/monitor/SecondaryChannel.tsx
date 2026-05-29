'use client'

import { useEffect, useRef } from 'react'
import { startRenderer } from '@/lib/ecg/renderer'
import {
  ETCO2_SWEEP_MS,
  RESP_CYCLE_MS,
  SPO2_SWEEP_MS,
  getEtco2Waveform,
  getSpo2Waveform,
} from '@/lib/ecg/rhythms'
import { COLORS, cn } from '@/lib/utils'
import type { Etco2Waveform, Spo2Waveform } from '@/types/vitals'

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
}: SecondaryChannelProps) {
  const isEtco2 = channel === 'etco2'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const channelRef = useRef(channel)
  const hrRef = useRef(hr)
  const spoNumRef = useRef(spo2)
  const etcoNumRef = useRef(etco2)
  const spoShapeRef = useRef(spo2Waveform)
  const etcoShapeRef = useRef(etco2Waveform)

  useEffect(() => {
    channelRef.current = channel
    hrRef.current = hr
    spoNumRef.current = spo2
    etcoNumRef.current = etco2
    spoShapeRef.current = spo2Waveform
    etcoShapeRef.current = etco2Waveform
  })

  useEffect(() => {
    if (!canvasRef.current) return
    const pick = () =>
      channelRef.current === 'etco2'
        ? getEtco2Waveform(etcoShapeRef.current, etcoNumRef.current)
        : getSpo2Waveform(spoShapeRef.current, spoNumRef.current)
    return startRenderer({
      canvas: canvasRef.current,
      color: isEtco2 ? COLORS.purpleEtCO2 : COLORS.yellowSpO2,
      sweepMs: isEtco2 ? ETCO2_SWEEP_MS : SPO2_SWEEP_MS,
      amplitude: isEtco2 ? 0.95 : 0.85,
      fillStyle: isEtco2 ? 'area' : 'line',
      ampJitter: isEtco2 ? 0.05 : 0.07,
      cycleJitter: isEtco2 ? 0.06 : 0.03,
      getWaveform: pick,
      getCycleMs: () => {
        const def = pick()
        if (channelRef.current === 'etco2') return def.cycleMs ?? RESP_CYCLE_MS
        return def.cycleMs ?? 60000 / Math.max(20, hrRef.current)
      },
    })
  }, [isEtco2])

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
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
