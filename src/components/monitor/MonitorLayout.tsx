'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type MonitorLayoutProps = {
  topBar: ReactNode
  subBar: ReactNode
  sidebar: ReactNode
  main: ReactNode
  vitals: ReactNode
  bottomBar?: ReactNode
  energyColumn?: ReactNode
}

export function MonitorLayout({
  topBar,
  subBar,
  sidebar,
  main,
  vitals,
  bottomBar,
  energyColumn
}: MonitorLayoutProps) {
  const showBottom = bottomBar !== undefined && bottomBar !== null
  const showEnergy = energyColumn !== undefined && energyColumn !== null
  const showVitals = vitals !== undefined && vitals !== null

  const rowsClass = showBottom
    ? 'grid-rows-[32px_24px_1fr_110px]'
    : 'grid-rows-[32px_24px_1fr]'
    
  const colsClass = showEnergy
    ? (showVitals ? 'grid-cols-[56px_1fr_80px_96px]' : 'grid-cols-[56px_1fr_80px]')
    : (showVitals ? 'grid-cols-[56px_1fr_96px]' : 'grid-cols-[56px_1fr]')

  const topColSpanClass = 
    showEnergy && showVitals ? 'col-span-4' : 
    showEnergy || showVitals ? 'col-span-3' : 'col-span-2'

  return (
    <div
      className={cn(
        'w-full h-full overflow-hidden bg-black text-white',
        'grid',
        colsClass,
        rowsClass,
      )}
    >
      <div className={cn("row-start-1", topColSpanClass)}>{topBar}</div>
      <div className={cn("row-start-2", topColSpanClass)}>{subBar}</div>
      
      <div className={cn("row-start-3 col-start-1 border-r border-neutral-800 min-h-0 flex flex-col", showBottom && "row-span-2")}>{sidebar}</div>
      <div className="row-start-3 col-start-2 overflow-hidden min-h-0 flex flex-col">{main}</div>
      
      {showEnergy && (
        <div className="row-start-3 row-span-2 col-start-3 border-l border-neutral-800 min-h-0">
          {energyColumn}
        </div>
      )}
      
      {showVitals && (
        <div className={cn("row-start-3 border-l border-neutral-800 min-h-0", showBottom && "row-span-2", showEnergy ? "col-start-4" : "col-start-3")}>{vitals}</div>
      )}
      
      {showBottom && <div className="row-start-4 col-start-2">{bottomBar}</div>}
    </div>
  )
}
