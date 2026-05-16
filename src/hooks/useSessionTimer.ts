import { useEffect, useRef, useState } from 'react'

export function useSessionTimer(isRunning: boolean): string {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isRunning) {
      startRef.current = null
      const resetId = setTimeout(() => setElapsed(0), 0)
      return () => clearTimeout(resetId)
    }

    const resetId = setTimeout(() => setElapsed(0), 0)
    startRef.current = Date.now()

    function tick() {
      if (startRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      }
    }

    const id = setInterval(tick, 1000)

    // Snap the display back to the correct value the moment the tab is visible again
    function onVisible() {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearTimeout(resetId)
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isRunning])

  const displayElapsed = isRunning ? elapsed : 0
  const h = Math.floor(displayElapsed / 3600)
  const m = Math.floor((displayElapsed % 3600) / 60)
  const s = displayElapsed % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
