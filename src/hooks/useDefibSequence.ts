'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { JOULE_DEFAULTS, type PatientMode } from '@/types/vitals'

export type DefibState = 'idle' | 'analysing' | 'analysed' | 'charging' | 'charged'

const ANALYSE_DURATION_MS = 5000
const CHARGE_DURATION_MS = 3000
const ENERGY_STEP = 10

type Options = {
  patientMode: PatientMode
  /** Override timing in tests. */
  analyseDurationMs?: number
  chargeDurationMs?: number
}

export function useDefibSequence({
  patientMode,
  analyseDurationMs = ANALYSE_DURATION_MS,
  chargeDurationMs = CHARGE_DURATION_MS,
}: Options) {
  const [state, setState] = useState<DefibState>('idle')
  const [energy, setEnergy] = useState<number>(JOULE_DEFAULTS[patientMode])
  const [shockCount, setShockCount] = useState(0)
  const [progress, setProgress] = useState(0)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const durationRef = useRef<number>(0)

  useEffect(() => {
    setEnergy(JOULE_DEFAULTS[patientMode])
  }, [patientMode])

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const tickProgress = useCallback(() => {
    const elapsed = Date.now() - startedAtRef.current
    const ratio = Math.min(1, elapsed / durationRef.current)
    setProgress(ratio)
    if (ratio < 1) {
      rafRef.current = requestAnimationFrame(tickProgress)
    }
  }, [])

  const runTimedPhase = useCallback(
    (durationMs: number, onComplete: () => void) => {
      clearTimers()
      startedAtRef.current = Date.now()
      durationRef.current = durationMs
      setProgress(0)
      rafRef.current = requestAnimationFrame(tickProgress)
      timerRef.current = setTimeout(() => {
        clearTimers()
        setProgress(1)
        onComplete()
      }, durationMs)
    },
    [clearTimers, tickProgress],
  )

  const onAnalyse = useCallback(() => {
    if (state !== 'idle') return
    setState('analysing')
    runTimedPhase(analyseDurationMs, () => setState('analysed'))
  }, [state, analyseDurationMs, runTimedPhase])

  const onCharge = useCallback(() => {
    if (state !== 'analysed' && state !== 'idle') return
    setState('charging')
    runTimedPhase(chargeDurationMs, () => setState('charged'))
  }, [state, chargeDurationMs, runTimedPhase])

  const onShock = useCallback(() => {
    if (state !== 'charged') return
    setShockCount((n) => n + 1)
    setState('idle')
    setProgress(0)
  }, [state])

  const onEnergyUp = useCallback(() => {
    if (state === 'analysing' || state === 'charging') return
    setEnergy((e) => e + ENERGY_STEP)
  }, [state])

  const onEnergyDown = useCallback(() => {
    if (state === 'analysing' || state === 'charging') return
    setEnergy((e) => Math.max(ENERGY_STEP, e - ENERGY_STEP))
  }, [state])

  const canAnalyse = state === 'idle'
  const canCharge = state === 'analysed' || state === 'idle'
  const canShock = state === 'charged'
  const canAdjustEnergy = state !== 'analysing' && state !== 'charging'

  return {
    state,
    energy,
    shockCount,
    progress,
    canAnalyse,
    canCharge,
    canShock,
    canAdjustEnergy,
    onAnalyse,
    onCharge,
    onShock,
    onEnergyUp,
    onEnergyDown,
  }
}
