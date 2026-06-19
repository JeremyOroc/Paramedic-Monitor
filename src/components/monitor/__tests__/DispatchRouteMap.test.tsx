import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DispatchRouteMap } from '../DispatchRouteMap'
import { DEFAULT_DISPATCH_ROUTE, type DispatchRoute } from '@/types/dispatchRoute'

// A minimal Leaflet stub: the component only needs map/layer/marker factories and
// chainable map methods. The shared mapInstance lets us assert camera calls.
const leaflet = vi.hoisted(() => {
  const mapInstance: Record<string, ReturnType<typeof vi.fn>> = {}
  mapInstance.setView = vi.fn(() => mapInstance)
  mapInstance.fitBounds = vi.fn(() => mapInstance)
  mapInstance.invalidateSize = vi.fn(() => mapInstance)
  mapInstance.remove = vi.fn(() => mapInstance)
  return { mapInstance }
})

vi.mock('leaflet', () => {
  const layerGroup = { addTo: vi.fn(() => layerGroup), clearLayers: vi.fn() }
  return {
    map: vi.fn(() => leaflet.mapInstance),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    layerGroup: vi.fn(() => layerGroup),
    marker: vi.fn(() => ({ addTo: vi.fn() })),
    divIcon: vi.fn(() => ({})),
    polyline: vi.fn(() => ({ addTo: vi.fn(() => ({ remove: vi.fn() })), remove: vi.fn() })),
    latLngBounds: vi.fn(() => ({})),
  }
})

function readyRoute(): DispatchRoute {
  return {
    ...DEFAULT_DISPATCH_ROUTE,
    destinationAddress: '200 Sainte-Anne Street',
    destination: { lat: 45.4, lng: -73.95 },
    distanceMeters: 3000,
    durationSeconds: 300,
    geometry: [
      { lat: 45.4068, lng: -73.9412 },
      { lat: 45.4, lng: -73.95 },
    ],
    startedAt: Date.now() - 60_000, // 1 min into a 5 min route -> unit is mid-route
    status: 'ready',
  }
}

describe('DispatchRouteMap track toggle', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => cleanup())

  it('defaults to overview and toggles unit tracking on and off', async () => {
    render(<DispatchRouteMap route={readyRoute()} />)

    const toggle = await screen.findByTestId('map-track-toggle')

    // Default: overview fits the route and does not follow the unit.
    expect(toggle).toHaveTextContent('Track unit')
    await waitFor(() => expect(leaflet.mapInstance.fitBounds).toHaveBeenCalled())

    // Toggle on: camera follows the unit at the close-up zoom.
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle).toHaveTextContent('Tracking'))
    await waitFor(() => {
      const calls = leaflet.mapInstance.setView.mock.calls
      expect(calls.at(-1)?.[1]).toBe(16)
    })

    // Toggle off: returns to overview and refits the route.
    const fitCount = leaflet.mapInstance.fitBounds.mock.calls.length
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle).toHaveTextContent('Track unit'))
    await waitFor(() =>
      expect(leaflet.mapInstance.fitBounds.mock.calls.length).toBeGreaterThan(fitCount),
    )
  })

  it('hides the toggle until a route is ready', () => {
    render(<DispatchRouteMap route={DEFAULT_DISPATCH_ROUTE} />)
    expect(screen.queryByTestId('map-track-toggle')).not.toBeInTheDocument()
  })
})
