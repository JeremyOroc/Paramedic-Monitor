'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  fetchDrivingDistances,
  fetchDrivingRoute,
  getPointAlongRoute,
  getRouteProgress,
} from '@/lib/dispatchRoute'
import { getReceivingHospital, RECEIVING_HOSPITALS } from '@/lib/receivingHospitals'
import type { DispatchRoute, LatLng } from '@/types/dispatchRoute'
import type {
  HospitalDistanceMap,
  HospitalMapState,
} from '@/types/receivingHospital'

type PersistedTransportRoute = {
  identity: string
  selectedHospitalId: string
  route: DispatchRoute
}

type UseReceivingHospitalRoutingOptions = {
  dispatchRoute: DispatchRoute
  dispatchRunId: string
  incidentAddress: string
  monitorResetVersion: number
  storageScope?: string
  transported: boolean
}

const STORAGE_PREFIX = 'paramedic-monitor.transport.v1'

function routeIdentity(
  dispatchRunId: string,
  incidentAddress: string,
  monitorResetVersion: number,
): string {
  return `${dispatchRunId}|${incidentAddress}|${monitorResetVersion}`
}

function storageKey(scope: string): string {
  return `${STORAGE_PREFIX}.${scope}`
}

function emptyMapState(): HospitalMapState {
  return {
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
  }
}

function isDispatchRoute(value: unknown): value is DispatchRoute {
  if (!value || typeof value !== 'object') return false
  const route = value as Partial<DispatchRoute>
  return (
    typeof route.originAddress === 'string' &&
    typeof route.destinationAddress === 'string' &&
    Array.isArray(route.geometry) &&
    (route.status === 'idle' || route.status === 'loading' || route.status === 'ready' || route.status === 'failed')
  )
}

export function readPersistedTransportRoute(
  raw: string | null,
  identity: string,
): PersistedTransportRoute | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<PersistedTransportRoute>
    if (
      value.identity !== identity ||
      typeof value.selectedHospitalId !== 'string' ||
      !getReceivingHospital(value.selectedHospitalId) ||
      !isDispatchRoute(value.route)
    ) {
      return null
    }
    return value as PersistedTransportRoute
  } catch {
    return null
  }
}

function currentTransportPosition(route: DispatchRoute, now: number): LatLng | null {
  return getPointAlongRoute(route.geometry, getRouteProgress(route, now))
}

export function useReceivingHospitalRouting({
  dispatchRoute,
  dispatchRunId,
  incidentAddress,
  monitorResetVersion,
  storageScope = 'local',
  transported,
}: UseReceivingHospitalRoutingOptions) {
  const identity = useMemo(
    () => routeIdentity(dispatchRunId, incidentAddress, monitorResetVersion),
    [dispatchRunId, incidentAddress, monitorResetVersion],
  )
  const [mapState, setMapState] = useState<HospitalMapState>(emptyMapState)
  const [transportRoute, setTransportRoute] = useState<DispatchRoute | null>(null)
  const [clockNow, setClockNow] = useState(() => Date.now())
  const routeRequestRef = useRef<{ sequence: number; controller: AbortController } | null>(null)
  const distanceRequestRef = useRef<AbortController | null>(null)
  const identityRef = useRef(identity)
  const storageScopeRef = useRef(storageScope)

  /* eslint-disable react-hooks/set-state-in-effect -- localStorage is an external per-attempt store */
  useEffect(() => {
    identityRef.current = identity
    routeRequestRef.current?.controller.abort()
    distanceRequestRef.current?.abort()
    setMapState(emptyMapState())
    setTransportRoute(null)

    if (typeof window === 'undefined') return
    if (storageScopeRef.current !== storageScope) {
      localStorage.removeItem(storageKey(storageScopeRef.current))
      storageScopeRef.current = storageScope
    }
    const key = storageKey(storageScope)
    const persisted = readPersistedTransportRoute(localStorage.getItem(key), identity)
    if (!persisted) {
      localStorage.removeItem(key)
      return
    }
    setTransportRoute(persisted.route)
    setMapState((current) => ({
      ...current,
      routeKind: 'transport',
      selectedHospitalId: persisted.selectedHospitalId,
    }))
  }, [identity, storageScope])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      routeRequestRef.current?.controller.abort()
      distanceRequestRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!transportRoute?.startedAt) return
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [transportRoute?.startedAt])

  const startTransport = useCallback((startedAt: number) => {
    if (!transportRoute || transportRoute.status !== 'ready' || transportRoute.startedAt !== null) {
      return
    }
    const startedRoute = { ...transportRoute, startedAt }
    setClockNow(startedAt)
    setTransportRoute(startedRoute)
    if (typeof window !== 'undefined' && mapState.selectedHospitalId) {
      const persisted: PersistedTransportRoute = {
        identity,
        selectedHospitalId: mapState.selectedHospitalId,
        route: startedRoute,
      }
      localStorage.setItem(storageKey(storageScope), JSON.stringify(persisted))
    }
  }, [identity, mapState.selectedHospitalId, storageScope, transportRoute])

  const effectiveRoute = transportRoute ?? dispatchRoute

  const openDirectory = useCallback(() => {
    if (!dispatchRoute.destination) {
      setMapState((current) => ({
        ...current,
        directoryOpen: true,
        distanceStatus: 'idle',
        distances: {},
        rankingOrigin: null,
      }))
      return
    }
    const now = Date.now()
    const activePosition =
      transportRoute?.startedAt && getRouteProgress(transportRoute, now) < 1
        ? currentTransportPosition(transportRoute, now)
        : null
    const rankingOrigin = activePosition ?? dispatchRoute.destination
    const controller = new AbortController()
    distanceRequestRef.current?.abort()
    distanceRequestRef.current = controller
    setMapState((current) => ({
      ...current,
      directoryOpen: true,
      distanceStatus: 'loading',
      distances: {},
      rankingOrigin,
    }))

    void fetchDrivingDistances(
      rankingOrigin,
      RECEIVING_HOSPITALS.map((hospital) => hospital.position),
      controller.signal,
    ).then((distances) => {
      if (controller.signal.aborted) return
      const distanceMap: HospitalDistanceMap = {}
      RECEIVING_HOSPITALS.forEach((hospital, index) => {
        distanceMap[hospital.id] = distances[index] ?? null
      })
      setMapState((current) => ({
        ...current,
        distances: distanceMap,
        distanceStatus: 'ready',
      }))
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMapState((current) => ({ ...current, distanceStatus: 'failed' }))
    })
  }, [dispatchRoute.destination, transportRoute])

  const closeDirectory = useCallback(() => {
    distanceRequestRef.current?.abort()
    setMapState((current) => ({
      ...current,
      directoryOpen: false,
      fullscreen: false,
    }))
  }, [])

  const setFullscreen = useCallback((fullscreen: boolean) => {
    setMapState((current) => ({
      ...current,
      fullscreen,
      directoryOpen: fullscreen ? current.directoryOpen : false,
    }))
    if (fullscreen) openDirectory()
  }, [openDirectory])

  const selectHospital = useCallback((hospitalId: string) => {
    const hospital = getReceivingHospital(hospitalId)
    const incident = dispatchRoute.destination
    if (!hospital || !incident) return

    const now = Date.now()
    if (transportRoute && getRouteProgress(transportRoute, now) >= 1) return
    const currentPosition =
      transportRoute?.startedAt ? currentTransportPosition(transportRoute, now) : null
    const origin = currentPosition ?? incident
    const originAddress = currentPosition ? 'Current unit position' : dispatchRoute.destinationAddress
    const sequence = (routeRequestRef.current?.sequence ?? 0) + 1
    const controller = new AbortController()
    routeRequestRef.current?.controller.abort()
    routeRequestRef.current = { sequence, controller }

    setMapState((current) => ({
      ...current,
      pendingHospitalId: hospitalId,
      failedHospitalId: null,
      failureMessage: '',
    }))
    if (!currentPosition) {
      setTransportRoute({
        originAddress,
        destinationAddress: hospital.routingAddress,
        origin,
        destination: hospital.position,
        distanceMeters: null,
        durationSeconds: null,
        geometry: [],
        startedAt: null,
        status: 'loading',
        error: '',
      })
    }

    void fetchDrivingRoute(origin, hospital.position, controller.signal).then((result) => {
      if (controller.signal.aborted || routeRequestRef.current?.sequence !== sequence) return
      const route: DispatchRoute = {
        originAddress,
        destinationAddress: hospital.routingAddress,
        origin,
        destination: hospital.position,
        ...result,
        startedAt: currentPosition ? now : transported ? Date.now() : null,
        status: 'ready',
        error: '',
      }
      setTransportRoute(route)
      setMapState((current) => ({
        ...current,
        routeKind: 'transport',
        selectedHospitalId: hospitalId,
        pendingHospitalId: null,
      }))
      if (typeof window !== 'undefined' && identityRef.current === identity) {
        const persisted: PersistedTransportRoute = {
          identity,
          selectedHospitalId: hospitalId,
          route,
        }
        localStorage.setItem(storageKey(storageScope), JSON.stringify(persisted))
      }
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (routeRequestRef.current?.sequence !== sequence) return
      const message = 'Route unavailable'
      setMapState((current) => ({
        ...current,
        pendingHospitalId: null,
        failedHospitalId: hospitalId,
        failureMessage: message,
      }))
      if (!currentPosition) {
        setTransportRoute({
          originAddress,
          destinationAddress: hospital.routingAddress,
          origin,
          destination: hospital.position,
          distanceMeters: null,
          durationSeconds: null,
          geometry: [],
          startedAt: null,
          status: 'failed',
          error: message,
        })
        setMapState((current) => ({
          ...current,
          routeKind: 'transport',
          selectedHospitalId: hospitalId,
        }))
      }
    })
  }, [dispatchRoute.destination, dispatchRoute.destinationAddress, identity, storageScope, transportRoute, transported])

  const atHospital = Boolean(
    transportRoute?.startedAt && getRouteProgress(transportRoute, clockNow) >= 1,
  )

  return {
    effectiveRoute,
    mapState,
    atHospital,
    openDirectory,
    closeDirectory,
    setFullscreen,
    selectHospital,
    startTransport,
  }
}
