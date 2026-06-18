import type { DispatchRoute, LatLng } from '@/types/dispatchRoute'

export type AddressSuggestion = {
  id: string
  formatted: string
  latLng: LatLng
}

type GeoapifyFeature = {
  properties?: {
    formatted?: string
    lat?: number
    lon?: number
    place_id?: string
  }
}

type GeoapifyResponse = {
  features?: GeoapifyFeature[]
}

type OsrmRoute = {
  distance?: number
  duration?: number
  geometry?: {
    coordinates?: [number, number][]
  }
}

type OsrmResponse = {
  routes?: OsrmRoute[]
}

export function getGeoapifyApiKey(): string {
  return process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ?? ''
}

function toSuggestion(feature: GeoapifyFeature, index: number): AddressSuggestion | null {
  const properties = feature.properties
  if (
    typeof properties?.formatted !== 'string' ||
    typeof properties.lat !== 'number' ||
    typeof properties.lon !== 'number'
  ) {
    return null
  }

  return {
    id: properties.place_id ?? `${properties.formatted}-${index}`,
    formatted: properties.formatted,
    latLng: {
      lat: properties.lat,
      lng: properties.lon,
    },
  }
}

export async function fetchAddressSuggestions(
  query: string,
  apiKey = getGeoapifyApiKey(),
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim()
  if (!apiKey || trimmed.length < 3) return []

  const params = new URLSearchParams({
    text: trimmed,
    apiKey,
    limit: '5',
    filter: 'countrycode:ca',
    bias: 'proximity:-73.9412,45.4068',
  })

  const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`)
  if (!response.ok) {
    throw new Error('Address suggestions unavailable')
  }

  const data = await response.json() as GeoapifyResponse
  return (data.features ?? [])
    .map((feature, index) => toSuggestion(feature, index))
    .filter((suggestion) => suggestion !== null)
}

export async function geocodeAddress(
  address: string,
  apiKey = getGeoapifyApiKey(),
): Promise<AddressSuggestion | null> {
  const trimmed = address.trim()
  if (!apiKey || trimmed.length < 3) return null

  const params = new URLSearchParams({
    text: trimmed,
    apiKey,
    limit: '1',
    filter: 'countrycode:ca',
    bias: 'proximity:-73.9412,45.4068',
  })

  const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`)
  if (!response.ok) {
    throw new Error('Address lookup unavailable')
  }

  const data = await response.json() as GeoapifyResponse
  const first = data.features?.[0]
  return first ? toSuggestion(first, 0) : null
}

export async function fetchDrivingRoute(
  origin: LatLng,
  destination: LatLng,
): Promise<Pick<DispatchRoute, 'distanceMeters' | 'durationSeconds' | 'geometry'>> {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
  )
  if (!response.ok) {
    throw new Error('Route lookup unavailable')
  }

  const data = await response.json() as OsrmResponse
  const route = data.routes?.[0]
  if (
    typeof route?.distance !== 'number' ||
    typeof route.duration !== 'number' ||
    !Array.isArray(route.geometry?.coordinates)
  ) {
    throw new Error('No route found')
  }

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
  }
}

export function formatDistance(meters: number | null): string {
  if (meters === null) return '-- km'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '--:--'
  const minutes = Math.max(0, Math.ceil(seconds / 60))
  return `${minutes} min`
}

function distanceBetween(a: LatLng, b: LatLng): number {
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const deltaLat = (b.lat - a.lat) * Math.PI / 180
  const deltaLng = (b.lng - a.lng) * Math.PI / 180
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2

  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function getRouteProgress(route: DispatchRoute, now = Date.now()): number {
  if (!route.startedAt) return 0
  if (!route.durationSeconds || route.durationSeconds <= 0) return 1
  return Math.min(1, Math.max(0, (now - route.startedAt) / (route.durationSeconds * 1000)))
}

export function getPointAlongRoute(geometry: LatLng[], progress: number): LatLng | null {
  if (geometry.length === 0) return null
  if (geometry.length === 1 || progress <= 0) return geometry[0]
  if (progress >= 1) return geometry[geometry.length - 1]

  const segmentLengths = geometry.slice(1).map((point, index) =>
    distanceBetween(geometry[index], point),
  )
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0)
  if (totalLength <= 0) return geometry[0]

  let remaining = totalLength * progress
  for (let i = 0; i < segmentLengths.length; i += 1) {
    const segmentLength = segmentLengths[i]
    if (remaining <= segmentLength) {
      const start = geometry[i]
      const end = geometry[i + 1]
      const ratio = segmentLength === 0 ? 0 : remaining / segmentLength
      return {
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio,
      }
    }
    remaining -= segmentLength
  }

  return geometry[geometry.length - 1]
}
