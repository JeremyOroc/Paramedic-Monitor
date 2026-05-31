'use client'

import { useEffect } from 'react'

import { pauseAlarm, playAlarm } from '@/lib/audio'
import { getActiveAlarms, type AlarmChannel, type VitalsSnapshot } from '@/types/vitals'

type AlarmVitals = Pick<VitalsSnapshot, 'hr' | 'bp_sys' | 'bp_dia' | 'spo2'>

type UseAlarmResult = {
  activeAlarms: AlarmChannel[]
  isAlarming: boolean
}

export function useAlarm(
  vitals: AlarmVitals,
  isPoweredOn = true,
  isMuted = false,
): UseAlarmResult {
  const activeAlarms = getActiveAlarms(vitals)
  const isAlarming = activeAlarms.length > 0

  useEffect(() => {
    if (isAlarming && isPoweredOn && !isMuted) {
      playAlarm()
      return pauseAlarm
    }

    pauseAlarm()
    return undefined
  }, [isAlarming, isPoweredOn, isMuted])

  return { activeAlarms, isAlarming }
}
