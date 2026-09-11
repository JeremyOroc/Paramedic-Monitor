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
  const markerInstance: {
    addTo: ReturnType<typeof vi.fn>
    bindTooltip: ReturnType<typeof vi.fn>
    on: ReturnType<typeof vi.fn>
  } = {
    addTo: vi.fn(),
    bindTooltip: vi.fn(),
    on: vi.fn(),
  }
  markerInstance.addTo.mockImplementation(() => markerInstance)
  markerInstance.bindTooltip.mockImplementation(() => markerInstance)
  markerInstance.on.mockImplementation(() => markerInstance)
  return { mapInstance, markerInstance }
})

vi.mock('leaflet', () => {
  const layerGroup = { addTo: vi.fn(() => layerGroup), clearLayers: vi.fn() }
  return {
    map: vi.fn(() => leaflet.mapInstance),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    layerGroup: vi.fn(() => layerGroup),
    marker: vi.fn(() => leaflet.markerInstance),
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
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

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

  it('cancels delayed size invalidation when the map unmounts', async () => {
    const { rerender, unmount } = render(<DispatchRouteMap route={readyRoute()} />)

    await screen.findByTestId('map-track-toggle')
    leaflet.mapInstance.invalidateSize.mockClear()

    vi.useFakeTimers()
    rerender(
      <DispatchRouteMap
        route={{
          ...readyRoute(),
          destinationAddress: '300 Sainte-Anne Street',
          destination: { lat: 45.402, lng: -73.952 },
          geometry: [
            { lat: 45.4068, lng: -73.9412 },
            { lat: 45.402, lng: -73.952 },
          ],
        }}
      />,
    )
    unmount()

    expect(() => vi.runOnlyPendingTimers()).not.toThrow()
    expect(leaflet.mapInstance.invalidateSize).not.toHaveBeenCalled()
    expect(leaflet.mapInstance.remove).toHaveBeenCalled()
  })

  it('exposes hospital and fullscreen controls for the assignment map', async () => {
    const onOpenDirectory = vi.fn()
    const onFullscreenChange = vi.fn()
    render(
      <DispatchRouteMap
        route={readyRoute()}
        hospitalMap={{
          routeKind: 'dispatch',
          selectedHospitalId: null,
          pendingHospitalId: null,
          failedHospitalId: null,
          failureMessage: '',
          directoryOpen: false,
          fullscreen: false,
          distances: {},
          distanceStatus: 'idle',
          rankingOrigin: null,
        }}
        onOpenDirectory={onOpenDirectory}
        onFullscreenChange={onFullscreenChange}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Toggle hospital directory' }))
    expect(onOpenDirectory).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Open full screen map' }))
    expect(onFullscreenChange).toHaveBeenCalledWith(true)
  })

  it('retains app fullscreen after native fullscreen loss and exits only from Minimize', async () => {
    const onCloseDirectory = vi.fn()
    const onFullscreenChange = vi.fn()
    render(
      <DispatchRouteMap
        route={readyRoute()}
        hospitalMap={{
          routeKind: 'dispatch',
          selectedHospitalId: null,
          pendingHospitalId: null,
          failedHospitalId: null,
          failureMessage: '',
          directoryOpen: true,
          fullscreen: true,
          distances: {},
          distanceStatus: 'ready',
          rankingOrigin: { lat: 45.4, lng: -73.95 },
        }}
        onCloseDirectory={onCloseDirectory}
        onFullscreenChange={onFullscreenChange}
      />,
    )

    const shell = screen.getByTestId('dispatch-route-map-shell')
    expect(shell).toHaveClass('fixed', 'inset-0', 'overscroll-none')

    const hospitalToggle = await screen.findByRole('button', {
      name: 'Toggle hospital directory',
    })
    expect(hospitalToggle).toBeDisabled()
    expect(hospitalToggle).toHaveAttribute(
      'title',
      'Use Minimize to leave the full screen hospital directory',
    )
    fireEvent.click(hospitalToggle)
    expect(onCloseDirectory).not.toHaveBeenCalled()

    fireEvent(document, new Event('fullscreenchange'))
    expect(onFullscreenChange).not.toHaveBeenCalled()
    expect(shell).toHaveClass('fixed', 'inset-0')

    fireEvent.click(screen.getByRole('button', { name: 'Exit full screen map' }))
    expect(onFullscreenChange).toHaveBeenCalledOnce()
    expect(onFullscreenChange).toHaveBeenCalledWith(false)
  })

  it('uses the same fullscreen directory composition in a contained read-only projection', () => {
    render(
      <DispatchRouteMap
        route={readyRoute()}
        contained
        readOnly
        hospitalMap={{
          routeKind: 'dispatch',
          selectedHospitalId: null,
          pendingHospitalId: null,
          failedHospitalId: null,
          failureMessage: '',
          directoryOpen: true,
          fullscreen: true,
          distances: {},
          distanceStatus: 'ready',
          rankingOrigin: { lat: 45.4, lng: -73.95 },
        }}
      />,
    )

    expect(screen.getByTestId('dispatch-route-map-shell')).toHaveClass('absolute', 'inset-0')
    expect(
      screen.getByRole('complementary', { name: 'Receiving Hospital Directory' }),
    ).toHaveClass('w-[30%]')
    expect(screen.getByTestId('hospital-directory-scroll')).toHaveAttribute(
      'data-visible-row-capacity',
      '10',
    )
  })

  it('renders and wires all 18 permanently-labelled hospital pins', async () => {
    const onSelectHospital = vi.fn()
    render(
      <DispatchRouteMap
        route={readyRoute()}
        hospitalMap={{
          routeKind: 'dispatch',
          selectedHospitalId: null,
          pendingHospitalId: null,
          failedHospitalId: null,
          failureMessage: '',
          directoryOpen: true,
          fullscreen: false,
          distances: {},
          distanceStatus: 'loading',
          rankingOrigin: { lat: 45.4, lng: -73.95 },
        }}
        onSelectHospital={onSelectHospital}
      />,
    )

    await waitFor(() => expect(leaflet.markerInstance.bindTooltip).toHaveBeenCalledTimes(18))
    expect(leaflet.markerInstance.on).toHaveBeenCalledTimes(18)
    const lastPinClick = leaflet.markerInstance.on.mock.calls.at(-1)?.[1]
    if (typeof lastPinClick === 'function') lastPinClick()
    expect(onSelectHospital).toHaveBeenCalledWith('montreal-childrens')
    expect(screen.getByTestId('map-track-toggle')).toBeEnabled()
  })
})
