'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { JOULE_DEFAULTS, type PatientMode, type Rhythm } from '@/types/vitals'
import { playSystemAudio } from '@/lib/audio'

export type DefibState = 
  | 'idle'
  | 'analyzing_ecg'
  | 'analyzing_clear'
  | 'analyzing_result'
  | 'shock_advised'
  | 'cpr'
  | 'charge_prompt'
  | 'charging'
  | 'charged'
  | 'delivered'

const SHOCKABLE_RHYTHMS: ReadonlySet<Rhythm> = new Set(['vf', 'vt', 'torsades'])

const ANALYZE_ECG_MS = 2500
const ANALYZE_CLEAR_MS = 2500
const ANALYZE_RESULT_MS = 4000
const CHARGE_DURATION_MS = 4000
const ENERGY_STEP = 10

type Options = {
  patientMode: PatientMode
  rhythm: Rhythm
}

export function useDefibSequence({
  patientMode,
  rhythm,
}: Options) {
  const [state, setState] = useState<DefibState>('idle')
  const [energyState, setEnergyState] = useState(() => ({
    patientMode,
    energy: JOULE_DEFAULTS[patientMode],
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

  const energy =
    energyState.patientMode === patientMode
      ? energyState.energy
      : JOULE_DEFAULTS[patientMode]

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
    if (
      state !== 'idle' &&
      state !== 'cpr' &&
      state !== 'charge_prompt' &&
      state !== 'delivered'
    )
      return
    rhythmAtAnalyzeRef.current = rhythm
    setState('analyzing_ecg')
    setCprStartTime(null)
    setLastDeliveredJoules(null)
    playSystemAudio('stand_clear.mp3')
    runTimedPhase(ANALYZE_ECG_MS, () => {
      setState('analyzing_clear')
      runTimedPhase(ANALYZE_CLEAR_MS, () => {
        if (SHOCKABLE_RHYTHMS.has(rhythmAtAnalyzeRef.current)) {
          setState('shock_advised')
          playSystemAudio('jumpscare_fnaf2.mp3')
        } else {
          setState('analyzing_result')
          playSystemAudio('shock_not_advised.mp3')
          runTimedPhase(ANALYZE_RESULT_MS, () => {
            setState('cpr')
            setCprStartTime(Date.now())
            playSystemAudio('perform_cpr.mp3')
          })
        }
      })
    })
  }, [state, rhythm, runTimedPhase])

  const onCharge = useCallback(() => {
    if (state === 'charge_prompt') {
      setState('charging')
      runTimedPhase(CHARGE_DURATION_MS, () => setState('charged'))
    } else if (state === 'cpr' || state === 'idle' || state === 'analyzing_result' || state === 'delivered') {
      setState('charge_prompt')
    }
  }, [state, runTimedPhase])

  const onShock = useCallback(() => {
    if (state === 'shock_advised') {
      const joulesDelivered = energyState.patientMode === patientMode
        ? energyState.energy
        : JOULE_DEFAULTS[patientMode]
      setShockCount((n) => n + 1)
      setLastDeliveredJoules(joulesDelivered)
      setState('cpr')
      setCprStartTime(Date.now())
      playSystemAudio('perform_cpr.mp3')
      setProgress(0)
      return
    }
    if (state !== 'charged') return
    setShockCount((n) => n + 1)
    setState('delivered')
    setProgress(0)
  }, [state, energyState, patientMode])

  const onEnergyUp = useCallback(() => {
    if (state.startsWith('analyzing') || state === 'charging' || state === 'shock_advised') return
    setEnergyState((current) => {
      const currentEnergy =
        current.patientMode === patientMode
          ? current.energy
          : JOULE_DEFAULTS[patientMode]
      return { patientMode, energy: currentEnergy + ENERGY_STEP }
    })
  }, [state, patientMode])

  const onEnergyDown = useCallback(() => {
    if (state.startsWith('analyzing') || state === 'charging' || state === 'shock_advised') return
    setEnergyState((current) => {
      const currentEnergy =
        current.patientMode === patientMode
          ? current.energy
          : JOULE_DEFAULTS[patientMode]
      return { patientMode, energy: Math.max(ENERGY_STEP, currentEnergy - ENERGY_STEP) }
    })
  }, [state, patientMode])

  const canAnalyse =
    state === 'idle' ||
    state === 'cpr' ||
    state === 'charge_prompt' ||
    state === 'delivered'
  const canCharge = state === 'idle' || state === 'cpr' || state === 'charge_prompt' || state === 'delivered'
  const canShock = state === 'charged' || state === 'shock_advised'
  const canAdjustEnergy = !state.startsWith('analyzing') && state !== 'charging' && state !== 'shock_advised'

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
  }
}
