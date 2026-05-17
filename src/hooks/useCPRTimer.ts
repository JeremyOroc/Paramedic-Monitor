'use client'

import { useState, useEffect } from 'react'

export function useCPRTimer(startTime: number | null) {
  const [timeLeft, setTimeLeft] = useState(120)

  useEffect(() => {
    if (!startTime) {
      setTimeLeft(120)
      return
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const remaining = Math.max(0, 120 - elapsed)
      setTimeLeft(remaining)
      
      if (remaining === 0) {
        clearInterval(interval)
      }
    }, 1000)

    // Run once immediately to avoid 1s delay
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    setTimeLeft(Math.max(0, 120 - elapsed))

    return () => clearInterval(interval)
  }, [startTime])

  const mins = Math.floor(timeLeft / 60)
  const secs = (timeLeft % 60).toString().padStart(2, '0')

  return { formatted: `${mins}:${secs}`, isDone: timeLeft === 0 }
}
