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

const PLEASE_WAIT_MS = 3000
const READING_MS = 500
const COUNTING_MS = 8000
const STEP_INTERVAL_MS = 333

/** Pre-generate the full ascending sequence from 0 → target in actualSteps entries. */
function buildCountingSequence(target: number): { sequence: number[]; intervalMs: number } {
  const maxSteps = Math.floor(COUNTING_MS / STEP_INTERVAL_MS) // ~24
  // Ensure at least 2 entries (0 and target). Cap at maxSteps for timing.
  const actualSteps = Math.max(Math.min(maxSteps, target + 1), 2)
  const intervalMs = Math.round(COUNTING_MS / actualSteps)

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

  return { sequence, intervalMs }
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

  function clearTimers() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const startReading = useCallback((snapshot: NibpSnapshot) => {
    clearTimers()
    pendingRef.current = snapshot

    setPhase('please_wait')
    setDisplayValue('Please Wait')

    timerRef.current = setTimeout(() => {
      setPhase('reading')
      setDisplayValue('Reading in Progress')

      timerRef.current = setTimeout(() => {
        const target = snapshot.bpSys + 30
        const { sequence, intervalMs } = buildCountingSequence(target)
        let stepIndex = 0

        setPhase('counting')
        setDisplayValue(sequence[0])

        intervalRef.current = setInterval(() => {
          stepIndex++
          if (stepIndex < sequence.length) {
            setDisplayValue(sequence[stepIndex])
          }
          if (stepIndex >= sequence.length - 1) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            // Target value is now visible; after a brief pause drop to settled bpSys
            timerRef.current = setTimeout(() => {
              const isActive = snapshot.active.bp_sys || snapshot.active.bp_dia
              setPhase(isActive ? 'settled' : 'idle')
              setDisplayValue(isActive ? snapshot.bpSys : '')
              onCompleteRef.current?.(snapshot)
            }, 100)
          }
        }, intervalMs)
      }, READING_MS)
    }, PLEASE_WAIT_MS)
  }, [])

  const handlePatientEvent = useCallback(() => {
    if (phase === 'idle' || phase === 'settled') {
      startReading(normalizeSnapshot(pending))
    } else {
      // Cancel: return to idle, restore confirmed store values
      clearTimers()
      setPhase('idle')
      setDisplayValue('')
    }
  }, [phase, pending, startReading])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [])

  return { phase, displayValue, handlePatientEvent }
}
