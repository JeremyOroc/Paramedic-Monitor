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
  chargePolicy?: DefibChargePolicy
  analysisInterference?: DefibAnalysisInterference | null
  onAnalyzeResult?: (
    result: DefibAnalysisResult,
    rhythm: Rhythm,
    interference?: DefibAnalysisInterference,
  ) => void
  playPrompt?: (prompt: DefibPrompt) => void
  playCprPrompt?: (onEnded?: () => void) => void
}

export type DefibPrompt = 'standClear' | 'pressShock' | 'shockNotAdvised' | 'analysisHalted'
export type DefibChargePolicy = 'default' | 'wagamiA'
export type DefibChargeOrigin = 'automatic_advised' | 'manual' | null
export type DefibAnalysisInterference = 'cpr_compression'
export type DefibAnalysisResult = 'shock' | 'no_shock' | 'halted'

function playDefaultPrompt(prompt: DefibPrompt): void {
  const filenames: Record<DefibPrompt, string> = {
    standClear: 'stand_clear.mp3',
    pressShock: 'press_shock.mp3',
    shockNotAdvised: 'shock_not_advised.mp3',
    analysisHalted: 'analysis_halted.mp3',
  }
  playSystemAudio(filenames[prompt])
}

export function useDefibSequence({
  patientMode,
  rhythm = 'nsr',
  chargePolicy = 'default',
  analysisInterference = null,
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
  const [chargeOrigin, setChargeOrigin] = useState<DefibChargeOrigin>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const cprStartDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cprSequenceRef = useRef(0)
  const startedAtRef = useRef<number>(0)
  const durationRef = useRef<number>(0)
  // Capture rhythm at analyze time so mid-analyze changes don't affect the result
  const rhythmAtAnalyzeRef = useRef<Rhythm>(rhythm)
  const interferenceDuringAnalyzeRef = useRef<DefibAnalysisInterference | null>(null)
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

  useEffect(() => {
    if (
      analysisInterference !== null &&
      (state === 'analyzing_ecg' || state === 'analyzing_clear')
    ) {
      interferenceDuringAnalyzeRef.current = analysisInterference
    }
  }, [analysisInterference, state])

  const energy = resolveEnergy(energyState, patientMode)
  const usesWagamiAChargePolicy = chargePolicy === 'wagamiA'

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

  const startTimedCharge = useCallback((origin: Exclude<DefibChargeOrigin, null>) => {
    advisedChargeRef.current = origin === 'automatic_advised'
    setChargeOrigin(origin)
    cancelPendingCprStart()
    setState('charging')
    runTimedPhase(CHARGE_DURATION_MS, () => {
      setState('charged')
      if (origin === 'automatic_advised') playPromptRef.current('pressShock')
    })
  }, [cancelPendingCprStart, runTimedPhase])

  const onAnalyse = useCallback(() => {
    if (!canAnalyseIn(state)) return
    advisedChargeRef.current = false
    setChargeOrigin(null)
    cancelPendingCprStart()
    rhythmAtAnalyzeRef.current = rhythm
    interferenceDuringAnalyzeRef.current = analysisInterference
    setState('analyzing_ecg')
    setCprStartTime(null)
    setLastDeliveredJoules(null)
    playPromptRef.current('standClear')
    runTimedPhase(ANALYZE_ECG_MS, () => {
      setState('analyzing_clear')
      runTimedPhase(ANALYZE_CLEAR_MS, () => {
        const analyzedRhythm = rhythmAtAnalyzeRef.current
        const interference = interferenceDuringAnalyzeRef.current
        if (interference !== null) {
          setState('analyzing_halted')
          onAnalyzeResultRef.current?.('halted', analyzedRhythm, interference)
          playPromptRef.current('analysisHalted')
          runTimedPhase(ANALYZE_RESULT_MS, () => {
            setState('idle')
          })
          return
        }
        if (isShockable(analyzedRhythm)) {
          onAnalyzeResultRef.current?.('shock', analyzedRhythm)
          if (usesWagamiAChargePolicy) {
            startTimedCharge('automatic_advised')
          } else {
            setState('shock_advised')
            playPromptRef.current('pressShock')
          }
        } else {
          setState('analyzing_result')
          onAnalyzeResultRef.current?.('no_shock', analyzedRhythm)
          playPromptRef.current('shockNotAdvised')
          runTimedPhase(ANALYZE_RESULT_MS, () => {
            enterCpr()
          })
        }
      })
    })
  }, [state, rhythm, analysisInterference, usesWagamiAChargePolicy, runTimedPhase, cancelPendingCprStart, enterCpr, startTimedCharge])

  const onCharge = useCallback(() => {
    const next = chargeTransition(state, usesWagamiAChargePolicy)
    if (next === 'charging') {
      startTimedCharge('manual')
    } else if (next === 'charge_prompt') {
      advisedChargeRef.current = false
      setChargeOrigin(null)
      cancelPendingCprStart()
      setState('charge_prompt')
    }
  }, [state, usesWagamiAChargePolicy, startTimedCharge, cancelPendingCprStart])

  const onShock = useCallback(() => {
    if (usesWagamiAChargePolicy && state !== 'charged') return
    const action = shockTransition(state)
    if (action === 'advised') {
      const joulesDelivered = resolveEnergy(energyState, patientMode)
      setShockCount((n) => n + 1)
      setLastDeliveredJoules(joulesDelivered)
      setChargeOrigin(null)
      enterCpr()
      setProgress(0)
      return
    }
    if (action !== 'charged') return
    setShockCount((n) => n + 1)
    if (advisedChargeRef.current) {
      advisedChargeRef.current = false
      setChargeOrigin(null)
      setLastDeliveredJoules(resolveEnergy(energyState, patientMode))
      enterCpr()
      setProgress(0)
      return
    }
    setChargeOrigin(null)
    setState('delivered')
    setProgress(0)
    setPhaseStartedAt(null)
    setPhaseEndsAt(null)
  }, [state, energyState, patientMode, usesWagamiAChargePolicy, enterCpr])

  const onEnergyUp = useCallback(() => {
    if (!canAdjustEnergyIn(state, usesWagamiAChargePolicy)) return
    setEnergyState((current) => energyUp(current, patientMode))
  }, [state, patientMode, usesWagamiAChargePolicy])

  const onEnergyDown = useCallback(() => {
    if (!canAdjustEnergyIn(state, usesWagamiAChargePolicy)) return
    setEnergyState((current) => energyDown(current, patientMode))
  }, [state, patientMode, usesWagamiAChargePolicy])

  const canAnalyse = canAnalyseIn(state)
  const canCharge = usesWagamiAChargePolicy
    ? state === 'idle' || state === 'cpr' || state === 'delivered'
    : canChargeIn(state)
  const canShock = usesWagamiAChargePolicy ? state === 'charged' : canShockIn(state)
  const canAdjustEnergy = canAdjustEnergyIn(state, usesWagamiAChargePolicy)
  const chargeProgress = state === 'charged' ? 1 : state === 'charging' ? progress : 0

  const reset = useCallback(() => {
    clearTimers()
    cancelPendingCprStart()
    advisedChargeRef.current = false
    interferenceDuringAnalyzeRef.current = null
    setChargeOrigin(null)
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
    chargeProgress,
    chargeOrigin,
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
