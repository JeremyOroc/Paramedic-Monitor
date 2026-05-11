'use client'

import { useEffect, useState } from 'react'
import { useMonitorStore } from '@/store/monitorStore'

/**
 * Trigger client-side rehydration of the persisted monitor store on mount.
 * Returns true once rehydration is complete so consumers can avoid rendering
 * stale defaults during the SSR → hydration window.
 */
export function useStoreHydration(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    const promise = useMonitorStore.persist.rehydrate()
    if (promise && typeof (promise as Promise<unknown>).then === 'function') {
      void (promise as Promise<unknown>).then(() => setHydrated(true))
    } else {
      setHydrated(true)
    }
  }, [])
  return hydrated
}
