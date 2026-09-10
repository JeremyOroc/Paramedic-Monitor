'use client'

import { useParams } from 'next/navigation'

import { SpectatorAvailabilityOverlay } from '@/components/instructor/SpectatorAvailabilityOverlay'
import { SpectatorMonitor } from '@/components/instructor/SpectatorMonitor'
import { useSpectatorProjection } from '@/hooks/useSpectatorProjection'
import { isConnected } from '@/lib/sessionRoster'
import {
  resolveSpectatorAvailability,
  spectatorAvailabilityAnnouncement,
} from '@/lib/spectatorAvailability'
import { cn } from '@/lib/utils'

export default function SpectatePage() {
  const params = useParams<{ code: string; participantId: string }>()
  const code = params.code.toUpperCase()
  const { data, connectionLost, connecting, now } = useSpectatorProjection({
    code,
    participantId: params.participantId,
  })

  const envelope = data?.projection ?? null
  const traineeConnected = data
    ? isConnected(data.participant.last_seen_at, now)
    : false
  const availability = resolveSpectatorAvailability({
    sessionStatus: data?.session.status ?? null,
    connecting,
    connectionLost,
    traineeConnected,
    hasProjection: envelope !== null,
    traineeName: data?.participant.nickname ?? 'trainee',
  })
  const showUpdatedAt = Boolean(envelope && !availability.isLive)

  return (
    <main className="flex h-screen min-w-[1024px] flex-col overflow-hidden bg-black text-white">
      <header className="flex h-12 shrink-0 items-center gap-5 border-b border-neutral-800 bg-neutral-950 px-4 font-mono text-xs uppercase tracking-wider">
        <strong className="text-white">{data?.participant.nickname ?? 'Student'}</strong>
        <span className="text-neutral-400">
          {envelope?.projection.model === 'wagamiZ' ? 'Wagami Z' : envelope ? 'Wagami X' : 'Monitor pending'}
        </span>
        <span
          aria-hidden={!availability.isLive}
          className={cn(
            'ml-auto font-bold',
            availability.isLive ? 'text-ecg-green' : 'text-transparent',
          )}
        >
          {availability.isLive ? 'Live' : null}
        </span>
        <span className="text-neutral-500">
          {showUpdatedAt && envelope
            ? `Updated ${new Date(envelope.updatedAt).toLocaleTimeString()}`
            : envelope
              ? null
              : `Attempt ${data?.session.active_attempt_version ?? '—'}`}
        </span>
      </header>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {spectatorAvailabilityAnnouncement(availability)}
      </p>
      <div className="spectator-availability-surface relative min-h-0 flex-1 overflow-hidden">
        {envelope ? (
          <div inert className="h-full w-full select-none pointer-events-none" aria-label="Read-only student monitor">
            <SpectatorMonitor projection={envelope.projection} />
          </div>
        ) : (
          <div className="h-full bg-black" />
        )}
        <SpectatorAvailabilityOverlay
          key={availability.kind}
          availability={availability}
          hasProjection={envelope !== null}
        />
      </div>
    </main>
  )
}
