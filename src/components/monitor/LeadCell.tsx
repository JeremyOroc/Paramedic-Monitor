'use client'

import { useEffect, useRef } from 'react'
import { startRenderer } from '@/lib/ecg/renderer'
import { ECG_SWEEP_MS, getLeadWaveform, type LeadName } from '@/lib/ecg/rhythms'
import { COLORS, cn } from '@/lib/utils'
import type { Rhythm } from '@/types/vitals'

type LeadCellProps = {
  label: LeadName
  rhythm: Rhythm
  hr: number
  className?: string
}

export function LeadCell({ label, rhythm, hr, className }: LeadCellProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rhythmRef = useRef(rhythm)
  const hrRef = useRef(hr)

  useEffect(() => {
    rhythmRef.current = rhythm
    hrRef.current = hr
  })

  useEffect(() => {
    if (!canvasRef.current) return
    const pick = () => getLeadWaveform(rhythmRef.current, label)
    return startRenderer({
      canvas: canvasRef.current,
      color: COLORS.ecgGreen,
      sweepMs: ECG_SWEEP_MS,
      amplitude: 0.55,
      lineWidth: 1.5,
      ampJitter: 0.06,
      cycleJitter: 0.03,
      getWaveform: pick,
      getCycleMs: () => pick().cycleMs ?? 60000 / Math.max(20, hrRef.current),
    })
  }, [label])

  return (
    <div
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
