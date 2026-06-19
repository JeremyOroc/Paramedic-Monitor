'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type * as Leaflet from 'leaflet'

import {
  formatDistance,
  formatDuration,
  getPointAlongRoute,
  getRouteProgress,
} from '@/lib/dispatchRoute'
import { cn } from '@/lib/utils'
import type { DispatchRoute, LatLng } from '@/types/dispatchRoute'

type DispatchRouteMapProps = {
  route: DispatchRoute
}

// Zoom used when the camera follows the moving unit up close.
const FOLLOW_ZOOM = 16

function markerIcon(L: typeof Leaflet, kind: 'origin' | 'destination' | 'unit') {
  return L.divIcon({
    className: '',
    html: `<span class="dispatch-map-marker dispatch-map-marker-${kind}"></span>`,
    iconSize: kind === 'unit' ? [18, 18] : [16, 16],
    iconAnchor: kind === 'unit' ? [9, 9] : [8, 8],
  })
}

function routePoints(route: DispatchRoute, unitPosition: LatLng | null): LatLng[] {
  if (route.geometry.length > 0) return route.geometry
  return [route.origin, route.destination, unitPosition].filter((point) => point !== null)
}

export function DispatchRouteMap({ route }: DispatchRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const leafletRef = useRef<typeof Leaflet | null>(null)
  const routeLayerRef = useRef<Leaflet.Polyline | null>(null)
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null)
  const fittedRouteKeyRef = useRef('')
  const [ready, setReady] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  // 'overview' fits the whole route (default); 'follow' tracks the unit up close.
  const [trackMode, setTrackMode] = useState<'overview' | 'follow'>('overview')

  const toggleTrackMode = () => {
    setTrackMode((mode) => {
      const next = mode === 'follow' ? 'overview' : 'follow'
      // Returning to overview must refit the route even if it has not changed.
      if (next === 'overview') fittedRouteKeyRef.current = ''
      return next
    })
  }

  useEffect(() => {
    let disposed = false

    import('leaflet').then((L) => {
      if (disposed || !containerRef.current) return
      leafletRef.current = L
      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
          dragging: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
        }).setView([45.4068, -73.9412], 12)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map)

        markerLayerRef.current = L.layerGroup().addTo(map)
        mapRef.current = map
      }
      setReady(true)
    })

    return () => {
      disposed = true
      mapRef.current?.remove()
      mapRef.current = null
      routeLayerRef.current = null
      markerLayerRef.current = null
      leafletRef.current = null
      fittedRouteKeyRef.current = ''
    }
  }, [])

  useEffect(() => {
    if (route.status !== 'ready') return

    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [route.status])

  const progress = getRouteProgress(route, now)
  const unitPosition = useMemo(
    () => getPointAlongRoute(route.geometry, progress),
    [progress, route.geometry],
  )
  const remainingSeconds =
    route.durationSeconds === null
      ? null
      : Math.max(0, route.durationSeconds * (1 - progress))

  useEffect(() => {
    if (!ready || !mapRef.current || !leafletRef.current || !markerLayerRef.current) return
    const L = leafletRef.current
    const map = mapRef.current
    const markerLayer = markerLayerRef.current

    markerLayer.clearLayers()

    const points = routePoints(route, unitPosition)
    if (points.length === 0) {
      if (fittedRouteKeyRef.current !== 'empty') {
        map.setView([45.4068, -73.9412], 12)
        fittedRouteKeyRef.current = 'empty'
      }
      return
    }

    const firstGeometryPoint = route.geometry[0]
    const lastGeometryPoint = route.geometry.at(-1)
    const routeKey = [
      route.origin ? `${route.origin.lat},${route.origin.lng}` : 'none',
      route.destination ? `${route.destination.lat},${route.destination.lng}` : 'none',
      route.geometry.length,
      firstGeometryPoint ? `${firstGeometryPoint.lat},${firstGeometryPoint.lng}` : 'none',
      lastGeometryPoint ? `${lastGeometryPoint.lat},${lastGeometryPoint.lng}` : 'none',
    ].join('|')

    if (route.geometry.length > 1) {
      if (fittedRouteKeyRef.current !== routeKey) {
        if (routeLayerRef.current) {
          routeLayerRef.current.remove()
          routeLayerRef.current = null
        }
        routeLayerRef.current = L.polyline(
          route.geometry.map((point) => [point.lat, point.lng]),
          {
            color: 'var(--color-cyan-bp)',
            weight: 4,
            opacity: 0.85,
          },
        ).addTo(map)
      }
    } else if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }

    if (route.origin) {
      L.marker([route.origin.lat, route.origin.lng], {
        icon: markerIcon(L, 'origin'),
      }).addTo(markerLayer)
    }
    if (route.destination) {
      L.marker([route.destination.lat, route.destination.lng], {
        icon: markerIcon(L, 'destination'),
      }).addTo(markerLayer)
    }
    if (unitPosition) {
      L.marker([unitPosition.lat, unitPosition.lng], {
        icon: markerIcon(L, 'unit'),
      }).addTo(markerLayer)
    }

    if (trackMode === 'follow' && unitPosition) {
      // Keep the moving unit centered and zoomed in; this overrides any manual
      // pan/zoom on the next tick, which is the point of tracking mode.
      map.setView([unitPosition.lat, unitPosition.lng], FOLLOW_ZOOM, { animate: true })
    } else if (fittedRouteKeyRef.current !== routeKey) {
      const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]))
      map.fitBounds(bounds, { padding: [18, 18], maxZoom: 15 })
      fittedRouteKeyRef.current = routeKey
    }
    window.setTimeout(() => map.invalidateSize(), 0)
  }, [ready, route, unitPosition, trackMode])

  const statusText =
    route.status === 'loading'
      ? 'Loading route'
      : route.status === 'failed'
        ? route.error || 'Route unavailable'
        : route.status === 'ready'
          ? 'En route'
          : 'Awaiting address'

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-neutral-700 bg-dispatch-panel-soft">
      <div className="relative min-h-0 flex-1 bg-black">
        <div ref={containerRef} data-testid="dispatch-route-map" className="h-full w-full" />
        {route.status === 'ready' && (
          <button
            type="button"
            onClick={toggleTrackMode}
            aria-label="Toggle unit tracking"
            aria-pressed={trackMode === 'follow'}
            data-testid="map-track-toggle"
            className={cn(
              'absolute right-2 top-2 z-[1000] rounded border px-2 py-1',
              'font-mono text-[10px] font-black uppercase tracking-[0.12em]',
              trackMode === 'follow'
                ? 'border-dispatch-blue bg-dispatch-blue text-black'
                : 'border-neutral-600 bg-black/70 text-neutral-200 hover:text-white',
            )}
          >
            {trackMode === 'follow' ? 'Tracking' : 'Track unit'}
          </button>
        )}
        {route.status !== 'ready' && (
          <div className="absolute inset-0 grid place-items-center bg-black/72 px-4 text-center">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-300">
              {statusText}
            </span>
          </div>
        )}
      </div>
      <div className="grid shrink-0 grid-cols-3 border-t border-neutral-700 bg-black/25">
        <div className="px-3 py-2">
          <p className="text-[10px] font-black uppercase text-dispatch-blue">Distance</p>
          <p className="text-sm font-black text-white">{formatDistance(route.distanceMeters)}</p>
        </div>
        <div className="border-l border-neutral-700 px-3 py-2">
          <p className="text-[10px] font-black uppercase text-dispatch-blue">ETA</p>
          <p aria-label="Route ETA" className="font-mono text-sm font-black text-white">
            {formatDuration(remainingSeconds)}
          </p>
        </div>
        <div className="border-l border-neutral-700 px-3 py-2">
          <p className="text-[10px] font-black uppercase text-dispatch-blue">Status</p>
          <p className="truncate text-sm font-black uppercase text-dispatch-green">
            {route.status === 'ready' && progress >= 1 ? 'Arrived' : statusText}
          </p>
        </div>
      </div>
    </div>
  )
}
