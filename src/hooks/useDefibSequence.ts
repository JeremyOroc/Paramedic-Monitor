'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { type PatientMode, type Rhythm } from '@/types/vitals'
import { playSystemAudio, playCprAudioSequence } from '@/lib/audio'
import {
  ANALYZE_CLEAR_MS,
  ANALYZE_ECG_MS,
  ANALYZE_RESULT_MS,
  CHARGE_DURATION_MS,
  PERFORM_CPR_DURATION_MS,
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
  rhythm?: Rhythm
  shockRequiresCharge?: boolean
  onAnalyzeResult?: (result: 'shock' | 'no_shock') => void
  playPrompt?: (prompt: DefibPrompt) => void
  playCprPrompt?: (onEnded?: () => void) => void
}

export type DefibPrompt = 'standClear' | 'pressShock' | 'shockNotAdvised'

function playDefaultPrompt(prompt: DefibPrompt): void {
  const filenames: Record<DefibPrompt, string> = {
    standClear: 'stand_clear.mp3',
    pressShock: 'press_shock.mp3',
    shockNotAdvised: 'shock_not_advised.mp3',
  }
  playSystemAudio(filenames[prompt])
}

export function useDefibSequence({
  patientMode,
  rhythm = 'nsr',
  shockRequiresCharge = false,
  onAnalyzeResult,
  playPrompt = playDefaultPrompt,
  playCprPrompt = playCprAudioSequence,
}: Options) {
  const [state, setState] = useState<DefibState>('idle')
  const [energyState, setEnergyState] = useState<EnergyState>(() => ({
    patientMode,
    energy: defaultEnergy(patientMode),
  }))
  const [shockCount, setShockCount] = useState(0)
  const [progress, setProgress] = useState(0)
  const [phaseStartedAt, setPhaseStartedAt] = useState<number | null>(null)
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | null>(null)
  const [cprStartTime, setCprStartTime] = useState<number | null>(null)
  const [lastDeliveredJoules, setLastDeliveredJoules] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const cprStartDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cprSequenceRef = useRef(0)
  const startedAtRef = useRef<number>(0)
  const durationRef = useRef<number>(0)
  // Capture rhythm at analyze time so mid-analyze changes don't affect the result
  const rhythmAtAnalyzeRef = useRef<Rhythm>(rhythm)
  const advisedChargeRef = useRef(false)
  // Always up-to-date callback ref — avoids stale closures inside timed phases.
  // Assigned in an effect rather than during render: mutating a ref while
  // rendering is not safe under concurrent rendering, and the ref is only ever
  // read from timers and effects, which run after commit.
  const onAnalyzeResultRef = useRef(onAnalyzeResult)
  const playPromptRef = useRef(playPrompt)
  const playCprPromptRef = useRef(playCprPrompt)
  useEffect(() => {
    onAnalyzeResultRef.current = onAnalyzeResult
    playPromptRef.current = playPrompt
    playCprPromptRef.current = playCprPrompt
  }, [onAnalyzeResult, playCprPrompt, playPrompt])

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

  const cancelPendingCprStart = useCallback(() => {
    cprSequenceRef.current += 1
    if (cprStartDelayRef.current !== null) {
      clearTimeout(cprStartDelayRef.current)
      cprStartDelayRef.current = null
    }
  }, [])

  useEffect(() => cancelPendingCprStart, [cancelPendingCprStart])

  const runTimedPhase = useCallback(
    (durationMs: number, onComplete: () => void) => {
      clearTimers()
      startedAtRef.current = Date.now()
      durationRef.current = durationMs
      setPhaseStartedAt(startedAtRef.current)
      setPhaseEndsAt(startedAtRef.current + durationMs)
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
        setPhaseStartedAt(null)
        setPhaseEndsAt(null)
        onComplete()
      }, durationMs)
    },
    [clearTimers],
  )

  const enterCpr = useCallback(() => {
    cancelPendingCprStart()
    const sequence = cprSequenceRef.current
    const scheduledStartTime = Date.now() + PERFORM_CPR_DURATION_MS
    const startCprInterval = (startTime: number) => {
      if (cprSequenceRef.current !== sequence) return
      if (cprStartDelayRef.current !== null) {
        clearTimeout(cprStartDelayRef.current)
        cprStartDelayRef.current = null
      }
      setCprStartTime((current) => current ?? startTime)
    }

    setState('cpr')
    setCprStartTime(null)
    cprStartDelayRef.current = setTimeout(
      () => startCprInterval(scheduledStartTime),
      PERFORM_CPR_DURATION_MS,
    )
    playCprPromptRef.current(() => {
      startCprInterval(Math.min(Date.now(), scheduledStartTime))
    })
  }, [cancelPendingCprStart])

  const onAnalyse = useCallback(() => {
    if (!canAnalyseIn(state)) return
    advisedChargeRef.current = false
    cancelPendingCprStart()
    rhythmAtAnalyzeRef.current = rhythm
    setState('analyzing_ecg')
    setCprStartTime(null)
    setLastDeliveredJoules(null)
    playPromptRef.current('standClear')
    runTimedPhase(ANALYZE_ECG_MS, () => {
      setState('analyzing_clear')
      runTimedPhase(ANALYZE_CLEAR_MS, () => {
        if (isShockable(rhythmAtAnalyzeRef.current)) {
          setState('shock_advised')
          onAnalyzeResultRef.current?.('shock')
          if (!shockRequiresCharge) playPromptRef.current('pressShock')
        } else {
          setState('analyzing_result')
          onAnalyzeResultRef.current?.('no_shock')
          playPromptRef.current('shockNotAdvised')
          runTimedPhase(ANALYZE_RESULT_MS, () => {
            enterCpr()
          })
        }
      })
    })
  }, [state, rhythm, shockRequiresCharge, runTimedPhase, cancelPendingCprStart, enterCpr])

  const onCharge = useCallback(() => {
    const next = chargeTransition(state, shockRequiresCharge)
    if (next === 'charging') {
      advisedChargeRef.current = shockRequiresCharge && state === 'shock_advised'
      cancelPendingCprStart()
      setState('charging')
      runTimedPhase(CHARGE_DURATION_MS, () => {
        setState('charged')
        if (advisedChargeRef.current) playPromptRef.current('pressShock')
      })
    } else if (next === 'charge_prompt') {
      advisedChargeRef.current = false
      cancelPendingCprStart()
      setState('charge_prompt')
    }
  }, [state, shockRequiresCharge, runTimedPhase, cancelPendingCprStart])

  const onShock = useCallback(() => {
    if (shockRequiresCharge && state !== 'charged') return
    const action = shockTransition(state)
    if (action === 'advised') {
      const joulesDelivered = resolveEnergy(energyState, patientMode)
      setShockCount((n) => n + 1)
      setLastDeliveredJoules(joulesDelivered)
      enterCpr()
      setProgress(0)
      return
    }
    if (action !== 'charged') return
    setShockCount((n) => n + 1)
    if (advisedChargeRef.current) {
      advisedChargeRef.current = false
      setLastDeliveredJoules(resolveEnergy(energyState, patientMode))
      enterCpr()
      setProgress(0)
      return
    }
    setState('delivered')
    setProgress(0)
    setPhaseStartedAt(null)
    setPhaseEndsAt(null)
  }, [state, energyState, patientMode, shockRequiresCharge, enterCpr])

  const onEnergyUp = useCallback(() => {
    if (!canAdjustEnergyIn(state)) return
    setEnergyState((current) => energyUp(current, patientMode))
  }, [state, patientMode])

  const onEnergyDown = useCallback(() => {
    if (!canAdjustEnergyIn(state)) return
    setEnergyState((current) => energyDown(current, patientMode))
  }, [state, patientMode])

  const canAnalyse = canAnalyseIn(state)
  const canCharge = canChargeIn(state) || (shockRequiresCharge && state === 'shock_advised')
  const canShock = shockRequiresCharge ? state === 'charged' : canShockIn(state)
  const canAdjustEnergy = canAdjustEnergyIn(state)

  const reset = useCallback(() => {
    clearTimers()
    cancelPendingCprStart()
    advisedChargeRef.current = false
    setState('idle')
    setShockCount(0)
    setProgress(0)
    setPhaseStartedAt(null)
    setPhaseEndsAt(null)
    setCprStartTime(null)
    setLastDeliveredJoules(null)
  }, [clearTimers, cancelPendingCprStart])

  return {
    state,
    energy,
    shockCount,
    progress,
    phaseStartedAt,
    phaseEndsAt,
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
