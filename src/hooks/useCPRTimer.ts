'use client'

import { useState, useEffect } from 'react'

export function useCPRTimer(startTime: number | null) {
  const [timeLeft, setTimeLeft] = useState(120)

  useEffect(() => {
    if (!startTime) {
      const resetTimer = setTimeout(() => setTimeLeft(120), 0)
      return () => clearTimeout(resetTimer)
    }

    const updateTimeLeft = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const remaining = Math.max(0, 120 - elapsed)
      setTimeLeft(remaining)

      if (remaining === 0) {
        clearInterval(interval)
      }
    }

    const interval = setInterval(updateTimeLeft, 1000)
    const firstTick = setTimeout(updateTimeLeft, 0)

    return () => {
      clearInterval(interval)
      clearTimeout(firstTick)
    }
  }, [startTime])

  const mins = Math.floor(timeLeft / 60)
  const secs = (timeLeft % 60).toString().padStart(2, '0')

  return { formatted: `${mins}:${secs}`, isDone: timeLeft === 0 }
}
