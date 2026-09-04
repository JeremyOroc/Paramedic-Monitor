'use client'

import { SpectatorMonitor } from '@/components/instructor/SpectatorMonitor'
import { useSpectatorProjection } from '@/hooks/useSpectatorProjection'
import { isConnected } from '@/lib/sessionRoster'
import { cn } from '@/lib/utils'

type EmbeddedSpectatorParticipant = {
  id: string
  nickname: string
  last_seen_at: string | null
}

type EmbeddedSpectatorPanelProps = {
  code: string
  hostToken: string
  participant: EmbeddedSpectatorParticipant | null
}

export function EmbeddedSpectatorPanel({
  code,
  hostToken,
  participant,
}: EmbeddedSpectatorPanelProps) {
  const { data, connectionLost, connecting, now } = useSpectatorProjection({
    code,
    hostToken,
    participantId: participant?.id ?? null,
  })

  if (!participant) {
    return (
      <section
        aria-label="Embedded spectator"
        className="grid h-[480px] min-w-0 place-items-center overflow-hidden bg-black"
      >
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-700">
          Select a student to spectate
        </p>
      </section>
    )
  }

  const envelope = data?.projection ?? null
  const lastSeenAt = data?.participant.last_seen_at ?? participant.last_seen_at
  const traineeConnected = isConnected(lastSeenAt, now)
  const roomEnded = data?.session.status === 'ended'
  const connectionLabel = connecting
    ? `Connecting to ${participant.nickname}…`
    : connectionLost
      ? 'Spectator connection lost'
      : roomEnded
        ? 'Room ended'
        : !traineeConnected && !envelope
          ? 'Trainee offline · No monitor received'
          : !traineeConnected
            ? 'Trainee offline'
            : envelope
              ? 'Live'
              : 'Waiting for trainee monitor'
  const showUpdatedAt = Boolean(
    envelope && (connectionLost || roomEnded || !traineeConnected),
  )

  return (
    <section
      aria-label={`Spectating ${participant.nickname}`}
      className="flex h-[480px] min-w-0 flex-col overflow-hidden bg-black"
    >
      <header className="flex h-9 shrink-0 items-center gap-3 border-b border-neutral-900 px-3 font-mono text-[10px] uppercase tracking-wider">
        <strong className="truncate text-white">{participant.nickname}</strong>
        <span className="shrink-0 text-neutral-500">
          {envelope?.projection.model === 'wagamiZ'
            ? 'Wagami Z'
            : envelope
              ? 'Wagami X'
              : 'Monitor pending'}
        </span>
        <span
          role="status"
          className={cn(
            'ml-auto truncate text-right font-bold',
            connectionLabel === 'Live'
              ? 'text-ecg-green'
              : connectionLost || !traineeConnected
                ? 'text-pending-amber'
                : 'text-neutral-500',
          )}
        >
          {connectionLabel}
        </span>
        {showUpdatedAt ? (
          <span className="shrink-0 text-neutral-600">
            Updated {new Date(envelope!.updatedAt).toLocaleTimeString()}
          </span>
        ) : null}
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {envelope ? (
          <div
            inert
            aria-label="Read-only student monitor"
            className="embedded-spectator-viewport pointer-events-none relative h-full w-full select-none overflow-hidden"
          >
            <div className="embedded-spectator-canvas h-[753px] w-[1024px] overflow-hidden bg-black">
              <SpectatorMonitor embedded projection={envelope.projection} />
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center bg-black px-6 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-600">
              {connectionLabel}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
