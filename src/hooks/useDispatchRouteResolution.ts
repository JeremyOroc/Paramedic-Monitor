'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  fetchDrivingRoute,
  geocodeAddress,
  getGeoapifyApiKey,
} from '@/lib/dispatchRoute'
import { normalizeDispatchAddress } from '@/store/fieldState'
import { useMonitorStore } from '@/store/monitorStore'
import {
  DEFAULT_DISPATCH_ROUTE,
  JOHN_ABBOTT_ADDRESS,
  JOHN_ABBOTT_COORDINATES,
  type DispatchRoute,
} from '@/types/dispatchRoute'

type DispatchRouteResolution = {
  retryRoute: () => void
}

type UseDispatchRouteResolutionOptions = {
  onConfirmedRouteReady?: (route: DispatchRoute) => void
}

/**
 * Resolves dispatch routing independently of the currently selected instructor
 * tab. Results are applied only while their authored origin/destination still
 * match, so a slower obsolete request can never replace a newer address.
 */
export function useDispatchRouteResolution({
  onConfirmedRouteReady,
}: UseDispatchRouteResolutionOptions = {}): DispatchRouteResolution {
  const originAddress = useMonitorStore((state) => state.dispatchRouteDraft.originAddress)
  const destinationAddress = useMonitorStore((state) => state.callerInfoDraft.address)
  const applyResolution = useMonitorStore((state) => state.applyDispatchRouteResolution)
  const [retryVersion, setRetryVersion] = useState(0)
  const onConfirmedRouteReadyRef = useRef(onConfirmedRouteReady)

  useEffect(() => {
    onConfirmedRouteReadyRef.current = onConfirmedRouteReady
  }, [onConfirmedRouteReady])

  const retryRoute = useCallback(() => {
    setRetryVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    const normalizedOrigin = originAddress.trim() || JOHN_ABBOTT_ADDRESS
    const normalizedDestination = destinationAddress.trim()
    const requestKey = `${normalizeDispatchAddress(normalizedOrigin)}\n${normalizeDispatchAddress(normalizedDestination)}`
    const controller = new AbortController()
    let cancelled = false

    const existingRoute = useMonitorStore.getState().dispatchRouteDraft
    const existingKey = `${normalizeDispatchAddress(existingRoute.originAddress)}\n${normalizeDispatchAddress(existingRoute.destinationAddress)}`

    const applyIfCurrent = (route: DispatchRoute) => {
      if (cancelled || controller.signal.aborted) return
      const current = useMonitorStore.getState()
      const currentKey = `${normalizeDispatchAddress(current.dispatchRouteDraft.originAddress)}\n${normalizeDispatchAddress(current.callerInfoDraft.address)}`
      if (currentKey !== requestKey) return

      applyResolution(route)
      if (route.status !== 'ready') return

      const confirmed = useMonitorStore.getState()
      if (
        confirmed.dispatch.armed &&
        normalizeDispatchAddress(confirmed.dispatchRouteConfirmed.originAddress) ===
          normalizeDispatchAddress(route.originAddress) &&
        normalizeDispatchAddress(confirmed.callerInfoConfirmed.address) ===
          normalizeDispatchAddress(route.destinationAddress)
      ) {
        onConfirmedRouteReadyRef.current?.(confirmed.dispatchRouteConfirmed)
      }
    }

    if (existingRoute.status === 'ready' && existingKey === requestKey) {
      applyIfCurrent(existingRoute)
      return () => {
        cancelled = true
        controller.abort()
      }
    }

    if (normalizedDestination === '') {
      applyIfCurrent({
        ...DEFAULT_DISPATCH_ROUTE,
        originAddress: normalizedOrigin,
        origin:
          normalizedOrigin === JOHN_ABBOTT_ADDRESS
            ? JOHN_ABBOTT_COORDINATES
            : null,
      })
      return () => {
        cancelled = true
        controller.abort()
      }
    }

    if (!getGeoapifyApiKey()) {
      applyIfCurrent({
        ...DEFAULT_DISPATCH_ROUTE,
        originAddress: normalizedOrigin,
        destinationAddress: normalizedDestination,
        status: 'failed',
        error: 'Geoapify API key missing',
      })
      return () => {
        cancelled = true
        controller.abort()
      }
    }

    const timeout = window.setTimeout(() => {
      applyIfCurrent({
        ...DEFAULT_DISPATCH_ROUTE,
        originAddress: normalizedOrigin,
        destinationAddress: normalizedDestination,
        status: 'loading',
      })

      const buildRoute = async () => {
        const origin =
          normalizedOrigin === JOHN_ABBOTT_ADDRESS
            ? { formatted: JOHN_ABBOTT_ADDRESS, latLng: JOHN_ABBOTT_COORDINATES }
            : await geocodeAddress(normalizedOrigin, undefined, controller.signal)
        const destination = await geocodeAddress(
          normalizedDestination,
          undefined,
          controller.signal,
        )
        if (!origin || !destination) throw new Error('Address not found')

        const route = await fetchDrivingRoute(
          origin.latLng,
          destination.latLng,
          controller.signal,
        )
        applyIfCurrent({
          originAddress: normalizedOrigin,
          destinationAddress: normalizedDestination,
          origin: origin.latLng,
          destination: destination.latLng,
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          geometry: route.geometry,
          startedAt: null,
          status: 'ready',
          error: '',
        })
      }

      void buildRoute().catch((error: unknown) => {
        if (cancelled || controller.signal.aborted) return
        applyIfCurrent({
          ...DEFAULT_DISPATCH_ROUTE,
          originAddress: normalizedOrigin,
          destinationAddress: normalizedDestination,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Route unavailable',
        })
      })
    }, 750)

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [applyResolution, destinationAddress, originAddress, retryVersion])

  return { retryRoute }
}
