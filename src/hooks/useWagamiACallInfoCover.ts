'use client'

import { useCallback, useState } from 'react'

import type { WagamiAView } from '@/types/wagamiA'

/** Keep the shell-free page visible until the covered monitor has rebuilt. */
export function useWagamiACallInfoCover(view: WagamiAView) {
  const [coverActive, setCoverActive] = useState(view === 'callInfo')
  if (view === 'callInfo' && !coverActive) setCoverActive(true)

  const onMonitorReady = useCallback(() => {
    if (view === 'monitor' && coverActive) setCoverActive(false)
  }, [coverActive, view])

  return { showCallInfo: view === 'callInfo' || coverActive, onMonitorReady }
}
