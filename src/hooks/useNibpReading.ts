'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type NibpPhase = 'idle' | 'please_wait' | 'reading' | 'counting' | 'settled'

export type NibpSnapshot = {
  bpSys: number
  bpDia: number
  active: {
    bp_sys: boolean
    bp_dia: boolean
  }
}

const COUNTING_MS = 8000
const STEP_INTERVAL_MS = 333
const PEAK_HOLD_MS = 100

/** Pre-generate the full ascending sequence from 0 → target in actualSteps entries. */
function buildCountingSequence(target: number): number[] {
  const maxSteps = Math.floor(COUNTING_MS / STEP_INTERVAL_MS) // ~24
  // Ensure at least 2 entries (0 and target). Cap at maxSteps for cadence.
  const actualSteps = Math.max(Math.min(maxSteps, target + 1), 2)

  const numTransitions = actualSteps - 1
  // Distribute target evenly across transitions: each step is baseStep or baseStep+1
  const baseStep = Math.floor(target / numTransitions)
  const remainder = target % numTransitions

  const steps: number[] = []
  for (let i = 0; i < numTransitions; i++) {
    steps.push(baseStep + (i < remainder ? 1 : 0))
  }

  // Fisher-Yates shuffle for a random-feeling ascent
  for (let i = steps.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[steps[i], steps[j]] = [steps[j], steps[i]]
  }

  // Build cumulative sequence
  const sequence: number[] = [0]
  let current = 0
  for (const step of steps) {
    current += step
    sequence.push(current)
  }
  // Floating-point guard: force exact target at the end
  sequence[sequence.length - 1] = target

  return sequence
}

function getSequenceIndex(elapsedMs: number, sequenceLength: number): number {
  if (elapsedMs <= 0 || sequenceLength <= 1) return 0
  const transitions = sequenceLength - 1
  // The exact peak is owned by the deadline callback, never an early interval tick.
  return Math.min(transitions - 1, Math.ceil((elapsedMs / COUNTING_MS) * transitions))
}

function normalizeSnapshot(pending: number | NibpSnapshot): NibpSnapshot {
  if (typeof pending === 'number') {
    return {
      bpSys: pending,
      bpDia: 0,
      active: { bp_sys: true, bp_dia: true },
    }
  }
  return pending
}

export function useNibpReading(
  pending: number | NibpSnapshot,
  onComplete?: (snapshot: NibpSnapshot) => void,
) {
  const [phase, setPhase] = useState<NibpPhase>('idle')
  const [displayValue, setDisplayValue] = useState<string | number>('')

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Snapshot pending BP at the moment reading starts — store changes mid-read don't affect it.
  const pendingRef = useRef<NibpSnapshot>(normalizeSnapshot(pending))
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    pendingRef.current = normalizeSnapshot(pending)
    onCompleteRef.current = onComplete
  })

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startReading = useCallback((snapshot: NibpSnapshot) => {
    clearTimers()
    pendingRef.current = snapshot
    const target = snapshot.bpSys + 30
    const sequence = buildCountingSequence(target)
    const startedAt = Date.now()

    setPhase('counting')
    setDisplayValue(sequence[0])

    intervalRef.current = setInterval(() => {
      const elapsedMs = Math.max(0, Date.now() - startedAt)
      setDisplayValue(sequence[getSequenceIndex(elapsedMs, sequence.length)])
    }, STEP_INTERVAL_MS)

    timerRef.current = setTimeout(() => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setDisplayValue(target)
      // Keep the inflation peak perceptible before revealing the accepted result.
      timerRef.current = setTimeout(() => {
        const isActive = snapshot.active.bp_sys || snapshot.active.bp_dia
        setPhase(isActive ? 'settled' : 'idle')
        setDisplayValue(isActive ? snapshot.bpSys : '')
        onCompleteRef.current?.(snapshot)
      }, PEAK_HOLD_MS)
    }, COUNTING_MS)
  }, [clearTimers])

  const cancelReading = useCallback(() => {
    clearTimers()
    setPhase('idle')
    setDisplayValue('')
  }, [clearTimers])

  const handlePatientEvent = useCallback(() => {
    if (phase === 'idle' || phase === 'settled') {
      startReading(normalizeSnapshot(pending))
    } else {
      // Cancel: return to idle, restore confirmed store values
      cancelReading()
    }
  }, [cancelReading, phase, pending, startReading])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  return { phase, displayValue, handlePatientEvent, cancelReading }
}
