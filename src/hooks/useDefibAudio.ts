'use client'

import { useEffect } from 'react'
import type { DefibState } from '@/hooks/useDefibSequence'
import {
  pauseChargeBeep,
  pauseShockReadyBeep,
  playChargeBeep,
  playShockReadyBeep,
} from '@/lib/audio'

/**
 * Plays the defib charge beep while charging and the shock-ready beep while
 * charged / shock-advised, unless muted. Mirrors the hardware audio cues.
 */
export function useDefibAudio(defibState: DefibState, isMuted: boolean) {
  useEffect(() => {
    if (defibState === 'charging' && !isMuted) {
      playChargeBeep()
      return pauseChargeBeep
    }
    pauseChargeBeep()
    return undefined
  }, [defibState, isMuted])

  useEffect(() => {
    if ((defibState === 'charged' || defibState === 'shock_advised') && !isMuted) {
      playShockReadyBeep()
      return pauseShockReadyBeep
    }
    pauseShockReadyBeep()
    return undefined
  }, [defibState, isMuted])
}
