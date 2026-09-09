import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const routeMocks = vi.hoisted(() => ({
  fetchDrivingDistances: vi.fn(),
  fetchDrivingRoute: vi.fn(),
}))

vi.mock('@/lib/dispatchRoute', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/dispatchRoute')>(),
  fetchDrivingDistances: routeMocks.fetchDrivingDistances,
  fetchDrivingRoute: routeMocks.fetchDrivingRoute,
}))

import {
  readPersistedTransportRoute,
  useReceivingHospitalRouting,
} from '@/hooks/useReceivingHospitalRouting'
import { DEFAULT_DISPATCH_ROUTE } from '@/types/dispatchRoute'

describe('receiving hospital route persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    routeMocks.fetchDrivingDistances.mockReset()
    routeMocks.fetchDrivingRoute.mockReset()
  })

  afterEach(() => vi.restoreAllMocks())
  it('restores only a matching attempt and incident identity', () => {
    const stored = JSON.stringify({
      identity: 'run-1|scene|4',
      selectedHospitalId: 'chum',
      route: { ...DEFAULT_DISPATCH_ROUTE, status: 'ready' },
    })

    expect(readPersistedTransportRoute(stored, 'run-1|scene|4')?.selectedHospitalId).toBe('chum')
    expect(readPersistedTransportRoute(stored, 'run-2|scene|4')).toBeNull()
  })

  it('rejects malformed data and unknown hospitals', () => {
    expect(readPersistedTransportRoute('{', 'run')).toBeNull()
    expect(readPersistedTransportRoute(JSON.stringify({
      identity: 'run',
      selectedHospitalId: 'unknown',
      route: DEFAULT_DISPATCH_ROUTE,
    }), 'run')).toBeNull()
  })

  it('commits only the latest hospital when selections race', async () => {
    const pending: Array<(value: {
      distanceMeters: number
      durationSeconds: number
      geometry: Array<{ lat: number; lng: number }>
    }) => void> = []
    routeMocks.fetchDrivingRoute.mockImplementation(() => new Promise((resolve) => {
      pending.push(resolve)
    }))
    const dispatchRoute = {
      ...DEFAULT_DISPATCH_ROUTE,
      destinationAddress: 'Incident scene',
      destination: { lat: 45.45, lng: -73.75 },
      status: 'ready' as const,
    }
    const { result } = renderHook(() => useReceivingHospitalRouting({
      dispatchRoute,
      dispatchRunId: 'run-race',
      incidentAddress: 'Incident scene',
      monitorResetVersion: 1,
      storageScope: 'room.trainee.attempt',
      transported: false,
    }))

    act(() => result.current.selectHospital('chum'))
    act(() => result.current.selectHospital('montreal-general'))
    await waitFor(() => expect(pending).toHaveLength(2))
    await act(async () => {
      pending[0]?.({ distanceMeters: 100, durationSeconds: 10, geometry: [] })
      pending[1]?.({ distanceMeters: 200, durationSeconds: 20, geometry: [] })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.mapState.selectedHospitalId).toBe('montreal-general')
      expect(result.current.effectiveRoute.destinationAddress).toContain('Cedar Avenue')
    })
  })

  it('starts a previewed hospital route at the Transport press timestamp', async () => {
    routeMocks.fetchDrivingRoute.mockResolvedValue({
      distanceMeters: 1500,
      durationSeconds: 300,
      geometry: [
        { lat: 45.45, lng: -73.75 },
        { lat: 45.511355, lng: -73.556923 },
      ],
    })
    const dispatchRoute = {
      ...DEFAULT_DISPATCH_ROUTE,
      destinationAddress: 'Incident scene',
      destination: { lat: 45.45, lng: -73.75 },
      status: 'ready' as const,
    }
    const { result } = renderHook(() => useReceivingHospitalRouting({
      dispatchRoute,
      dispatchRunId: 'run-transport',
      incidentAddress: 'Incident scene',
      monitorResetVersion: 1,
      transported: false,
    }))

    act(() => result.current.selectHospital('chum'))
    await waitFor(() => expect(result.current.mapState.selectedHospitalId).toBe('chum'))
    expect(result.current.effectiveRoute.startedAt).toBeNull()
    act(() => result.current.startTransport(123_456))
    expect(result.current.effectiveRoute.startedAt).toBe(123_456)
  })

  it('opens the directory with fullscreen and closes it again on exit', async () => {
    routeMocks.fetchDrivingDistances.mockResolvedValue(Array.from({ length: 18 }, () => 1000))
    const { result } = renderHook(() => useReceivingHospitalRouting({
      dispatchRoute: {
        ...DEFAULT_DISPATCH_ROUTE,
        destinationAddress: 'Incident scene',
        destination: { lat: 45.45, lng: -73.75 },
        status: 'ready',
      },
      dispatchRunId: 'run-fullscreen',
      incidentAddress: 'Incident scene',
      monitorResetVersion: 1,
      transported: false,
    }))

    act(() => result.current.setFullscreen(true))
    expect(result.current.mapState).toMatchObject({ fullscreen: true, directoryOpen: true })
    act(() => result.current.setFullscreen(false))
    expect(result.current.mapState).toMatchObject({ fullscreen: false, directoryOpen: false })
  })

  it('timestamps an active reroute from the current-position selection snapshot', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    routeMocks.fetchDrivingRoute.mockResolvedValue({
      distanceMeters: 1500,
      durationSeconds: 300,
      geometry: [
        { lat: 45.45, lng: -73.75 },
        { lat: 45.511355, lng: -73.556923 },
      ],
    })
    const { result } = renderHook(() => useReceivingHospitalRouting({
      dispatchRoute: {
        ...DEFAULT_DISPATCH_ROUTE,
        destinationAddress: 'Incident scene',
        destination: { lat: 45.45, lng: -73.75 },
        status: 'ready',
      },
      dispatchRunId: 'run-reroute',
      incidentAddress: 'Incident scene',
      monitorResetVersion: 1,
      transported: false,
    }))

    act(() => result.current.selectHospital('chum'))
    await waitFor(() => expect(result.current.mapState.selectedHospitalId).toBe('chum'))
    act(() => result.current.startTransport(1_000))
    nowSpy.mockReturnValue(2_000)
    act(() => result.current.selectHospital('montreal-general'))

    await waitFor(() => {
      expect(result.current.mapState.selectedHospitalId).toBe('montreal-general')
      expect(result.current.effectiveRoute.startedAt).toBe(2_000)
      expect(result.current.effectiveRoute.originAddress).toBe('Current unit position')
    })
  })

  it('removes the prior Attempt storage when the persistence scope changes', async () => {
    const oldKey = 'paramedic-monitor.transport.v1.room.trainee.attempt-1'
    localStorage.setItem(oldKey, JSON.stringify({
      identity: 'run|Incident scene|1',
      selectedHospitalId: 'chum',
      route: { ...DEFAULT_DISPATCH_ROUTE, status: 'ready' },
    }))
    const options = {
      dispatchRoute: {
        ...DEFAULT_DISPATCH_ROUTE,
        destinationAddress: 'Incident scene',
        destination: { lat: 45.45, lng: -73.75 },
        status: 'ready' as const,
      },
      dispatchRunId: 'run',
      incidentAddress: 'Incident scene',
      monitorResetVersion: 1,
      transported: false,
    }
    const { rerender } = renderHook(
      ({ scope }) => useReceivingHospitalRouting({ ...options, storageScope: scope }),
      { initialProps: { scope: 'room.trainee.attempt-1' } },
    )
    await waitFor(() => expect(localStorage.getItem(oldKey)).not.toBeNull())

    rerender({ scope: 'room.trainee.attempt-2' })
    await waitFor(() => expect(localStorage.getItem(oldKey)).toBeNull())
  })
})
