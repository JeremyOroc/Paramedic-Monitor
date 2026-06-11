'use client'

import { useEffect, useState } from 'react'

function elapsedSeconds(startedAt: number | null): number {
  if (startedAt === null) return 0
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
}

function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Counts up from an absolute start timestamp. Because the source is absolute
 * epoch time, refreshes resume from the real elapsed duration.
 */
export function useElapsedTimer(startedAt: number | null): {
  formatted: string
  secondsElapsed: number
} {
  const [secondsElapsed, setSecondsElapsed] = useState(() => elapsedSeconds(startedAt))

  useEffect(() => {
    function tick() {
      setSecondsElapsed(elapsedSeconds(startedAt))
    }

    tick()
    if (startedAt === null) return

    const id = setInterval(tick, 1000)

    function onVisible() {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [startedAt])

  return { formatted: formatSeconds(secondsElapsed), secondsElapsed }
}
