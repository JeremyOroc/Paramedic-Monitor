'use client'

import { useEffect, useState } from 'react'

function remainingSeconds(endsAt: number | null): number {
  if (endsAt === null) return 0
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
}

/**
 * Counts down to an absolute end timestamp (epoch ms). Because it is driven by
 * an absolute time rather than an elapsed counter, a page refresh resumes from
 * the real remaining time. `endsAt === null` means "not started" → 00:00.
 */
export function useCountdown(endsAt: number | null): {
  formatted: string
  isDone: boolean
  secondsLeft: number
} {
  const [secondsLeft, setSecondsLeft] = useState(() => remainingSeconds(endsAt))

  useEffect(() => {
    function tick() {
      setSecondsLeft(remainingSeconds(endsAt))
    }

    tick()
    if (endsAt === null) return

    const id = setInterval(tick, 1000)

    // Snap to the correct value the moment the tab is visible again.
    function onVisible() {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [endsAt])

  const m = Math.floor(secondsLeft / 60)
  const s = secondsLeft % 60
  const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  return { formatted, isDone: endsAt !== null && secondsLeft === 0, secondsLeft }
}
