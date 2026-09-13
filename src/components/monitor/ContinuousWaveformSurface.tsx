import type { ReactNode } from 'react'

type ContinuousWaveformSurfaceProps = {
  waveform: ReactNode
  temporarySurface: ReactNode
  temporarySurfaceActive: boolean
}

export function ContinuousWaveformSurface({
  waveform,
  temporarySurface,
  temporarySurfaceActive,
}: ContinuousWaveformSurfaceProps) {
  return (
    <div className="relative h-full min-h-0 w-full min-w-0 overflow-hidden">
      <div
        data-testid="continuous-waveform-layer"
        aria-hidden={temporarySurfaceActive ? true : undefined}
        className="absolute inset-0 min-h-0 min-w-0 overflow-hidden"
      >
        {waveform}
      </div>
      {temporarySurfaceActive && (
        <div
          data-testid="temporary-monitor-surface"
          className="absolute inset-0 z-10 min-h-0 min-w-0 overflow-hidden bg-black"
        >
          {temporarySurface}
        </div>
      )}
    </div>
  )
}
