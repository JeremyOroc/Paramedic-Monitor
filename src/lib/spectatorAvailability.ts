export type SpectatorAvailabilityKind =
  | 'connecting'
  | 'room-ended'
  | 'connection-lost'
  | 'attempt-not-started'
  | 'trainee-offline'
  | 'waiting-for-monitor'
  | 'live'

export type SpectatorAvailability = {
  kind: SpectatorAvailabilityKind
  headline: string
  detail: string | null
  tone: 'neutral' | 'degraded' | 'live'
  isLive: boolean
}

type ResolveSpectatorAvailabilityOptions = {
  sessionStatus: 'waiting' | 'active' | 'ended' | null
  connecting: boolean
  connectionLost: boolean
  traineeConnected: boolean
  hasProjection: boolean
  traineeName: string
}

export function resolveSpectatorAvailability({
  sessionStatus,
  connecting,
  connectionLost,
  traineeConnected,
  hasProjection,
  traineeName,
}: ResolveSpectatorAvailabilityOptions): SpectatorAvailability {
  if (connecting) {
    return {
      kind: 'connecting',
      headline: 'CONNECTING',
      detail: `Connecting to ${traineeName}…`,
      tone: 'neutral',
      isLive: false,
    }
  }

  if (sessionStatus === 'ended') {
    return {
      kind: 'room-ended',
      headline: 'ROOM ENDED',
      detail: hasProjection ? 'Final monitor state' : 'No monitor received',
      tone: 'neutral',
      isLive: false,
    }
  }

  if (connectionLost) {
    return {
      kind: 'connection-lost',
      headline: 'SPECTATOR CONNECTION LOST',
      detail: 'Trying to reconnect…',
      tone: 'degraded',
      isLive: false,
    }
  }

  if (sessionStatus === 'waiting') {
    return {
      kind: 'attempt-not-started',
      headline: 'ATTEMPT NOT STARTED',
      detail: 'Start / Dispatch to begin the attempt',
      tone: 'neutral',
      isLive: false,
    }
  }

  if (!traineeConnected) {
    return {
      kind: 'trainee-offline',
      headline: 'TRAINEE OFFLINE',
      detail: hasProjection ? null : 'No monitor received',
      tone: 'degraded',
      isLive: false,
    }
  }

  if (!hasProjection) {
    return {
      kind: 'waiting-for-monitor',
      headline: 'WAITING FOR TRAINEE MONITOR',
      detail: 'The view appears when the trainee opens the monitor',
      tone: 'neutral',
      isLive: false,
    }
  }

  return {
    kind: 'live',
    headline: 'LIVE',
    detail: null,
    tone: 'live',
    isLive: true,
  }
}

export function spectatorAvailabilityAnnouncement(
  availability: SpectatorAvailability,
): string {
  return availability.detail
    ? `${availability.headline}. ${availability.detail}`
    : availability.headline
}
