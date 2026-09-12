import { useState } from 'react'
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

const originalRequestFullscreen = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'requestFullscreen',
)
const originalFullscreenElement = Object.getOwnPropertyDescriptor(
  document,
  'fullscreenElement',
)
const originalExitFullscreen = Object.getOwnPropertyDescriptor(document, 'exitFullscreen')
const originalMaxTouchPoints = Object.getOwnPropertyDescriptor(
  window.navigator,
  'maxTouchPoints',
)

function installFullscreenMock({ rejectRequest = false } = {}) {
  let fullscreenElement: Element | null = null
  const requestFullscreen = vi.fn(() => {
    if (rejectRequest) return Promise.reject(new Error('fullscreen denied'))
    fullscreenElement = document.querySelector('[data-testid="dispatch-route-map-shell"]')
    document.dispatchEvent(new Event('fullscreenchange'))
    return Promise.resolve()
  })
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement,
  })
  Object.defineProperty(Element.prototype, 'requestFullscreen', {
    configurable: true,
    value: requestFullscreen,
  })
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    value: vi.fn(() => {
      fullscreenElement = null
      document.dispatchEvent(new Event('fullscreenchange'))
      return Promise.resolve()
    }),
  })

  return {
    requestFullscreen,
    simulateNativeExit: () => {
      fullscreenElement = null
    },
  }
}

function mockIPadIdentity({ desktopStyle = false } = {}) {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
    desktopStyle
      ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'
      : 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
  )
  vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue(
    desktopStyle ? 'MacIntel' : 'iPad',
  )
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: 5,
  })
}

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

function FullscreenMapHarness() {
  const [fullscreen, setFullscreen] = useState(false)
  return (
    <DispatchRouteMap
      route={readyRoute()}
      hospitalMap={{
        routeKind: 'dispatch',
        selectedHospitalId: 'chum',
        pendingHospitalId: null,
        failedHospitalId: null,
        failureMessage: '',
        directoryOpen: fullscreen,
        fullscreen,
        distances: {},
        distanceStatus: 'ready',
        rankingOrigin: { lat: 45.4, lng: -73.95 },
      }}
      onFullscreenChange={setFullscreen}
    />
  )
}

describe('DispatchRouteMap track toggle', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    vi.restoreAllMocks()
    for (const [target, property, descriptor] of [
      [Element.prototype, 'requestFullscreen', originalRequestFullscreen],
      [document, 'fullscreenElement', originalFullscreenElement],
      [document, 'exitFullscreen', originalExitFullscreen],
    ] as const) {
      if (descriptor) Object.defineProperty(target, property, descriptor)
      else Reflect.deleteProperty(target, property)
    }
    if (originalMaxTouchPoints) {
      Object.defineProperty(window.navigator, 'maxTouchPoints', originalMaxTouchPoints)
    } else {
      Reflect.deleteProperty(window.navigator, 'maxTouchPoints')
    }
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

  it('returns to the embedded map after native fullscreen loss', async () => {
    const fullscreen = installFullscreenMock()
    render(<FullscreenMapHarness />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open full screen map' }))
    await waitFor(() => expect(fullscreen.requestFullscreen).toHaveBeenCalledOnce())
    expect(screen.getByTestId('dispatch-route-map-shell')).toHaveClass(
      'fixed',
      'h-[100dvh]',
      'w-[100dvw]',
    )
    expect(screen.getByRole('button', { name: 'Toggle hospital directory' })).toBeDisabled()

    fullscreen.simulateNativeExit()
    fireEvent(document, new Event('fullscreenchange'))

    await waitFor(() => expect(screen.getByTestId('dispatch-route-map-shell')).toHaveClass('h-full'))
    expect(screen.queryByRole('complementary', { name: 'Receiving Hospital Directory' }))
      .not.toBeInTheDocument()
    await waitFor(() => expect(
      screen.getByRole('button', { name: 'Open full screen map' }),
    ).toHaveFocus())
  })

  it.each([
    ['mobile-style', false],
    ['desktop-style', true],
  ])(
    'keeps the %s iPad map in app fullscreen until Minimize is used',
    async (_identity, desktopStyle) => {
      mockIPadIdentity({ desktopStyle })
      const nativeFullscreen = installFullscreenMock()
      render(<FullscreenMapHarness />)

      fireEvent.click(await screen.findByRole('button', { name: 'Open full screen map' }))

      const mapShell = screen.getByTestId('dispatch-route-map-shell')
      const minimize = await screen.findByRole('button', { name: 'Exit full screen map' })
      expect(nativeFullscreen.requestFullscreen).not.toHaveBeenCalled()
      expect(mapShell).toHaveClass('fixed', 'h-[100dvh]', 'w-[100dvw]')
      expect(
        screen.getByRole('complementary', { name: 'Receiving Hospital Directory' }),
      ).toBeInTheDocument()

      fireEvent(document, new Event('fullscreenchange'))

      expect(mapShell).toHaveClass('fixed', 'h-[100dvh]', 'w-[100dvw]')
      expect(screen.getByRole('button', { name: 'Exit full screen map' })).toBe(minimize)

      fireEvent.click(minimize)

      await waitFor(() => expect(mapShell).toHaveClass('h-full'))
      expect(
        screen.queryByRole('complementary', { name: 'Receiving Hospital Directory' }),
      ).not.toBeInTheDocument()
    },
  )

  it('uses a safe labelled fallback when native fullscreen entry is rejected', async () => {
    installFullscreenMock({ rejectRequest: true })
    render(<FullscreenMapHarness />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open full screen map' }))

    const minimize = await screen.findByRole('button', { name: 'Exit full screen map' })
    expect(minimize).toHaveTextContent('Minimize')
    expect(minimize).toHaveClass(
      'fixed',
      'min-h-12',
      'min-w-12',
      'bottom-[max(0.75rem,env(safe-area-inset-bottom))]',
      'right-[max(0.75rem,env(safe-area-inset-right))]',
    )
    expect(screen.getByTestId('dispatch-route-map-shell')).toHaveClass(
      'h-[100dvh]',
      'w-[100dvw]',
    )

    fireEvent.click(minimize)
    await waitFor(() => expect(screen.getByTestId('dispatch-route-map-shell')).toHaveClass('h-full'))
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
