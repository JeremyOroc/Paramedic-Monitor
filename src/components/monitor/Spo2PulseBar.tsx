'use client'

import { useEffect, useState } from 'react'

import { getSpo2Waveform } from '@/lib/ecg/rhythms'
import { cn } from '@/lib/utils'
import type { Spo2Waveform } from '@/types/vitals'

const MIN_PULSE_HR = 20
const FILL_CLASS_BY_STEP = [
  'h-0',
  'h-1',
  'h-2',
  'h-3',
  'h-4',
  'h-5',
  'h-6',
  'h-7',
  'h-full',
] as const

export function getSpo2PulseCycleMs(
  hr: number,
  spo2: number,
  spo2Waveform: Spo2Waveform,
): number {
  const waveform = getSpo2Waveform(spo2Waveform, spo2)
  if (waveform.cycleMs !== null) return waveform.cycleMs
  const safeHr = Number.isFinite(hr) ? Math.max(MIN_PULSE_HR, hr) : MIN_PULSE_HR
  return 60000 / safeHr
}

function sampleWaveform(data: Float32Array, phase: number): number {
  if (data.length === 0) return 0
  const idx = Math.min(data.length - 1, Math.floor(phase * data.length))
  return data[idx] ?? 0
}

export function getSpo2PulseFillStep(
  elapsedMs: number,
  cycleMs: number,
  data: Float32Array,
): number {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(cycleMs) || cycleMs <= 0) return 0
  if (data.length === 0) return 0
  const phase = ((elapsedMs % cycleMs) + cycleMs) % cycleMs / cycleMs
  const maxStep = FILL_CLASS_BY_STEP.length - 1
  let min = Infinity
  let max = -Infinity
  for (const value of data) {
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0

  const normalized = (sampleWaveform(data, phase) - min) / (max - min)
  const clamped = Math.min(1, Math.max(0, normalized))
  return Math.round(clamped * maxStep)
}

type Spo2PulseBarProps = {
  hr: number
  spo2: number
  spo2Waveform: Spo2Waveform
  className?: string
}

export function Spo2PulseBar({ hr, spo2, spo2Waveform, className }: Spo2PulseBarProps) {
  const [fillStep, setFillStep] = useState(0)

  useEffect(() => {
    const waveform = getSpo2Waveform(spo2Waveform, spo2)
    const cycleMs = getSpo2PulseCycleMs(hr, spo2, spo2Waveform)
    let start = 0
    let rafId = 0

    const tick = (now: number) => {
      if (start === 0) start = now
      setFillStep(getSpo2PulseFillStep(now - start, cycleMs, waveform.data))
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [hr, spo2, spo2Waveform])

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex h-8 w-2.5 shrink-0 items-end border border-yellow-spo2 bg-black p-px',
        className,
      )}
      data-testid="spo2-pulse-bar"
      data-heart-rate={hr}
    >
      <div
        className={cn('w-full bg-yellow-spo2', FILL_CLASS_BY_STEP[fillStep])}
        data-fill-step={fillStep}
        data-testid="spo2-pulse-fill"
      />
    </div>
  )
}
