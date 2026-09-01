'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createPatientSnsFindingSnapshot,
} from '@/lib/patientSnsMeasurement'
import type { PatientPhysicalFindings } from '@/lib/patientPhysicalAutoSort'
import type {
  PatientSnsMeasurementDurationSeconds,
  PatientSnsMeasurementGroupId,
} from '@/types/patientPhysical'

const MEASUREMENT_GROUPS: ReadonlyArray<PatientSnsMeasurementGroupId> = [
  'pulse',
  'respiratory',
]

type PatientSnsMeasurementEntryState = {
  durationSeconds: PatientSnsMeasurementDurationSeconds | null
  endsAt: number | null
  pendingSnapshot: PatientPhysicalFindings | null
  resultSnapshot: PatientPhysicalFindings | null
}

export type PatientSnsMeasurementEntry = PatientSnsMeasurementEntryState & {
  secondsLeft: number
}

export type PatientSnsMeasurementState = Record<
  PatientSnsMeasurementGroupId,
  PatientSnsMeasurementEntry
>

function createEmptyEntry(): PatientSnsMeasurementEntryState {
  return {
    durationSeconds: null,
    endsAt: null,
    pendingSnapshot: null,
    resultSnapshot: null,
  }
}

function createEmptyState(): Record<
  PatientSnsMeasurementGroupId,
  PatientSnsMeasurementEntryState
> {
  return {
    pulse: createEmptyEntry(),
    respiratory: createEmptyEntry(),
  }
}

function getSecondsLeft(endsAt: number | null, now: number): number {
  if (endsAt === null) return 0
  return Math.max(1, Math.ceil((endsAt - now) / 1000))
}

export function usePatientSnsMeasurements(
  onMeasurementResult?: (group: PatientSnsMeasurementGroupId) => void,
) {
  const [measurements, setMeasurements] = useState(createEmptyState)
  const [now, setNow] = useState(() => Date.now())
  const measurementsRef = useRef(measurements)
  const onMeasurementResultRef = useRef(onMeasurementResult)
  const pulseEndsAt = measurements.pulse.endsAt
  const respiratoryEndsAt = measurements.respiratory.endsAt

  useEffect(() => {
    onMeasurementResultRef.current = onMeasurementResult
  }, [onMeasurementResult])

  const commitMeasurements = useCallback((
    update: (
      current: Record<PatientSnsMeasurementGroupId, PatientSnsMeasurementEntryState>,
    ) => Record<PatientSnsMeasurementGroupId, PatientSnsMeasurementEntryState>,
  ) => {
    const next = update(measurementsRef.current)
    measurementsRef.current = next
    setMeasurements(next)
  }, [])

  const completeExpiredMeasurements = useCallback(() => {
    const tickNow = Date.now()
    const current = measurementsRef.current
    const next = { ...current }
    const completedGroups: PatientSnsMeasurementGroupId[] = []

    for (const group of MEASUREMENT_GROUPS) {
      const measurement = current[group]
      if (
        measurement.endsAt === null ||
        measurement.endsAt > tickNow ||
        measurement.pendingSnapshot === null
      ) {
        continue
      }

      completedGroups.push(group)
      next[group] = {
        durationSeconds: null,
        endsAt: null,
        pendingSnapshot: null,
        resultSnapshot: measurement.pendingSnapshot,
      }
    }

    setNow(tickNow)
    if (completedGroups.length === 0) return
    measurementsRef.current = next
    setMeasurements(next)
    for (const group of completedGroups) onMeasurementResultRef.current?.(group)
  }, [])

  useEffect(() => {
    const activeEndsAt = [pulseEndsAt, respiratoryEndsAt].filter(
      (endsAt): endsAt is number => endsAt !== null,
    )
    if (activeEndsAt.length === 0) return

    const nextDeadline = Math.min(...activeEndsAt)
    const deadlineId = window.setTimeout(
      completeExpiredMeasurements,
      Math.max(0, nextDeadline - Date.now()),
    )
    const intervalId = window.setInterval(completeExpiredMeasurements, 250)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') completeExpiredMeasurements()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(deadlineId)
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [completeExpiredMeasurements, pulseEndsAt, respiratoryEndsAt])

  const startMeasurement = useCallback((
    group: PatientSnsMeasurementGroupId,
    durationSeconds: PatientSnsMeasurementDurationSeconds,
    findings: PatientPhysicalFindings,
  ) => {
    const startedAt = Date.now()
    const snapshot = createPatientSnsFindingSnapshot(group, findings)
    commitMeasurements((current) => ({
      ...current,
      [group]: {
        durationSeconds,
        endsAt: startedAt + durationSeconds * 1000,
        pendingSnapshot: snapshot,
        resultSnapshot: null,
      },
    }))
    setNow(startedAt)
  }, [commitMeasurements])

  const toggleMeasurementResult = useCallback((
    group: PatientSnsMeasurementGroupId,
    findings: PatientPhysicalFindings,
  ) => {
    let revealed = false
    commitMeasurements((current) => {
      const currentMeasurement = current[group]
      if (currentMeasurement.resultSnapshot !== null) {
        return {
          ...current,
          [group]: {
            ...currentMeasurement,
            resultSnapshot: null,
          },
        }
      }

      revealed = true
      return {
        ...current,
        [group]: {
          durationSeconds: null,
          endsAt: null,
          pendingSnapshot: null,
          resultSnapshot: createPatientSnsFindingSnapshot(group, findings),
        },
      }
    })
    if (revealed) onMeasurementResultRef.current?.(group)
  }, [commitMeasurements])

  const cancelMeasurement = useCallback((group: PatientSnsMeasurementGroupId) => {
    commitMeasurements((current) => ({
      ...current,
      [group]: createEmptyEntry(),
    }))
  }, [commitMeasurements])

  const resetMeasurements = useCallback(() => {
    const emptyState = createEmptyState()
    measurementsRef.current = emptyState
    setMeasurements(emptyState)
    setNow(Date.now())
  }, [])

  const state: PatientSnsMeasurementState = {
    pulse: {
      ...measurements.pulse,
      secondsLeft: getSecondsLeft(measurements.pulse.endsAt, now),
    },
    respiratory: {
      ...measurements.respiratory,
      secondsLeft: getSecondsLeft(measurements.respiratory.endsAt, now),
    },
  }

  return {
    measurements: state,
    startMeasurement,
    toggleMeasurementResult,
    cancelMeasurement,
    resetMeasurements,
  }
}
