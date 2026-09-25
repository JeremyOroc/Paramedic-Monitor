'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { PowerState } from '@/components/monitor/DeviceShell'

export const WAGAMI_A_STARTUP_MS = 3000

type UseWagamiAStartupOptions = {
  powerState: PowerState
  setPowerState: (state: PowerState) => void
  onReady: () => void
}

export function useWagamiAStartup({
  powerState,
  setPowerState,
  onReady,
}: UseWagamiAStartupOptions) {
  const [startupEndsAt, setStartupEndsAt] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onReadyRef = useRef(onReady)
  const powerStateRef = useRef(powerState)
  const startupEndsAtRef = useRef(startupEndsAt)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    powerStateRef.current = powerState
  }, [powerState])

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const clearDeadline = useCallback(() => {
    startupEndsAtRef.current = null
    setStartupEndsAt(null)
  }, [])

  const start = useCallback(() => {
    if (powerStateRef.current !== 'off') return
    clearTimer()
    const endsAt = Date.now() + WAGAMI_A_STARTUP_MS
    startupEndsAtRef.current = endsAt
    powerStateRef.current = 'booting'
    setStartupEndsAt(endsAt)
    setPowerState('booting')
  }, [clearTimer, setPowerState])

  const cancel = useCallback(() => {
    if (powerStateRef.current !== 'booting') return
    clearTimer()
    clearDeadline()
    powerStateRef.current = 'off'
    setPowerState('off')
  }, [clearDeadline, clearTimer, setPowerState])

  const powerOff = useCallback(() => {
    clearTimer()
    clearDeadline()
    powerStateRef.current = 'off'
    setPowerState('off')
  }, [clearDeadline, clearTimer, setPowerState])

  useEffect(() => {
    if (powerState !== 'booting' || startupEndsAt === null) {
      clearTimer()
      return
    }

    const completeIfDue = () => {
      const deadline = startupEndsAtRef.current
      if (powerStateRef.current !== 'booting' || deadline === null) return
      const remaining = deadline - Date.now()
      if (remaining > 0) {
        clearTimer()
        timerRef.current = setTimeout(completeIfDue, remaining)
        return
      }

      clearTimer()
      clearDeadline()
      powerStateRef.current = 'on'
      setPowerState('on')
      onReadyRef.current()
    }

    completeIfDue()
    const onClockResume = () => completeIfDue()
    window.addEventListener('focus', onClockResume)
    document.addEventListener('visibilitychange', onClockResume)
    return () => {
      clearTimer()
      window.removeEventListener('focus', onClockResume)
      document.removeEventListener('visibilitychange', onClockResume)
    }
  }, [clearDeadline, clearTimer, powerState, setPowerState, startupEndsAt])

  useEffect(() => () => clearTimer(), [clearTimer])

  return { startupEndsAt, start, cancel, powerOff }
}

export function useProjectedWagamiAPowerState(
  powerState: PowerState,
  startupEndsAt: number | null,
) {
  const [resolvedDeadline, setResolvedDeadline] = useState<number | null>(null)

  useEffect(() => {
    if (powerState !== 'booting' || startupEndsAt === null) return

    const resolve = () => {
      if (Date.now() >= startupEndsAt) {
        setResolvedDeadline(startupEndsAt)
        return true
      }
      return false
    }
    const timer = setTimeout(resolve, Math.max(0, startupEndsAt - Date.now()))
    const onClockResume = () => resolve()
    window.addEventListener('focus', onClockResume)
    document.addEventListener('visibilitychange', onClockResume)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', onClockResume)
      document.removeEventListener('visibilitychange', onClockResume)
    }
  }, [powerState, startupEndsAt])

  if (powerState !== 'booting') return powerState
  if (startupEndsAt !== null && resolvedDeadline === startupEndsAt) return 'on'
  return 'booting'
}
