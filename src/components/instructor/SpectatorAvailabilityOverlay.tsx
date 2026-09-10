import type { SpectatorAvailability } from '@/lib/spectatorAvailability'
import { cn } from '@/lib/utils'

type SpectatorAvailabilityOverlayProps = {
  availability: SpectatorAvailability
  hasProjection: boolean
}

export function SpectatorAvailabilityOverlay({
  availability,
  hasProjection,
}: SpectatorAvailabilityOverlayProps) {
  if (availability.isLive) return null

  return (
    <div
      aria-hidden="true"
      data-availability-kind={availability.kind}
      data-testid="spectator-availability-overlay"
      className={cn(
        'spectator-availability-overlay pointer-events-none absolute inset-0 z-10 grid place-items-center px-6 text-center',
        hasProjection ? 'bg-black/85' : 'bg-black',
      )}
    >
      <div className="max-w-[90%] font-mono uppercase tracking-[0.16em]">
        <p
          className={cn(
            'spectator-availability-headline font-black',
            availability.tone === 'degraded'
              ? 'text-pending-amber'
              : 'text-white',
          )}
        >
          {availability.headline}
        </p>
        {availability.detail ? (
          <p className="spectator-availability-detail mt-3 font-bold tracking-[0.12em] text-neutral-400">
            {availability.detail}
          </p>
        ) : null}
      </div>
    </div>
  )
}
