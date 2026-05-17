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

  const rowsClass = showBottom
    ? 'grid-rows-[32px_24px_1fr_110px]'
    : 'grid-rows-[32px_24px_1fr]'
    
  const colsClass = showEnergy
    ? 'grid-cols-[56px_1fr_40px_96px]'
    : 'grid-cols-[56px_1fr_96px]'

  return (
    <div
      className={cn(
        'w-full h-full overflow-hidden bg-black text-white',
        'grid',
        colsClass,
        rowsClass,
      )}
    >
      <div className={cn("row-start-1", showEnergy ? "col-span-4" : "col-span-3")}>{topBar}</div>
      <div className={cn("row-start-2", showEnergy ? "col-span-4" : "col-span-3")}>{subBar}</div>
      
      <div className={cn("row-start-3 col-start-1 border-r border-neutral-800 min-h-0 flex flex-col", showBottom && "row-span-2")}>{sidebar}</div>
      <div className="row-start-3 col-start-2 overflow-hidden min-h-0 flex flex-col">{main}</div>
      
      {showEnergy && (
        <div className="row-start-3 row-span-2 col-start-3 border-l border-neutral-800 bg-white min-h-0">
          {energyColumn}
        </div>
      )}
      
      <div className={cn("row-start-3 border-l border-neutral-800 min-h-0", showBottom && "row-span-2", showEnergy ? "col-start-4" : "col-start-3")}>{vitals}</div>
      
      {showBottom && <div className="row-start-4 col-start-2">{bottomBar}</div>}
    </div>
  )
}
