'use client'

import React from 'react'
import { DefibState } from '@/hooks/useDefibSequence'
import { useCPRTimer } from '@/hooks/useCPRTimer'
import { cn } from '@/lib/utils'

type BottomStatusBarProps = {
  defibState: DefibState
  joules: number
  shockCount: number
  cprStartTime: number | null
}

export function BottomStatusBar({ defibState, joules, shockCount, cprStartTime }: BottomStatusBarProps) {
  const cprTime = useCPRTimer(cprStartTime)

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
        <div className="bg-ecg-green text-black px-2 py-0.5 font-bold uppercase text-xs">Defibrillator</div>
        <div className="flex-1 flex flex-col items-center justify-center bg-black border border-white mx-1 mb-1 relative overflow-hidden">
          <span className="text-white text-xl font-bold">Confirm Energy</span>
          <span className="text-white text-xl font-bold">Press CHARGE</span>
        </div>
      </>
    )

    if (isCharging) {
      defibBoxContent = (
        <>
          <div className="bg-ecg-green text-black px-2 py-0.5 font-bold uppercase text-xs">Defibrillator</div>
          <div className="flex-1 flex flex-col items-center justify-center border border-yellow-spO2 mx-1 mb-1 animate-[chargePulse_0.2s_infinite]">
            <span className="text-xl font-bold uppercase">Charging</span>
          </div>
        </>
      )
    } else if (isCharged) {
      defibBoxContent = (
        <>
          <div className="bg-ecg-green text-black px-2 py-0.5 font-bold uppercase text-xs">Defibrillator</div>
          <div className="flex-1 flex flex-col items-center justify-center bg-yellow-400 mx-1 mb-1">
            <span className="text-black text-3xl font-bold uppercase tracking-wide">Charged</span>
          </div>
        </>
      )
    } else if (isDelivered) {
      defibBoxContent = (
        <>
          <div className="bg-ecg-green text-black px-2 py-0.5 font-bold uppercase text-xs">Defibrillator</div>
          <div className="flex-1 flex flex-col items-center justify-center bg-ecg-green mx-1 mb-1">
            <span className="text-black text-xl font-bold tracking-wide">Delivered Energy</span>
            <span className="text-black text-2xl font-bold tracking-wide">{joules} J</span>
          </div>
        </>
      )
    }

    return (
      <div className="w-full h-full flex bg-bottom-bar p-1 gap-1 border-t border-t-neutral-600 font-sans">
        {/* Left: Defib Info */}
        <div className="flex-1 flex flex-col border border-white">
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
        <div className="flex-1 flex flex-col border border-white">
          <div className="bg-ecg-green text-black px-2 py-0.5 font-bold text-xs uppercase self-start w-full">Selected energy</div>
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
  
  if (defibState === 'analyzing_ecg') {
    bannerText = "ANALYZING ECG"
  } else if (defibState === 'analyzing_clear') {
    bannerText = "STAND CLEAR"
  } else if (defibState === 'analyzing_result') {
    bannerText = "SHOCK NOT ADVISED"
  } else if (defibState === 'idle') {
    bannerText = "APPL ELECT."
    bannerBg = "bg-yellow-500 text-black"
  }

  return (
    <div className="w-full h-full flex flex-col p-1 gap-1 border-t border-t-neutral-600 font-sans">
      <div className={cn("flex-1 border border-white flex items-center justify-center", bannerBg, defibState === 'idle' ? 'text-black' : 'text-white')}>
        <span className="text-4xl font-bold">{bannerText}</span>
      </div>
      
      <div className="flex flex-1 gap-1 mt-1">
        <div className="w-64 border border-white flex items-center justify-center bg-black">
          {defibState === 'cpr' && <span className="text-2xl font-bold text-white">{joules} J SELECTED</span>}
        </div>
        
        <div className="flex-1 border border-white bg-white flex flex-col items-center justify-center">
          <span className="text-black text-xs font-bold leading-none">CPR Time</span>
          <span className="text-black text-2xl font-bold leading-none">{defibState === 'cpr' ? cprTime : ""}</span>
        </div>
        
        <div className="w-32 border border-white flex items-center justify-center space-x-2 bg-black">
          <span className="text-yellow-400 text-3xl">⚡</span>
          <span className="text-white text-3xl font-bold">{shockCount}</span>
        </div>
      </div>
    </div>
  )
}
