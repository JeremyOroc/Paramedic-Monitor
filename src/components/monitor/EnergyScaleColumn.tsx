'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export function EnergyScaleColumn({ progress, isCharged }: { progress: number, isCharged: boolean }) {
  const levels = [
    200, 150, 120, 100, 85, 70, 50, 30, 20, 15, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
  ]

  return (
    <div className="flex flex-col h-full w-full bg-white border-l border-neutral-600 font-sans">
      {levels.map((level, i) => {
        const indexFromBottom = levels.length - 1 - i
        // slightly offset threshold so it fills fluidly
        const threshold = indexFromBottom / levels.length
        
        const isTop = i === 0
        const isFilled = progress > threshold || isCharged

        const bgColor = isTop && isFilled ? 'bg-orange-500' : isFilled ? 'bg-white' : 'bg-black'
        const textColor = isTop && isFilled ? 'text-white' : isFilled ? 'text-black' : 'text-neutral-400'

        return (
          <div 
            key={level} 
            className={cn(
              "flex-1 flex items-center justify-center border-b border-neutral-700 text-[10px] sm:text-xs font-bold font-mono",
              bgColor, 
              textColor,
              !isFilled && "border-neutral-800"
            )}
          >
            {level}
          </div>
        )
      })}
    </div>
  )
}
