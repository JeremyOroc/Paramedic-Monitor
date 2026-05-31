'use client'

import { useEffect, useState } from 'react'
import { formatMonitorClock, type MonitorClock } from '@/lib/monitorClock'

/**
 * Ticking monitor clock. Returns the formatted `{ date, time }` for the local
 * time zone (falling back to America/Toronto), updating once per second.
 */
export function useMonitorClock(): MonitorClock {
  const [now, setNow] = useState<Date | null>(null)

  const timeZone = (() => {
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
