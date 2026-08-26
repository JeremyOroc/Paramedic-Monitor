'use client'

import { useEffect, useState } from 'react'

import {
  deterministicVfHeartRate,
  getVfFlashIndex,
  randomVfHeartRate,
  VITAL_ALARM_FLASH_MS,
  type VfDisplaySync,
} from '@/lib/automaticHeartRate'

type UseVfDisplayHeartRateOptions = {
  enabled: boolean
  underlyingHeartRate: number
  sync?: VfDisplaySync | null
}

export function useVfDisplayHeartRate({
  enabled,
  underlyingHeartRate,
  sync,
}: UseVfDisplayHeartRateOptions): number {
  const [randomHeartRate, setRandomHeartRate] = useState(underlyingHeartRate)
  const syncEpochMs = sync?.epochMs
  const syncSeed = sync?.seed
  const serverOffsetMs = sync?.serverOffsetMs

  useEffect(() => {
    if (!enabled) return

    if (syncEpochMs !== undefined && syncSeed !== undefined && serverOffsetMs !== undefined) {
      const activeSync: VfDisplaySync = {
        epochMs: syncEpochMs,
        seed: syncSeed,
        serverOffsetMs,
      }
      const update = () => {
        const flashIndex = getVfFlashIndex(activeSync, Date.now())
        setRandomHeartRate(deterministicVfHeartRate(syncSeed, flashIndex))
      }
      const initialUpdate = window.setTimeout(update, 0)

      const serverNowMs = Date.now() + serverOffsetMs
      const elapsedMs = Math.max(0, serverNowMs - syncEpochMs)
      const untilNextFlashMs = VITAL_ALARM_FLASH_MS - (elapsedMs % VITAL_ALARM_FLASH_MS)
      let interval: number | null = null
      const timeout = window.setTimeout(() => {
        update()
        interval = window.setInterval(update, VITAL_ALARM_FLASH_MS)
      }, untilNextFlashMs)

      return () => {
        window.clearTimeout(initialUpdate)
        window.clearTimeout(timeout)
        if (interval !== null) window.clearInterval(interval)
      }
    }

    const initialUpdate = window.setTimeout(
      () => setRandomHeartRate(randomVfHeartRate()),
      0,
    )
    const interval = window.setInterval(
      () => setRandomHeartRate(randomVfHeartRate()),
      VITAL_ALARM_FLASH_MS,
    )
    return () => {
      window.clearTimeout(initialUpdate)
      window.clearInterval(interval)
    }
  }, [enabled, serverOffsetMs, syncEpochMs, syncSeed])

  return enabled ? randomHeartRate : underlyingHeartRate
}
