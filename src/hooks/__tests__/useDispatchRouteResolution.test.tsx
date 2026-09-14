import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMonitorStore } from '@/store/monitorStore'
import { JOHN_ABBOTT_COORDINATES } from '@/types/dispatchRoute'

import { useDispatchRouteResolution } from '../useDispatchRouteResolution'

const routeMocks = vi.hoisted(() => ({
  geocodeAddress: vi.fn(),
  fetchDrivingRoute: vi.fn(),
}))

vi.mock('@/lib/dispatchRoute', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/dispatchRoute')>()
  return {
    ...original,
    getGeoapifyApiKey: () => 'test-key',
    geocodeAddress: routeMocks.geocodeAddress,
    fetchDrivingRoute: routeMocks.fetchDrivingRoute,
  }
})

function Resolver({ onReady }: { onReady: () => void }) {
  useDispatchRouteResolution({ onConfirmedRouteReady: onReady })
  return null
}

describe('useDispatchRouteResolution', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    routeMocks.geocodeAddress.mockReset()
    routeMocks.fetchDrivingRoute.mockReset()
    useMonitorStore.getState().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('promotes a late route into the active run without changing its identity', async () => {
    const onReady = vi.fn()
    routeMocks.geocodeAddress.mockResolvedValue({
      id: 'destination',
      formatted: '200 Sainte-Anne Street',
      latLng: { lat: 45.4, lng: -73.95 },
    })
    routeMocks.fetchDrivingRoute.mockResolvedValue({
      distanceMeters: 3200,
      durationSeconds: 480,
      geometry: [JOHN_ABBOTT_COORDINATES, { lat: 45.4, lng: -73.95 }],
    })

    act(() => {
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('address', '200 Sainte-Anne Street')
      store.save()
      store.send()
    })
    const runId = useMonitorStore.getState().dispatch.runId
    render(<Resolver onReady={onReady} />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(750)
    })

    expect(useMonitorStore.getState().dispatchRouteConfirmed.status).toBe('ready')
    expect(useMonitorStore.getState().dispatch.runId).toBe(runId)
    expect(useMonitorStore.getState().dispatchRouteConfirmed.destination).toEqual({
      lat: 45.4,
      lng: -73.95,
    })
    expect(onReady).toHaveBeenCalledOnce()
  })
})
