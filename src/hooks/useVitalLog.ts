'use client'

import { useEffect, useRef, useState } from 'react'

import {
  DEFAULT_VITAL_LOG_INTERVAL,
  type VitalLogInterval,
} from '@/types/vitalLog'

export const VITAL_LOG_INTERVAL_SECONDS = DEFAULT_VITAL_LOG_INTERVAL * 60

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
  intervalMinutes?: VitalLogInterval
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
  intervalMinutes = DEFAULT_VITAL_LOG_INTERVAL,
}: UseVitalLogOptions): VitalLogEntry[] {
  const intervalSeconds = intervalMinutes * 60
  const [entries, setEntries] = useState<VitalLogEntry[]>([])
  const nextSampleSecondsRef = useRef(intervalSeconds)
  const intervalMinutesRef = useRef(intervalMinutes)
  const latestSnapshotRef = useRef(snapshot)
  const previousElapsedSecondsRef = useRef(0)

  useEffect(() => {
    latestSnapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    if (!isRunning || elapsedSeconds < previousElapsedSecondsRef.current) {
      intervalMinutesRef.current = intervalMinutes
      nextSampleSecondsRef.current = intervalSeconds
      previousElapsedSecondsRef.current = elapsedSeconds
      // This history is an event stream driven by the timer, not derived render
      // state. Clearing here deliberately follows the same lifecycle as the
      // visible session timer.
      setEntries((current) => (current.length === 0 ? current : []))
      return
    }

    previousElapsedSecondsRef.current = elapsedSeconds

    if (intervalMinutesRef.current !== intervalMinutes) {
      intervalMinutesRef.current = intervalMinutes
      nextSampleSecondsRef.current = elapsedSeconds + intervalSeconds
      return
    }

    if (elapsedSeconds < nextSampleSecondsRef.current) return

    const currentSnapshot = latestSnapshotRef.current
    const newEntries: VitalLogEntry[] = []
    while (elapsedSeconds >= nextSampleSecondsRef.current) {
      newEntries.push({
        timestamp: formatTimestamp(nextSampleSecondsRef.current),
        ...currentSnapshot,
      })
      nextSampleSecondsRef.current += intervalSeconds
    }

    setEntries((current) => [...current, ...newEntries])
  }, [elapsedSeconds, intervalMinutes, intervalSeconds, isRunning])

  return entries
}
