'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type MonitorLayoutProps = {
  topBar: ReactNode
  subBar: ReactNode
  sidebar: ReactNode
  main: ReactNode
  vitals: ReactNode
  rightNav: ReactNode
  bottomBar?: ReactNode
  defibRow?: ReactNode
}

export function MonitorLayout({
  topBar,
  subBar,
  sidebar,
  main,
  vitals,
  rightNav,
  bottomBar,
  defibRow,
}: MonitorLayoutProps) {
  const showBottom = bottomBar !== undefined && bottomBar !== null
  const showDefib = defibRow !== undefined && defibRow !== null

  const rowsClass = (() => {
    if (showBottom && showDefib) return 'grid-rows-[32px_24px_1fr_40px_64px]'
    if (showBottom && !showDefib) return 'grid-rows-[32px_24px_1fr_40px]'
    if (!showBottom && showDefib) return 'grid-rows-[32px_24px_1fr_64px]'
    return 'grid-rows-[32px_24px_1fr]'
  })()

  return (
    <div
      className={cn(
        'w-screen h-screen overflow-hidden bg-black text-white',
        'min-w-[1024px]',
        'grid grid-cols-[56px_1fr_220px_56px]',
        rowsClass,
      )}
    >
      <div className="col-span-4 row-start-1">{topBar}</div>
      <div className="col-span-4 row-start-2">{subBar}</div>
      <div className="row-start-3 col-start-1 border-r border-neutral-800">{sidebar}</div>
      <div className="row-start-3 col-start-2 overflow-hidden">{main}</div>
      <div className="row-start-3 col-start-3 border-l border-neutral-800">{vitals}</div>
      <div className="row-start-3 col-start-4 border-l border-neutral-800">{rightNav}</div>
      {showBottom && <div className="col-span-4 row-start-4">{bottomBar}</div>}
      {showDefib && (
        <div className={cn('col-span-4', showBottom ? 'row-start-5' : 'row-start-4')}>
          {defibRow}
        </div>
      )}
    </div>
  )
}
