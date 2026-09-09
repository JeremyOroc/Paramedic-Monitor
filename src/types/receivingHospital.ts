import type { LatLng } from '@/types/dispatchRoute'

export type ReceivingHospitalPatientGroup = 'adult' | 'pediatric'

export type ReceivingHospital = {
  id: string
  name: string
  designation: string
  keyNotes: string
  patientGroup: ReceivingHospitalPatientGroup
  routingAddress: string
  position: LatLng
}

export type HospitalDistanceMap = Record<string, number | null>

export type HospitalDistanceStatus = 'idle' | 'loading' | 'ready' | 'failed'

export type HospitalRouteKind = 'dispatch' | 'transport'

export type HospitalMapState = {
  routeKind: HospitalRouteKind
  selectedHospitalId: string | null
  pendingHospitalId: string | null
  failedHospitalId: string | null
  failureMessage: string
  directoryOpen: boolean
  fullscreen: boolean
  distances: HospitalDistanceMap
  distanceStatus: HospitalDistanceStatus
  rankingOrigin: LatLng | null
}
