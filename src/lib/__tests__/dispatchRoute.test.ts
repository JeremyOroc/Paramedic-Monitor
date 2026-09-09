import { describe, expect, it, vi } from 'vitest'

import {
  fetchDrivingDistances,
  fetchDrivingRoute,
  formatDistance,
  formatDuration,
  getPointAlongRoute,
  getRouteProgress,
} from '@/lib/dispatchRoute'
import {
  DEFAULT_DISPATCH_ROUTE,
  type DispatchRoute,
} from '@/types/dispatchRoute'

describe('dispatchRoute helpers', () => {
  it('requests one-to-many driving distances in destination order', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ distances: [[1200, null, 800]] }), { status: 200 }),
    )

    await expect(
      fetchDrivingDistances(
        { lat: 45.4, lng: -73.9 },
        [
          { lat: 45.5, lng: -73.6 },
          { lat: 45.6, lng: -73.5 },
          { lat: 45.45, lng: -73.8 },
        ],
      ),
    ).resolves.toEqual([1200, null, 800])
    expect(fetchMock.mock.calls[0]?.[0]).toContain('sources=0&destinations=1;2;3')
    fetchMock.mockRestore()
  })

  it('passes an abort signal to route lookup', async () => {
    const controller = new AbortController()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          routes: [{
            distance: 1000,
            duration: 120,
            geometry: { coordinates: [[-73.9, 45.4], [-73.6, 45.5]] },
          }],
        }),
        { status: 200 },
      ),
    )

    await fetchDrivingRoute(
      { lat: 45.4, lng: -73.9 },
      { lat: 45.5, lng: -73.6 },
      controller.signal,
    )
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ signal: controller.signal })
    fetchMock.mockRestore()
  })

  it('formats distance and duration for the dispatch map readouts', () => {
    expect(formatDistance(null)).toBe('-- km')
    expect(formatDistance(430)).toBe('430 m')
    expect(formatDistance(12620)).toBe('12.6 km')

    expect(formatDuration(null)).toBe('--:--')
    expect(formatDuration(60)).toBe('1 min')
    expect(formatDuration(61)).toBe('2 min')
  })

  it('calculates route progress from stored startedAt and duration', () => {
    const route: DispatchRoute = {
      ...DEFAULT_DISPATCH_ROUTE,
      durationSeconds: 120,
      startedAt: 1_000,
    }

    expect(getRouteProgress(route, 1_000)).toBe(0)
    expect(getRouteProgress(route, 61_000)).toBe(0.5)
    expect(getRouteProgress(route, 200_000)).toBe(1)
  })

  it('treats a started zero-duration route as already arrived', () => {
    const route: DispatchRoute = {
      ...DEFAULT_DISPATCH_ROUTE,
      durationSeconds: 0,
      startedAt: 1_000,
    }

    expect(getRouteProgress(route, 1_000)).toBe(1)
  })

  it('interpolates the moving unit along route geometry', () => {
    const point = getPointAlongRoute(
      [
        { lat: 45, lng: -73 },
        { lat: 45, lng: -72.99 },
      ],
      0.5,
    )

    expect(point?.lat).toBeCloseTo(45)
    expect(point?.lng).toBeCloseTo(-72.995)
  })
})
