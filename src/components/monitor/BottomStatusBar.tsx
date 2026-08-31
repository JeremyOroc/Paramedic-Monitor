'use client'

import React, { useEffect, useRef, useState } from 'react'
import { DefibState } from '@/hooks/useDefibSequence'
import { useCPRTimer } from '@/hooks/useCPRTimer'
import { cn } from '@/lib/utils'
import { playSystemAudio, stopCprAudioSequence } from '@/lib/audio'

type BottomStatusBarProps = {
  defibState: DefibState
  joules: number
  shockCount: number
  cprStartTime: number | null
  lastDeliveredJoules?: number | null
}

export function BottomStatusBar({ defibState, joules, shockCount, cprStartTime, lastDeliveredJoules }: BottomStatusBarProps) {
  const { formatted: cprTime, isDone } = useCPRTimer(cprStartTime)
  const prevIsDone = useRef(isDone)
  const [checkPatient, setCheckPatient] = useState(false)

  // Stop CPR → Check Patient after 5 seconds.
  // Arms on entering the state and resets on leaving it, so `checkPatient` is no
  // longer a dependency — it used to be, which re-ran this effect every time the
  // flag flipped and made it re-enter its own else branch.
  useEffect(() => {
    if (!isDone || defibState !== 'cpr') return
    const timer = setTimeout(() => setCheckPatient(true), 5000)
    return () => {
      clearTimeout(timer)
      setCheckPatient(false)
    }
  }, [isDone, defibState])

  const [showDeliveredFlash, setShowDeliveredFlash] = useState(false)

  // Show "J DELIVERED" for 4 seconds when entering CPR from shock_advised.
  // The flash is raised from the effect body deliberately: it is triggered by a
  // prop transition rather than a user event, so there is no handler to set it
  // from, and it cannot be derived from the props either — two shocks at the
  // same energy give an identical lastDeliveredJoules, so a derived flag would
  // never re-show for the second one.
  useEffect(() => {
    if (defibState !== 'cpr' || lastDeliveredJoules == null) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    setShowDeliveredFlash(true)
    const timer = setTimeout(() => setShowDeliveredFlash(false), 4000)
    return () => {
      clearTimeout(timer)
      setShowDeliveredFlash(false)
    }
  }, [defibState, lastDeliveredJoules])

  useEffect(() => {
    if (isDone && !prevIsDone.current) {
      if (defibState === 'cpr') {
        stopCprAudioSequence()
        playSystemAudio('stop_cpr.mp3')
      }
    }
    prevIsDone.current = isDone
  }, [isDone, defibState])

  // Stop the metronome when CPR exits early (e.g. Analyse pressed mid-CPR)
  const prevDefibState = useRef(defibState)
  useEffect(() => {
    if (prevDefibState.current === 'cpr' && defibState !== 'cpr') {
      stopCprAudioSequence()
    }
    prevDefibState.current = defibState
  }, [defibState])

  const isCharging = defibState === 'charging'
  const isCharged = defibState === 'charged'
  const isDelivered = defibState === 'delivered'

  // Decide if we are in CPR mode layout or Defib mode layout
  const isDefibLayout =
    defibState === 'charge_prompt' ||
    defibState === 'charging' ||
    defibState === 'charged' ||
    defibState === 'delivered'

  if (isDefibLayout) {
    let defibBoxContent = (
      <>
        <div className="bg-ecg-green text-black px-2 py-0.5 font-bold uppercase text-xs w-full text-center">Defibrillator</div>
        <div className="flex-1 flex flex-col items-center justify-center bg-black border border-white mx-1 mb-1 relative overflow-hidden">
          <span className="text-white text-xl font-bold">Confirm Energy</span>
          <span className="text-white text-xl font-bold">Press CHARGE</span>
        </div>
      </>
    )

    if (isCharging) {
      defibBoxContent = (
        <>
          <div className="bg-ecg-green text-black px-2 py-0.5 font-bold uppercase text-xs w-full text-center">Defibrillator</div>
          <div className="flex-1 flex flex-col items-center justify-center border border-yellow-spO2 mx-1 mb-1 animate-[chargePulse_0.2s_infinite] overflow-hidden">
            <span className="text-xl font-bold uppercase">Charging</span>
          </div>
        </>
      )
    } else if (isCharged) {
      defibBoxContent = (
        <>
          <div className="bg-ecg-green text-black px-2 py-0.5 font-bold uppercase text-xs w-full text-center">Defibrillator</div>
          <div className="flex-1 flex flex-col items-center justify-center bg-yellow-400 mx-1 mb-1 overflow-hidden">
            <span className="text-black text-3xl font-bold uppercase tracking-wide">Charged</span>
          </div>
        </>
      )
    } else if (isDelivered) {
      defibBoxContent = (
        <>
          <div className="bg-ecg-green text-black px-2 py-0.5 font-bold uppercase text-xs w-full text-center">Defibrillator</div>
          <div className="flex-1 flex flex-col items-center justify-center bg-ecg-green mx-1 mb-1 overflow-hidden">
            <span className="text-black text-xl font-bold tracking-wide">Delivered Energy</span>
            <span className="text-black text-2xl font-bold tracking-wide">{joules} J</span>
          </div>
        </>
      )
    }

    return (
      <div className="w-full h-full flex bg-bottom-bar p-1 gap-1 border-t border-t-neutral-600 font-sans">
        {/* Left: Defib Info */}
        <div className="flex-[1.5] flex flex-col border border-white overflow-hidden">
          {defibBoxContent}
        </div>

        {/* Middle: Shock count */}
        <div className="w-20 border border-white flex flex-col items-center">
          <div className="flex items-center justify-center py-1">
            <span className="text-white text-2xl">⚡</span>
          </div>
          <div className="flex-1 flex items-center justify-center text-white text-4xl font-bold">
            {shockCount}
          </div>
        </div>

        {/* Right: Selected Energy */}
        <div className="flex-1 flex flex-col border border-white overflow-hidden">
          <div className="bg-ecg-green text-black px-2 py-0.5 font-bold text-xs uppercase self-start w-full text-center">Selected energy</div>
          <div className={cn("flex-1 flex items-center justify-center mx-1 mb-1", isCharged && "bg-yellow-400 text-black", !isCharged && "bg-black text-white")}>
            <span className="text-6xl font-bold">{joules}</span>
            <span className="text-2xl font-bold mt-4 ml-1">J</span>
          </div>
        </div>
      </div>
    )
  }

  // CPR Layout
  let bannerBg = "bg-blue-600"
  let bannerText = "Perform CPR"
  let bannerTextColor = "text-white"
  
  if (defibState === 'analyzing_ecg') {
    bannerText = "ANALYZING ECG"
  } else if (defibState === 'analyzing_clear') {
    bannerText = "STAND CLEAR"
  } else if (defibState === 'shock_advised') {
    bannerText = "SHOCK ADVISED"
    bannerBg = "bg-white"
    bannerTextColor = "text-[#ff2020]"
  } else if (defibState === 'analyzing_result') {
    bannerText = "SHOCK NOT ADVISED"
    bannerBg = "bg-white"
    bannerTextColor = "text-[#ff2020]"
  } else if (defibState === 'idle') {
    bannerText = "APPL ELECT."
    bannerBg = "bg-yellow-500"
    bannerTextColor = "text-black"
  } else if (defibState === 'cpr' && isDone) {
    bannerText = checkPatient ? "Check Patient" : "Stop CPR"
    bannerBg = "bg-white"
    bannerTextColor = "text-black"
  }

  const isShockAdvised = defibState === 'shock_advised'
  const inEval = defibState === 'analyzing_result'
  const showJoulesSelected = !isShockAdvised && (defibState === 'cpr' || defibState === 'analyzing_ecg' || defibState === 'analyzing_clear')
  const showCprTime = defibState === 'cpr'
  const showDelivered = defibState === 'cpr' && lastDeliveredJoules != null && showDeliveredFlash

  return (
    <div className="w-full h-full flex flex-col p-1 gap-1 border-t border-t-neutral-600 font-sans">
      <div className={cn("flex-1 border border-white flex items-center justify-center", bannerBg, bannerTextColor)}>
        <span className="text-4xl font-bold">{bannerText}</span>
      </div>
      
      <div className="flex flex-1 gap-1 mt-1">
        {/* Bottom-left box */}
        {isShockAdvised ? (
          <div className="w-64 border border-white flex items-center justify-center bg-[#cc0000]">
            <span className="text-2xl font-bold text-white">{joules} J READY</span>
          </div>
        ) : showDelivered ? (
          <div className="w-64 border border-white flex items-center justify-center bg-[#67FEC8]">
            <span className="text-2xl font-bold text-black">{lastDeliveredJoules} J DELIVERED</span>
          </div>
        ) : (
          <div className="w-64 border border-white flex items-center justify-center bg-black">
            {showJoulesSelected && !inEval && <span className="text-2xl font-bold text-white">{joules} J SELECTED</span>}
          </div>
        )}
        
        <div className={cn("flex-1 border border-white flex flex-col items-center justify-center", showCprTime && !inEval && !isShockAdvised ? "bg-white" : "bg-black")}>
          {showCprTime && !inEval && !isShockAdvised && (
            <>
              <span className="text-black text-xs font-bold leading-none">CPR Time</span>
              <span className="text-black text-2xl font-bold leading-none">{cprTime}</span>
            </>
          )}
        </div>
        
        <div className="w-32 border border-white flex items-center justify-center space-x-2 bg-black">
          <span className="text-yellow-400 text-3xl">⚡</span>
          <span className="text-white text-3xl font-bold">{shockCount}</span>
        </div>
      </div>
    </div>
  )
}
