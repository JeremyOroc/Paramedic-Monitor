'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { type PatientMode, type Rhythm } from '@/types/vitals'
import { playSystemAudio, playCprAudioSequence } from '@/lib/audio'
import {
  ANALYZE_CLEAR_MS,
  ANALYZE_ECG_MS,
  ANALYZE_RESULT_MS,
  CHARGE_DURATION_MS,
  type DefibState,
  type EnergyState,
  canAdjustEnergy as canAdjustEnergyIn,
  canAnalyse as canAnalyseIn,
  canCharge as canChargeIn,
  canShock as canShockIn,
  chargeTransition,
  defaultEnergy,
  energyDown,
  energyUp,
  isShockable,
  resolveEnergy,
  shockTransition,
} from '@/lib/defib/defibMachine'

export type { DefibState }

type Options = {
  patientMode: PatientMode
  rhythm: Rhythm
  onAnalyzeResult?: (result: 'shock' | 'no_shock') => void
}

export function useDefibSequence({
  patientMode,
  rhythm,
  onAnalyzeResult,
}: Options) {
  const [state, setState] = useState<DefibState>('idle')
  const [energyState, setEnergyState] = useState<EnergyState>(() => ({
    patientMode,
    energy: defaultEnergy(patientMode),
  }))
  const [shockCount, setShockCount] = useState(0)
  const [progress, setProgress] = useState(0)
  const [cprStartTime, setCprStartTime] = useState<number | null>(null)
  const [lastDeliveredJoules, setLastDeliveredJoules] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const durationRef = useRef<number>(0)
  // Capture rhythm at analyze time so mid-analyze changes don't affect the result
  const rhythmAtAnalyzeRef = useRef<Rhythm>(rhythm)
  // Always up-to-date callback ref — avoids stale closures inside timed phases
  const onAnalyzeResultRef = useRef(onAnalyzeResult)
  onAnalyzeResultRef.current = onAnalyzeResult

  const energy = resolveEnergy(energyState, patientMode)

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

  const runTimedPhase = useCallback(
    (durationMs: number, onComplete: () => void) => {
      clearTimers()
      startedAtRef.current = Date.now()
      durationRef.current = durationMs
      setProgress(0)
      const tickProgress = () => {
        const elapsed = Date.now() - startedAtRef.current
        const ratio = Math.min(1, elapsed / durationRef.current)
        setProgress(ratio)
        if (ratio < 1) {
          rafRef.current = requestAnimationFrame(tickProgress)
        }
      }
      rafRef.current = requestAnimationFrame(tickProgress)
      timerRef.current = setTimeout(() => {
        clearTimers()
        setProgress(1)
        onComplete()
      }, durationMs)
    },
    [clearTimers],
  )

  const onAnalyse = useCallback(() => {
    if (!canAnalyseIn(state)) return
    rhythmAtAnalyzeRef.current = rhythm
    setState('analyzing_ecg')
    setCprStartTime(null)
    setLastDeliveredJoules(null)
    playSystemAudio('stand_clear.mp3')
    runTimedPhase(ANALYZE_ECG_MS, () => {
      setState('analyzing_clear')
      runTimedPhase(ANALYZE_CLEAR_MS, () => {
        if (isShockable(rhythmAtAnalyzeRef.current)) {
          setState('shock_advised')
          onAnalyzeResultRef.current?.('shock')
          playSystemAudio('press_shock.mp3')
        } else {
          setState('analyzing_result')
          onAnalyzeResultRef.current?.('no_shock')
          playSystemAudio('shock_not_advised.mp3')
          runTimedPhase(ANALYZE_RESULT_MS, () => {
            setState('cpr')
            playCprAudioSequence(() => setCprStartTime(Date.now()))
          })
        }
      })
    })
  }, [state, rhythm, runTimedPhase])

  const onCharge = useCallback(() => {
    const next = chargeTransition(state)
    if (next === 'charging') {
      setState('charging')
      runTimedPhase(CHARGE_DURATION_MS, () => setState('charged'))
    } else if (next === 'charge_prompt') {
      setState('charge_prompt')
    }
  }, [state, runTimedPhase])

  const onShock = useCallback(() => {
    const action = shockTransition(state)
    if (action === 'advised') {
      const joulesDelivered = resolveEnergy(energyState, patientMode)
      setShockCount((n) => n + 1)
      setLastDeliveredJoules(joulesDelivered)
      setState('cpr')
      playCprAudioSequence(() => setCprStartTime(Date.now()))
      setProgress(0)
      return
    }
    if (action !== 'charged') return
    setShockCount((n) => n + 1)
    setState('delivered')
    setProgress(0)
  }, [state, energyState, patientMode])

  const onEnergyUp = useCallback(() => {
    if (!canAdjustEnergyIn(state)) return
    setEnergyState((current) => energyUp(current, patientMode))
  }, [state, patientMode])

  const onEnergyDown = useCallback(() => {
    if (!canAdjustEnergyIn(state)) return
    setEnergyState((current) => energyDown(current, patientMode))
  }, [state, patientMode])

  const canAnalyse = canAnalyseIn(state)
  const canCharge = canChargeIn(state)
  const canShock = canShockIn(state)
  const canAdjustEnergy = canAdjustEnergyIn(state)

  const reset = useCallback(() => {
    clearTimers()
    setState('idle')
    setShockCount(0)
    setProgress(0)
    setCprStartTime(null)
    setLastDeliveredJoules(null)
  }, [clearTimers])

  return {
    state,
    energy,
    shockCount,
    progress,
    cprStartTime,
    lastDeliveredJoules,
    canAnalyse,
    canCharge,
    canShock,
    canAdjustEnergy,
    onAnalyse,
    onCharge,
    onShock,
    onEnergyUp,
    onEnergyDown,
    reset,
  }
}
