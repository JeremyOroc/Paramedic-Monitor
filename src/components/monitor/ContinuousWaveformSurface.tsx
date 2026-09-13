'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ContinuousWaveformActivity = {
  occluded: boolean
  onReady: () => void
}

type ContinuousWaveformSurfaceProps = {
  waveform: (activity: ContinuousWaveformActivity) => ReactNode
  temporarySurface: (activity: ContinuousWaveformActivity) => ReactNode
  temporarySurfaceActive: boolean
}

type SurfaceName = 'waveform' | 'temporary'

type SurfaceState = {
  previousActive: boolean
  revealed: SurfaceName
  temporaryMounted: boolean
}

export function ContinuousWaveformSurface({
  waveform,
  temporarySurface,
  temporarySurfaceActive,
}: ContinuousWaveformSurfaceProps) {
  const targetSurface: SurfaceName = temporarySurfaceActive
    ? 'temporary'
    : 'waveform'
  const [surfaceState, setSurfaceState] = useState<SurfaceState>({
    previousActive: temporarySurfaceActive,
    revealed: targetSurface,
    temporaryMounted: temporarySurfaceActive,
  })
  if (surfaceState.previousActive !== temporarySurfaceActive) {
    const firstTemporaryEntry =
      temporarySurfaceActive && !surfaceState.temporaryMounted
    setSurfaceState({
      previousActive: temporarySurfaceActive,
      revealed: firstTemporaryEntry ? 'temporary' : surfaceState.revealed,
      temporaryMounted:
        surfaceState.temporaryMounted || temporarySurfaceActive,
    })
  }
  const firstTemporaryEntry =
    temporarySurfaceActive && !surfaceState.temporaryMounted
  const visibleSurface = firstTemporaryEntry
    ? 'temporary'
    : surfaceState.revealed
  const mountTemporary =
    temporarySurfaceActive || surfaceState.temporaryMounted

  const revealWaveform = useCallback(() => {
    if (!temporarySurfaceActive) {
      setSurfaceState((current) => ({ ...current, revealed: 'waveform' }))
    }
  }, [temporarySurfaceActive])

  const revealTemporary = useCallback(() => {
    if (temporarySurfaceActive) {
      setSurfaceState((current) => ({ ...current, revealed: 'temporary' }))
    }
  }, [temporarySurfaceActive])

  // Keep the currently visible source alive while its target rebuilds. Once the
  // target reports ready, the source becomes occluded and stops issuing draws.
  const waveformOccluded =
    visibleSurface !== 'waveform' && targetSurface !== 'waveform'
  const temporaryOccluded =
    visibleSurface !== 'temporary' && targetSurface !== 'temporary'

  return (
    <div className="relative h-full min-h-0 w-full min-w-0 overflow-hidden">
      <div
        data-testid="continuous-waveform-layer"
        aria-hidden={visibleSurface !== 'waveform' ? true : undefined}
        className={cn(
          'absolute inset-0 min-h-0 min-w-0 overflow-hidden',
          visibleSurface !== 'waveform' && 'invisible pointer-events-none',
        )}
      >
        {waveform({
          occluded: waveformOccluded,
          onReady: revealWaveform,
        })}
      </div>
      {mountTemporary && (
        <div
          data-testid="temporary-monitor-surface"
          aria-hidden={visibleSurface !== 'temporary' ? true : undefined}
          className={cn(
            'absolute inset-0 z-10 min-h-0 min-w-0 overflow-hidden bg-black',
            visibleSurface !== 'temporary' && 'invisible pointer-events-none',
          )}
        >
          {temporarySurface({
            occluded: temporaryOccluded,
            onReady: revealTemporary,
          })}
        </div>
      )}
    </div>
  )
}
