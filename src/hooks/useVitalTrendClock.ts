'use client'

import { useEffect } from 'react'

import { useMonitorStore } from '@/store/monitorStore'

/**
 * Advances timestamp-backed vital Trends without accumulating interval drift.
 * The store derives each visible value from the absolute start/end timestamps,
 * so a late callback or backgrounded page catches up on its next tick.
 */
export function useVitalTrendClock(): void {
  const runningTrendId = useMonitorStore((state) =>
    state.activeVitalTrend?.status === 'running' ? state.activeVitalTrend.id : null,
  )
  const advanceVitalTrend = useMonitorStore((state) => state.advanceVitalTrend)

  useEffect(() => {
    if (!runningTrendId) return
    const tick = () => advanceVitalTrend(Date.now())
    tick()
    const interval = window.setInterval(tick, 250)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [advanceVitalTrend, runningTrendId])
}
