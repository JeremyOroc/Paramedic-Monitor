'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type MonitorLayoutProps = {
  topBar: ReactNode
  subBar: ReactNode
  sidebar: ReactNode
  main: ReactNode
  vitals: ReactNode
  vitalsPlacement?: 'right' | 'bottom'
  bottomBar?: ReactNode
  energyColumn?: ReactNode
}

export function MonitorLayout({
  topBar,
  subBar,
  sidebar,
  main,
  vitals,
  vitalsPlacement = 'right',
  bottomBar,
  energyColumn,
}: MonitorLayoutProps) {
  const showEnergy = energyColumn !== undefined && energyColumn !== null
  const showVitals = vitals !== undefined && vitals !== null
  const showBottomVitals = showVitals && vitalsPlacement === 'bottom'
  const showRightVitals = showVitals && vitalsPlacement === 'right'
  const showBottomBar =
    !showBottomVitals && bottomBar !== undefined && bottomBar !== null
  const showBottomRow = showBottomVitals || showBottomBar

  const rowsClass = showBottomRow
    ? 'grid-rows-[32px_24px_1fr_110px]'
    : 'grid-rows-[32px_24px_1fr]'

  const colsClass = showEnergy
    ? (showRightVitals ? 'grid-cols-[56px_1fr_80px_96px]' : 'grid-cols-[56px_1fr_80px]')
    : (showRightVitals ? 'grid-cols-[56px_1fr_96px]' : 'grid-cols-[56px_1fr]')

  const topColSpanClass =
    showEnergy && showRightVitals
      ? 'col-span-4'
      : showEnergy || showRightVitals
        ? 'col-span-3'
        : 'col-span-2'

  return (
    <div
      className={cn(
        'w-full h-full overflow-hidden bg-black text-white',
        'grid',
        colsClass,
        rowsClass,
      )}
    >
      <div className={cn('row-start-1', topColSpanClass)}>{topBar}</div>
      <div className={cn('row-start-2', topColSpanClass)}>{subBar}</div>

      <div className={cn('row-start-3 col-start-1 border-r border-neutral-800 min-h-0 flex flex-col', showBottomRow && 'row-span-2')}>{sidebar}</div>
      <div className="row-start-3 col-start-2 overflow-hidden min-h-0 flex flex-col">{main}</div>

      {showEnergy && (
        <div
          data-testid="monitor-energy-region"
          className={cn('row-start-3 col-start-3 border-l border-neutral-800 min-h-0', showBottomRow && 'row-span-2')}
        >
          {energyColumn}
        </div>
      )}

      {showVitals && (
        <div
          data-testid="monitor-vitals-region"
          data-placement={vitalsPlacement}
          className={cn(
            'min-h-0',
            showBottomVitals
              ? 'row-start-4 col-start-2 border-t border-neutral-800'
              : cn(
                  'row-start-3 border-l border-neutral-800',
                  showBottomRow && 'row-span-2',
                  showEnergy ? 'col-start-4' : 'col-start-3',
                ),
          )}
        >
          {vitals}
        </div>
      )}

      {showBottomBar && <div className="row-start-4 col-start-2">{bottomBar}</div>}
    </div>
  )
}
