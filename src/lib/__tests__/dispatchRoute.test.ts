import { describe, expect, it } from 'vitest'

import {
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
