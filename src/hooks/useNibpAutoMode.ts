'use client'

import { useCallback, useEffect, useRef } from 'react'

import type { NibpAutoInterval } from '@/types/nibp'

type UseNibpAutoModeOptions = {
  enabled: boolean
  intervalMinutes: NibpAutoInterval
  readingActive: boolean
  onTrigger: () => void
}

export function useNibpAutoMode({
  enabled,
  intervalMinutes,
  readingActive,
  onTrigger,
}: UseNibpAutoModeOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef(onTrigger)
  const readingActiveRef = useRef(readingActive)

  useEffect(() => {
    triggerRef.current = onTrigger
  }, [onTrigger])

  useEffect(() => {
    readingActiveRef.current = readingActive
  }, [readingActive])

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const schedule = useCallback(() => {
    clearTimer()
    if (!enabled) return

    const intervalMs = intervalMinutes * 60_000
    const tick = () => {
      timerRef.current = null
      if (!readingActiveRef.current) triggerRef.current()
      timerRef.current = setTimeout(tick, intervalMs)
    }

    timerRef.current = setTimeout(tick, intervalMs)
  }, [clearTimer, enabled, intervalMinutes])

  useEffect(() => {
    schedule()
    return clearTimer
  }, [clearTimer, schedule])

  const handleManualTrigger = useCallback(() => {
    triggerRef.current()
    schedule()
  }, [schedule])

  return { handleManualTrigger }
}
