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
}

export function MonitorLayout({
  topBar,
  subBar,
  sidebar,
  main,
  vitals,
  bottomBar,
}: MonitorLayoutProps) {
  const showBottom = bottomBar !== undefined && bottomBar !== null

  const rowsClass = showBottom
    ? 'grid-rows-[32px_24px_1fr_40px]'
    : 'grid-rows-[32px_24px_1fr]'

  return (
    <div
      className={cn(
        'w-full h-full overflow-hidden bg-black text-white',
        'grid grid-cols-[56px_1fr_220px]',
        rowsClass,
      )}
    >
      <div className="col-span-3 row-start-1">{topBar}</div>
      <div className="col-span-3 row-start-2">{subBar}</div>
      <div className="row-start-3 col-start-1 border-r border-neutral-800">{sidebar}</div>
      <div className="row-start-3 col-start-2 overflow-hidden">{main}</div>
      <div className="row-start-3 col-start-3 border-l border-neutral-800">{vitals}</div>
      {showBottom && <div className="col-span-3 row-start-4">{bottomBar}</div>}
    </div>
  )
}
