'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type * as Leaflet from 'leaflet'

import { HospitalDirectoryPanel } from '@/components/monitor/HospitalDirectoryPanel'
import {
  formatDistance,
  formatDuration,
  getPointAlongRoute,
  getRouteProgress,
} from '@/lib/dispatchRoute'
import { hospitalDisplayPosition, RECEIVING_HOSPITALS } from '@/lib/receivingHospitals'
import { cn } from '@/lib/utils'
import type { DispatchRoute, LatLng } from '@/types/dispatchRoute'
import type { HospitalMapState } from '@/types/receivingHospital'

type DispatchRouteMapProps = {
  route: DispatchRoute
  hospitalMap?: HospitalMapState
  transported?: boolean
  atHospital?: boolean
  contained?: boolean
  readOnly?: boolean
  onOpenDirectory?: () => void
  onCloseDirectory?: () => void
  onFullscreenChange?: (fullscreen: boolean) => void
  onSelectHospital?: (hospitalId: string) => void
}

const FOLLOW_ZOOM = 16

function markerIcon(
  L: typeof Leaflet,
  kind: 'origin' | 'destination' | 'unit' | 'hospital' | 'hospital-selected' | 'hospital-pending',
) {
  const size = kind === 'unit' ? 18 : kind.startsWith('hospital') ? 14 : 16
  return L.divIcon({
    className: '',
    html: `<span class="dispatch-map-marker dispatch-map-marker-${kind}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function routePoints(route: DispatchRoute, unitPosition: LatLng | null): LatLng[] {
  if (route.geometry.length > 0) return route.geometry
  return [route.origin, route.destination, unitPosition].filter((point) => point !== null)
}

export function DispatchRouteMap({
  route,
  hospitalMap,
  transported = false,
  atHospital = false,
  contained = false,
  readOnly = false,
  onOpenDirectory,
  onCloseDirectory,
  onFullscreenChange,
  onSelectHospital,
}: DispatchRouteMapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const fullscreenButtonRef = useRef<HTMLButtonElement | null>(null)
  const nativeFullscreenActiveRef = useRef(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const leafletRef = useRef<typeof Leaflet | null>(null)
  const routeLayerRef = useRef<Leaflet.Polyline | null>(null)
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null)
  const hospitalLayerRef = useRef<Leaflet.LayerGroup | null>(null)
  const fittedRouteKeyRef = useRef('')
  const invalidateTimerRef = useRef<number | null>(null)
  const [ready, setReady] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [trackMode, setTrackMode] = useState<'overview' | 'follow'>('overview')
  const hospitalMode = hospitalMap?.directoryOpen === true
  const fullscreen = hospitalMap?.fullscreen === true

  const toggleTrackMode = () => {
    if (fullscreen) return
    if (hospitalMode) {
      onCloseDirectory?.()
      setTrackMode('follow')
      fittedRouteKeyRef.current = ''
      return
    }
    setTrackMode((mode) => {
      const next = mode === 'follow' ? 'overview' : 'follow'
      if (next === 'overview') fittedRouteKeyRef.current = ''
      return next
    })
  }

  const toggleHospitalMode = () => {
    if (fullscreen) return
    setTrackMode('overview')
    fittedRouteKeyRef.current = ''
    if (hospitalMode) onCloseDirectory?.()
    else onOpenDirectory?.()
  }

  const toggleFullscreen = async () => {
    const next = !fullscreen
    if (!readOnly && !contained) {
      if (next) {
        let enteredNativeFullscreen = false
        try {
          if (rootRef.current?.requestFullscreen) {
            await rootRef.current.requestFullscreen()
            enteredNativeFullscreen = true
          }
        } catch {
          // Fixed positioning below is the fallback when native fullscreen fails.
        }
        nativeFullscreenActiveRef.current = enteredNativeFullscreen
      } else {
        nativeFullscreenActiveRef.current = false
        try {
          if (document.fullscreenElement) await document.exitFullscreen()
        } catch {
          // App state still exits if the browser has already left native fullscreen.
        }
      }
    }
    onFullscreenChange?.(next)
    if (!next) window.setTimeout(() => fullscreenButtonRef.current?.focus(), 0)
  }

  useEffect(() => {
    if (readOnly || contained) return

    const handleFullscreenChange = () => {
      if (document.fullscreenElement === rootRef.current) {
        nativeFullscreenActiveRef.current = true
        return
      }
      if (!nativeFullscreenActiveRef.current) return

      nativeFullscreenActiveRef.current = false
      onFullscreenChange?.(false)
      window.setTimeout(() => fullscreenButtonRef.current?.focus(), 0)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [contained, onFullscreenChange, readOnly])

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
        hospitalLayerRef.current = L.layerGroup().addTo(map)
        mapRef.current = map
      }
      setReady(true)
    })

    return () => {
      disposed = true
      if (invalidateTimerRef.current !== null) window.clearTimeout(invalidateTimerRef.current)
      mapRef.current?.remove()
      mapRef.current = null
      routeLayerRef.current = null
      markerLayerRef.current = null
      hospitalLayerRef.current = null
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
  const remainingSeconds = route.durationSeconds === null
    ? null
    : Math.max(0, route.durationSeconds * (1 - progress))

  useEffect(() => {
    if (
      !ready ||
      !mapRef.current ||
      !leafletRef.current ||
      !markerLayerRef.current ||
      !hospitalLayerRef.current
    ) return
    const L = leafletRef.current
    const map = mapRef.current
    const markerLayer = markerLayerRef.current
    const hospitalLayer = hospitalLayerRef.current

    markerLayer.clearLayers()
    hospitalLayer.clearLayers()

    const points = routePoints(route, unitPosition)
    const routeKey = [
      route.origin ? `${route.origin.lat},${route.origin.lng}` : 'none',
      route.destination ? `${route.destination.lat},${route.destination.lng}` : 'none',
      route.geometry.length,
      hospitalMode ? 'hospitals' : 'route',
      fullscreen ? 'fullscreen' : 'embedded',
    ].join('|')

    if (route.geometry.length > 1) {
      if (fittedRouteKeyRef.current !== routeKey) {
        routeLayerRef.current?.remove()
        routeLayerRef.current = L.polyline(
          route.geometry.map((point) => [point.lat, point.lng]),
          { color: 'var(--color-cyan-bp)', weight: 4, opacity: 0.85 },
        ).addTo(map)
      }
    } else {
      routeLayerRef.current?.remove()
      routeLayerRef.current = null
    }

    if (route.origin) {
      L.marker([route.origin.lat, route.origin.lng], { icon: markerIcon(L, 'origin') })
        .addTo(markerLayer)
    }
    if (route.destination) {
      L.marker([route.destination.lat, route.destination.lng], {
        icon: markerIcon(L, 'destination'),
      }).addTo(markerLayer)
    }
    if (unitPosition) {
      L.marker([unitPosition.lat, unitPosition.lng], { icon: markerIcon(L, 'unit') })
        .addTo(markerLayer)
    }

    if (hospitalMode) {
      RECEIVING_HOSPITALS.forEach((hospital) => {
        const displayPosition = hospitalDisplayPosition(hospital)
        if (
          displayPosition.lat !== hospital.position.lat ||
          displayPosition.lng !== hospital.position.lng
        ) {
          L.polyline([
            [hospital.position.lat, hospital.position.lng],
            [displayPosition.lat, displayPosition.lng],
          ], { color: 'white', weight: 1, opacity: 0.65 }).addTo(hospitalLayer)
        }
        const markerKind = hospitalMap?.pendingHospitalId === hospital.id
          ? 'hospital-pending'
          : hospitalMap?.selectedHospitalId === hospital.id
            ? 'hospital-selected'
            : 'hospital'
        const marker = L.marker([displayPosition.lat, displayPosition.lng], {
          icon: markerIcon(L, markerKind),
          keyboard: !readOnly,
          title: hospital.name,
        }).addTo(hospitalLayer)
        marker.bindTooltip(hospital.name, {
          permanent: true,
          direction: 'top',
          className: 'hospital-map-label',
          opacity: 1,
        })
        if (!readOnly && !atHospital) marker.on('click', () => onSelectHospital?.(hospital.id))
      })
    }

    if (trackMode === 'follow' && unitPosition && !hospitalMode) {
      map.setView([unitPosition.lat, unitPosition.lng], FOLLOW_ZOOM, { animate: true })
    } else if (fittedRouteKeyRef.current !== routeKey) {
      const fitPoints = hospitalMode
        ? [...points, ...RECEIVING_HOSPITALS.map(hospitalDisplayPosition)]
        : points
      if (fitPoints.length > 0) {
        const bounds = L.latLngBounds(fitPoints.map((point) => [point.lat, point.lng]))
        map.fitBounds(bounds, { padding: hospitalMode ? [54, 54] : [18, 18], maxZoom: 15 })
      } else {
        map.setView([45.4068, -73.9412], 12)
      }
      fittedRouteKeyRef.current = routeKey
    }

    if (invalidateTimerRef.current !== null) window.clearTimeout(invalidateTimerRef.current)
    invalidateTimerRef.current = window.setTimeout(() => {
      invalidateTimerRef.current = null
      if (mapRef.current === map && containerRef.current?.isConnected === true) map.invalidateSize()
    }, 0)

    return () => {
      if (invalidateTimerRef.current !== null) window.clearTimeout(invalidateTimerRef.current)
    }
  }, [atHospital, fullscreen, hospitalMap, hospitalMode, onSelectHospital, ready, readOnly, route, trackMode, unitPosition])

  const statusText = route.status === 'loading'
    ? 'Loading route'
    : route.status === 'failed'
      ? route.error || 'Route unavailable'
      : route.status === 'ready'
        ? hospitalMap?.routeKind === 'transport'
          ? progress >= 1
            ? 'At hospital'
            : transported && route.startedAt
              ? 'Transporting'
              : 'Route ready'
          : progress >= 1
            ? 'On scene'
            : 'En route'
        : 'Awaiting address'

  return (
    <div
      ref={rootRef}
      data-testid="dispatch-route-map-shell"
      className={cn(
        'flex overflow-hidden border border-neutral-700 bg-dispatch-panel-soft',
        fullscreen
          ? contained
            ? 'absolute inset-0 z-[1200] overscroll-none rounded-none'
            : 'fixed left-0 top-0 z-[1200] h-[100dvh] w-[100dvw] overscroll-none rounded-none'
          : 'h-full min-h-0 flex-col rounded-md',
      )}
    >
      {fullscreen && hospitalMap && (
        <HospitalDirectoryPanel
          distances={hospitalMap.distances}
          distanceStatus={hospitalMap.distanceStatus}
          selectedHospitalId={hospitalMap.selectedHospitalId}
          pendingHospitalId={hospitalMap.pendingHospitalId}
          failedHospitalId={hospitalMap.failedHospitalId}
          disabled={readOnly || atHospital}
          onSelectHospital={(hospitalId) => onSelectHospital?.(hospitalId)}
        />
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 bg-black">
          <div ref={containerRef} data-testid="dispatch-route-map" className="h-full w-full" />
          {route.status === 'ready' && (
            <button
              type="button"
              onClick={toggleTrackMode}
              disabled={fullscreen || readOnly}
              title={fullscreen ? 'Exit full screen to track the unit' : undefined}
              aria-label="Toggle unit tracking"
              aria-pressed={trackMode === 'follow'}
              data-testid="map-track-toggle"
              className={cn(
                'absolute right-2 top-2 z-[1000] rounded border px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em]',
                trackMode === 'follow'
                  ? 'border-dispatch-blue bg-dispatch-blue text-black'
                  : 'border-neutral-600 bg-black/80 text-neutral-200 enabled:hover:text-white',
                'disabled:cursor-not-allowed disabled:opacity-45',
              )}
            >
              {trackMode === 'follow' ? 'Tracking' : 'Track unit'}
            </button>
          )}
          {hospitalMap && (
            <button
              type="button"
              onClick={toggleHospitalMode}
              disabled={fullscreen || !route.destination || readOnly}
              title={
                fullscreen
                  ? 'Use Minimize to leave the full screen hospital directory'
                  : !route.destination
                    ? 'Hospital directory requires incident coordinates'
                    : undefined
              }
              aria-label="Toggle hospital directory"
              aria-pressed={hospitalMode}
              data-testid="map-hospital-toggle"
              className={cn(
                'absolute right-2 z-[1000] grid h-8 w-8 place-items-center rounded border bg-black/80 text-white',
                route.status === 'ready' ? 'top-11' : 'top-2',
                hospitalMode ? 'border-dispatch-blue text-dispatch-blue' : 'border-neutral-600',
                'disabled:cursor-not-allowed disabled:opacity-45',
              )}
            >
              <HospitalIcon />
            </button>
          )}
          {hospitalMap && (
            <button
              ref={fullscreenButtonRef}
              type="button"
              onClick={() => void toggleFullscreen()}
              disabled={readOnly}
              aria-label={fullscreen ? 'Exit full screen map' : 'Open full screen map'}
              aria-pressed={fullscreen}
              data-testid="map-fullscreen-toggle"
              className={cn(
                'z-[1000] grid place-items-center rounded border border-neutral-600 bg-black/80 text-white disabled:cursor-default',
                fullscreen && !contained
                  ? 'fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] min-h-12 min-w-12 grid-flow-col gap-2 px-3 font-mono text-xs font-black uppercase tracking-[0.1em]'
                  : 'absolute bottom-2 right-2 h-8 w-8',
              )}
            >
              <FullscreenIcon collapse={fullscreen} />
              {fullscreen && !contained && <span>Minimize</span>}
            </button>
          )}
          {route.status !== 'ready' && (
            <div className="pointer-events-none absolute inset-0 z-[800] grid place-items-center bg-black/72 px-4 text-center">
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
              {statusText}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function HospitalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path d="M5 21V4h14v17M3 21h18M9 8h6M12 5v6M8 21v-5h8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FullscreenIcon({ collapse }: { collapse: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      {collapse ? (
        <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}
