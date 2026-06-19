export type LatLng = {
  lat: number
  lng: number
}

export type DispatchRouteStatus = 'idle' | 'loading' | 'ready' | 'failed'

export type DispatchRoute = {
  originAddress: string
  destinationAddress: string
  origin: LatLng | null
  destination: LatLng | null
  distanceMeters: number | null
  durationSeconds: number | null
  geometry: LatLng[]
  startedAt: number | null
  status: DispatchRouteStatus
  error: string
}

export const JOHN_ABBOTT_ADDRESS =
  'John Abbott College, 21275 Lakeshore Road, Sainte-Anne-de-Bellevue, QC H9X 3L9'

export const JOHN_ABBOTT_COORDINATES: LatLng = {
  lat: 45.4068,
  lng: -73.9412,
}

export const DEFAULT_DISPATCH_ROUTE: DispatchRoute = {
  originAddress: JOHN_ABBOTT_ADDRESS,
  destinationAddress: '',
  origin: JOHN_ABBOTT_COORDINATES,
  destination: null,
  distanceMeters: null,
  durationSeconds: null,
  geometry: [],
  startedAt: null,
  status: 'idle',
  error: '',
}

function normalizeLatLng(value: Partial<LatLng> | null | undefined): LatLng | null {
  if (typeof value?.lat !== 'number' || typeof value.lng !== 'number') return null
  return {
    lat: value.lat,
    lng: value.lng,
  }
}

export function normalizeDispatchRoute(
  route: Partial<DispatchRoute> | null | undefined,
): DispatchRoute {
  if (!route) return DEFAULT_DISPATCH_ROUTE

  const status: DispatchRouteStatus =
    route.status === 'loading' || route.status === 'ready' || route.status === 'failed'
      ? route.status
      : 'idle'

  return {
    originAddress:
      typeof route.originAddress === 'string' && route.originAddress.trim() !== ''
        ? route.originAddress
        : JOHN_ABBOTT_ADDRESS,
    destinationAddress:
      typeof route.destinationAddress === 'string' ? route.destinationAddress : '',
    origin: normalizeLatLng(route.origin) ?? JOHN_ABBOTT_COORDINATES,
    destination: normalizeLatLng(route.destination),
    distanceMeters:
      typeof route.distanceMeters === 'number' ? route.distanceMeters : null,
    durationSeconds:
      typeof route.durationSeconds === 'number' ? route.durationSeconds : null,
    geometry: Array.isArray(route.geometry)
      ? route.geometry.map((point) => normalizeLatLng(point)).filter((point) => point !== null)
      : [],
    startedAt: typeof route.startedAt === 'number' ? route.startedAt : null,
    status,
    error: typeof route.error === 'string' ? route.error : '',
  }
}
