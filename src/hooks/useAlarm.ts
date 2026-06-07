'use client'

import { useEffect } from 'react'

import { pauseAlarm, playAlarm } from '@/lib/audio'
import {
  getActiveAlarms,
  type AlarmChannel,
  type VitalActiveState,
  type VitalsSnapshot,
} from '@/types/vitals'

type AlarmVitals = Pick<VitalsSnapshot, 'hr' | 'bp_sys' | 'bp_dia' | 'spo2'>

type UseAlarmResult = {
  activeAlarms: AlarmChannel[]
  isAlarming: boolean
}

export function useAlarm(
  vitals: AlarmVitals,
  isPoweredOn = true,
  isMuted = false,
  enabled = true,
  active?: Partial<VitalActiveState>,
): UseAlarmResult {
  const activeAlarms = enabled ? getActiveAlarms(vitals, active) : []
  const isAlarming = activeAlarms.length > 0

  useEffect(() => {
    if (isAlarming && enabled && isPoweredOn && !isMuted) {
      playAlarm()
      return pauseAlarm
    }

    pauseAlarm()
    return undefined
  }, [enabled, isAlarming, isPoweredOn, isMuted])

  return { activeAlarms, isAlarming }
}
