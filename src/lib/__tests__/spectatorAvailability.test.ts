import { describe, expect, it } from 'vitest'

import {
  resolveSpectatorAvailability,
  spectatorAvailabilityAnnouncement,
} from '@/lib/spectatorAvailability'

const baseOptions = {
  sessionStatus: 'active' as const,
  connecting: false,
  connectionLost: false,
  deviceConnected: true,
  hasProjection: true,
  deviceName: 'Alice',
}

describe('resolveSpectatorAvailability', () => {
  it('requires an active Room, healthy connection, current device, and projection for Live', () => {
    expect(resolveSpectatorAvailability(baseOptions)).toMatchObject({
      kind: 'live',
      headline: 'LIVE',
      tone: 'live',
      isLive: true,
    })
  })

  it.each([
    [{ connecting: true }, 'connecting', 'CONNECTING', 'Connecting to Alice…'],
    [{ sessionStatus: 'waiting' }, 'attempt-not-started', 'ATTEMPT NOT STARTED', 'Start / Dispatch to begin the attempt'],
    [{ deviceConnected: false }, 'device-offline', 'DEVICE OFFLINE', null],
    [{ hasProjection: false }, 'waiting-for-monitor', 'WAITING FOR DEVICE MONITOR', 'The view appears when the device opens the monitor'],
  ] as const)('maps %o to %s', (overrides, kind, headline, detail) => {
    expect(resolveSpectatorAvailability({ ...baseOptions, ...overrides })).toMatchObject({
      kind,
      headline,
      detail,
      isLive: false,
    })
  })

  it('distinguishes offline with no monitor from a retained offline frame', () => {
    expect(resolveSpectatorAvailability({
      ...baseOptions,
      deviceConnected: false,
      hasProjection: false,
    })).toMatchObject({
      kind: 'device-offline',
      detail: 'No monitor received',
      tone: 'degraded',
    })
  })

  it('uses the approved conflict priority', () => {
    expect(resolveSpectatorAvailability({
      ...baseOptions,
      connecting: true,
      connectionLost: true,
      sessionStatus: 'ended',
    }).kind).toBe('connecting')

    expect(resolveSpectatorAvailability({
      ...baseOptions,
      connectionLost: true,
      sessionStatus: 'ended',
      deviceConnected: false,
    })).toMatchObject({
      kind: 'room-ended',
      detail: 'Final monitor state',
      tone: 'neutral',
    })

    expect(resolveSpectatorAvailability({
      ...baseOptions,
      connectionLost: true,
      sessionStatus: 'waiting',
      deviceConnected: false,
    })).toMatchObject({
      kind: 'connection-lost',
      detail: 'Trying to reconnect…',
      tone: 'degraded',
    })

    expect(resolveSpectatorAvailability({
      ...baseOptions,
      sessionStatus: 'waiting',
      deviceConnected: false,
      hasProjection: false,
    }).kind).toBe('attempt-not-started')
  })

  it('uses the no-monitor Room-ended explanation without a retained frame', () => {
    expect(resolveSpectatorAvailability({
      ...baseOptions,
      sessionStatus: 'ended',
      hasProjection: false,
    }).detail).toBe('No monitor received')
  })

  it('builds one concise accessibility announcement', () => {
    const availability = resolveSpectatorAvailability({
      ...baseOptions,
      connectionLost: true,
    })

    expect(spectatorAvailabilityAnnouncement(availability)).toBe(
      'SPECTATOR CONNECTION LOST. Trying to reconnect…',
    )
  })
})
