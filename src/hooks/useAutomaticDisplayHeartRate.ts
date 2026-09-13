'use client'

import { useEffect, useState } from 'react'

import {
  deterministicVfHeartRate,
  getTorsadesPacketDurationMs,
  getTorsadesPacketState,
  getVfFlashIndex,
  randomTorsadesHeartRate,
  randomVfHeartRate,
  VITAL_ALARM_FLASH_MS,
  type HeartRateDisplaySync,
} from '@/lib/automaticHeartRate'
import type { Rhythm } from '@/types/vitals'

type UseAutomaticDisplayHeartRateOptions = {
  enabled: boolean
  rhythm: Rhythm
  underlyingHeartRate: number
  sync?: HeartRateDisplaySync | null
}

export function useAutomaticDisplayHeartRate({
  enabled,
  rhythm,
  underlyingHeartRate,
  sync,
}: UseAutomaticDisplayHeartRateOptions): number {
  const [dynamicHeartRate, setDynamicHeartRate] = useState(underlyingHeartRate)
  const syncEpochMs = sync?.epochMs
  const syncSeed = sync?.seed
  const serverOffsetMs = sync?.serverOffsetMs
  const dynamicRhythm = enabled && (rhythm === 'vf' || rhythm === 'torsades')

  useEffect(() => {
    if (!dynamicRhythm) return

    if (syncEpochMs !== undefined && syncSeed !== undefined && serverOffsetMs !== undefined) {
      const activeSync: HeartRateDisplaySync = {
        epochMs: syncEpochMs,
        seed: syncSeed,
        serverOffsetMs,
      }

      if (rhythm === 'vf') {
        const update = () => {
          const flashIndex = getVfFlashIndex(activeSync, Date.now())
          setDynamicHeartRate(deterministicVfHeartRate(syncSeed, flashIndex))
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

      let timeout: number | null = null
      const update = () => {
        const packet = getTorsadesPacketState(activeSync, Date.now())
        setDynamicHeartRate(packet.heartRate)
        const serverNowMs = Date.now() + serverOffsetMs
        timeout = window.setTimeout(update, Math.max(1, packet.endsAtMs - serverNowMs))
      }
      const initialUpdate = window.setTimeout(update, 0)
      return () => {
        window.clearTimeout(initialUpdate)
        if (timeout !== null) window.clearTimeout(timeout)
      }
    }

    if (rhythm === 'vf') {
      const initialUpdate = window.setTimeout(
        () => setDynamicHeartRate(randomVfHeartRate()),
        0,
      )
      const interval = window.setInterval(
        () => setDynamicHeartRate(randomVfHeartRate()),
        VITAL_ALARM_FLASH_MS,
      )
      return () => {
        window.clearTimeout(initialUpdate)
        window.clearInterval(interval)
      }
    }

    let timeout: number | null = null
    const update = () => {
      const heartRate = randomTorsadesHeartRate()
      setDynamicHeartRate(heartRate)
      timeout = window.setTimeout(update, getTorsadesPacketDurationMs(heartRate))
    }
    const initialUpdate = window.setTimeout(update, 0)
    return () => {
      window.clearTimeout(initialUpdate)
      if (timeout !== null) window.clearTimeout(timeout)
    }
  }, [dynamicRhythm, rhythm, serverOffsetMs, syncEpochMs, syncSeed])

  return dynamicRhythm ? dynamicHeartRate : underlyingHeartRate
}
