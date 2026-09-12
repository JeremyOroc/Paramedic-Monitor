'use client'

import { useEffect } from 'react'

export const MONITOR_VIEWPORT_LOCK_CLASS = 'monitor-viewport-lock'

export function useMonitorViewportLock(): void {
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const rootWasLocked = root.classList.contains(MONITOR_VIEWPORT_LOCK_CLASS)
    const bodyWasLocked = body.classList.contains(MONITOR_VIEWPORT_LOCK_CLASS)
    const viewport = window.visualViewport

    const restoreOrigin = () => {
      if (window.scrollX === 0 && window.scrollY === 0) return
      window.scrollTo(0, 0)
    }

    root.classList.add(MONITOR_VIEWPORT_LOCK_CLASS)
    body.classList.add(MONITOR_VIEWPORT_LOCK_CLASS)
    restoreOrigin()

    window.addEventListener('scroll', restoreOrigin, { passive: true })
    viewport?.addEventListener('scroll', restoreOrigin, { passive: true })
    viewport?.addEventListener('resize', restoreOrigin, { passive: true })

    return () => {
      window.removeEventListener('scroll', restoreOrigin)
      viewport?.removeEventListener('scroll', restoreOrigin)
      viewport?.removeEventListener('resize', restoreOrigin)
      if (!rootWasLocked) root.classList.remove(MONITOR_VIEWPORT_LOCK_CLASS)
      if (!bodyWasLocked) body.classList.remove(MONITOR_VIEWPORT_LOCK_CLASS)
    }
  }, [])
}
