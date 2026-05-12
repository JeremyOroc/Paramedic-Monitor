'use client'

import { useEffect, useRef } from 'react'
import { startRenderer } from '@/lib/ecg/renderer'
import { ECG_RHYTHMS, ECG_SWEEP_MS } from '@/lib/ecg/rhythms'
import { COLORS, cn } from '@/lib/utils'
import type { Rhythm } from '@/types/vitals'

type ECGCanvasProps = {
  rhythm: Rhythm
  hr: number
  className?: string
}

export function ECGCanvas({ rhythm, hr, className }: ECGCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rhythmRef = useRef(rhythm)
  const hrRef = useRef(hr)

  useEffect(() => {
    rhythmRef.current = rhythm
    hrRef.current = hr
  })

  useEffect(() => {
    if (!canvasRef.current) return
    const pick = () => ECG_RHYTHMS[rhythmRef.current] ?? ECG_RHYTHMS.nsr
    return startRenderer({
      canvas: canvasRef.current,
      color: COLORS.ecgGreen,
      sweepMs: ECG_SWEEP_MS,
      ampJitter: 0.08,
      cycleJitter: 0.04,
      getWaveform: pick,
      getCycleMs: () => pick().cycleMs ?? 60000 / Math.max(20, hrRef.current),
    })
  }, [])

  return <canvas ref={canvasRef} className={cn('block h-full w-full', className)} />
}
