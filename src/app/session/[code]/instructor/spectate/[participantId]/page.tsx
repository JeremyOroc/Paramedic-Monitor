'use client'

import { useParams } from 'next/navigation'

import { SpectatorMonitor } from '@/components/instructor/SpectatorMonitor'
import { useSpectatorProjection } from '@/hooks/useSpectatorProjection'
import { isConnected } from '@/lib/sessionRoster'
import { cn } from '@/lib/utils'

export default function SpectatePage() {
  const params = useParams<{ code: string; participantId: string }>()
  const code = params.code.toUpperCase()
  const { data, connectionLost, connecting, now } = useSpectatorProjection({
    code,
    participantId: params.participantId,
  })

  const envelope = data?.projection ?? null
  const traineeOffline = data ? !isConnected(data.participant.last_seen_at, now) : false
  const roomEnded = data?.session.status === 'ended'
  const connectionLabel = connecting
    ? 'Connecting to trainee…'
    : connectionLost
      ? 'Spectator connection lost'
      : roomEnded
        ? 'Room ended'
        : traineeOffline && !envelope
          ? 'Trainee offline · No monitor received'
          : traineeOffline
            ? 'Trainee offline'
            : envelope
              ? 'Live'
              : 'Waiting for trainee monitor'

  return (
    <main className="flex h-screen min-w-[1024px] flex-col overflow-hidden bg-black text-white">
      <header className="flex h-12 shrink-0 items-center gap-5 border-b border-neutral-800 bg-neutral-950 px-4 font-mono text-xs uppercase tracking-wider">
        <strong className="text-white">{data?.participant.nickname ?? 'Student'}</strong>
        <span className="text-neutral-400">
          {envelope?.projection.model === 'wagamiZ' ? 'Wagami Z' : envelope ? 'Wagami X' : 'Monitor pending'}
        </span>
        <span
          role="status"
          className={cn(
            'ml-auto font-bold',
            !connectionLost && !traineeOffline && !roomEnded && envelope
              ? 'text-ecg-green'
              : connectionLost || traineeOffline
                ? 'text-pending-amber'
                : 'text-neutral-400',
          )}
        >
          {connectionLabel}
        </span>
        <span className="text-neutral-500">
          {envelope && (connectionLost || traineeOffline || roomEnded)
            ? `Updated ${new Date(envelope.updatedAt).toLocaleTimeString()}`
            : envelope
              ? null
              : `Attempt ${data?.session.active_attempt_version ?? '—'}`}
        </span>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {envelope ? (
          <div inert className="h-full w-full select-none pointer-events-none" aria-label="Read-only student monitor">
            <SpectatorMonitor projection={envelope.projection} />
          </div>
        ) : (
          <div className="grid h-full place-items-center bg-black">
            <div className="text-center font-mono uppercase tracking-[0.25em] text-neutral-500">
              <p>{roomEnded ? 'Room ended' : 'Waiting for trainee monitor'}</p>
              {!roomEnded ? <p className="mt-3 text-xs text-neutral-700">The view appears when the student opens the monitor.</p> : null}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
