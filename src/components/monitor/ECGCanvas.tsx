'use client'

import { useEffect, useRef } from 'react'
import { startRenderer } from '@/lib/ecg/renderer'
import { ECG_SWEEP_MS, getEcgRhythm } from '@/lib/ecg/rhythms'
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
    const pick = () => getEcgRhythm(rhythmRef.current)
    return startRenderer({
      canvas: canvasRef.current,
      color: COLORS.ecgGreen,
      sweepMs: ECG_SWEEP_MS,
      ampJitter: 0.14,
      cycleJitter: 0.07,
      getWaveform: pick,
      getCycleMs: () => pick().cycleMs ?? 60000 / Math.max(20, hrRef.current),
    })
  }, [])

  return <canvas ref={canvasRef} className={cn('block h-full w-full', className)} />
}
