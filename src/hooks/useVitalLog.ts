'use client'

import { useEffect, useRef, useState } from 'react'

export const VITAL_LOG_INTERVAL_SECONDS = 5 * 60

export type VitalLogSnapshot = {
  fc: number | null
  pniSys: number | null
  pniDia: number | null
  etco2: number | null
  spo2: number | null
}

export type VitalLogEntry = VitalLogSnapshot & {
  timestamp: string
}

type UseVitalLogOptions = {
  elapsedSeconds: number
  isRunning: boolean
  snapshot: VitalLogSnapshot
}

function formatTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

export function useVitalLog({
  elapsedSeconds,
  isRunning,
  snapshot,
}: UseVitalLogOptions): VitalLogEntry[] {
  const [entries, setEntries] = useState<VitalLogEntry[]>([])
  const nextSampleSecondsRef = useRef(VITAL_LOG_INTERVAL_SECONDS)
  const latestSnapshotRef = useRef(snapshot)
  const previousElapsedSecondsRef = useRef(0)

  useEffect(() => {
    latestSnapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    if (!isRunning || elapsedSeconds < previousElapsedSecondsRef.current) {
      nextSampleSecondsRef.current = VITAL_LOG_INTERVAL_SECONDS
      previousElapsedSecondsRef.current = elapsedSeconds
      // This history is an event stream driven by the timer, not derived render
      // state. Clearing here deliberately follows the same lifecycle as the
      // visible session timer.
      setEntries((current) => (current.length === 0 ? current : []))
      return
    }

    previousElapsedSecondsRef.current = elapsedSeconds
    if (elapsedSeconds < nextSampleSecondsRef.current) return

    const currentSnapshot = latestSnapshotRef.current
    const newEntries: VitalLogEntry[] = []
    while (elapsedSeconds >= nextSampleSecondsRef.current) {
      newEntries.push({
        timestamp: formatTimestamp(nextSampleSecondsRef.current),
        ...currentSnapshot,
      })
      nextSampleSecondsRef.current += VITAL_LOG_INTERVAL_SECONDS
    }

    setEntries((current) => [...current, ...newEntries])
  }, [elapsedSeconds, isRunning])

  return entries
}
