'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export function EnergyScaleColumn({ progress, isCharged, selectedEnergy }: { progress: number, isCharged: boolean, selectedEnergy: number }) {
  const levels = [
    200, 150, 120, 100, 85, 70, 50, 30, 20, 15, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
  ]

  return (
    <div className="flex flex-col h-full w-full bg-white border-l border-neutral-600 font-sans">
      {levels.map((level) => {
        // filter levels to only selected and below
        const selectedIndex = levels.findIndex(l => l <= selectedEnergy)
        const relevantLevels = levels.slice(selectedIndex)
        const totalRelevant = relevantLevels.length
        
        let isFilled = false
        const isTopSelected = level === selectedEnergy
        
        if (level > selectedEnergy) {
          isFilled = false
        } else {
          const indexFromBottom = totalRelevant - 1 - relevantLevels.indexOf(level)
          const threshold = indexFromBottom / totalRelevant
          isFilled = progress > threshold || isCharged || (progress === 0 && !isCharged) // Base selecting visual logic handled below
        }

        const isSelectingOnly = progress === 0 && !isCharged
        
        let bgColor = 'bg-black'
        let textColor = 'text-neutral-400'

        if (isTopSelected) {
          if (isSelectingOnly) {
            bgColor = 'bg-blue-600'
            textColor = 'text-white'
          } else {
            bgColor = isFilled ? (isCharged ? 'bg-orange-500' : 'bg-blue-600') : 'bg-black'
            textColor = isFilled ? 'text-white' : 'text-neutral-400'
          }
        } else if (level < selectedEnergy) {
           if (isFilled && !isSelectingOnly) {
             bgColor = 'bg-white'
             textColor = 'text-black'
           }
        }

        return (
          <div 
            key={level} 
            className={cn(
              "flex-1 flex items-center justify-center border-b border-neutral-700 text-[10px] sm:text-xs font-bold font-mono",
              bgColor, 
              textColor,
              bgColor === 'bg-black' && "border-neutral-800"
            )}
          >
            {level}
          </div>
        )
      })}
    </div>
  )
}
