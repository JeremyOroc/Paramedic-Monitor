export type SpectatorAvailabilityKind =
  | 'connecting'
  | 'room-ended'
  | 'connection-lost'
  | 'attempt-not-started'
  | 'device-offline'
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
  deviceConnected: boolean
  hasProjection: boolean
  deviceName: string
}

export function resolveSpectatorAvailability({
  sessionStatus,
  connecting,
  connectionLost,
  deviceConnected,
  hasProjection,
  deviceName,
}: ResolveSpectatorAvailabilityOptions): SpectatorAvailability {
  if (connecting) {
    return {
      kind: 'connecting',
      headline: 'CONNECTING',
      detail: `Connecting to ${deviceName}…`,
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

  if (!deviceConnected) {
    return {
      kind: 'device-offline',
      headline: 'DEVICE OFFLINE',
      detail: hasProjection ? null : 'No monitor received',
      tone: 'degraded',
      isLive: false,
    }
  }

  if (!hasProjection) {
    return {
      kind: 'waiting-for-monitor',
      headline: 'WAITING FOR DEVICE MONITOR',
      detail: 'The view appears when the device opens the monitor',
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
