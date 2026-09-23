'use client'

import { useEffect, useState } from 'react'
import { formatMonitorClock, type MonitorClock } from '@/lib/monitorClock'

/**
 * Ticking monitor clock. Returns the formatted `{ date, time }` for an
 * explicitly requested time zone, or the local time zone with a Montréal
 * fallback, updating once per second.
 */
export function useMonitorClock(requestedTimeZone?: string): MonitorClock {
  const [now, setNow] = useState<Date | null>(null)

  const timeZone = requestedTimeZone ?? (() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      return tz || 'America/Toronto'
    } catch {
      return 'America/Toronto'
    }
  })()

  useEffect(() => {
    const firstTickId = setTimeout(() => setNow(new Date()), 0)
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => {
      clearTimeout(firstTickId)
      clearInterval(id)
    }
  }, [])

  return formatMonitorClock(now, timeZone)
}
