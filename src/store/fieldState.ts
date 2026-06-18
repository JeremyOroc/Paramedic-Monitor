import { CALLER_INFO_FIELDS, type CallerInfo } from '@/types/callerInfo'
import type { DispatchRoute, LatLng } from '@/types/dispatchRoute'
import type { NumericVitalField, VitalActiveState } from '@/types/vitals'

import type { Vitals } from './monitorStore'

export type FieldStatus = 'clean' | 'dirty' | 'pending'

export function fieldStatus<K extends keyof Vitals>(
  field: K,
  draft: Vitals,
  saved: Vitals,
  confirmed: Vitals,
): FieldStatus {
  if (draft[field] !== saved[field]) return 'dirty'
  if (saved[field] !== confirmed[field]) return 'pending'
  return 'clean'
}

export function vitalStatus(
  field: NumericVitalField,
  draft: Vitals,
  saved: Vitals,
  confirmed: Vitals,
  draftActive: VitalActiveState,
  savedActive: VitalActiveState,
  confirmedActive: VitalActiveState,
): FieldStatus {
  if (draft[field] !== saved[field] || draftActive[field] !== savedActive[field]) {
    return 'dirty'
  }
  if (saved[field] !== confirmed[field] || savedActive[field] !== confirmedActive[field]) {
    return 'pending'
  }
  return 'clean'
}

export function hasDirty(draft: Vitals, saved: Vitals): boolean {
  return (
    draft.hr !== saved.hr ||
    draft.bp_sys !== saved.bp_sys ||
    draft.bp_dia !== saved.bp_dia ||
    draft.etco2 !== saved.etco2 ||
    draft.spo2 !== saved.spo2 ||
    draft.rhythm !== saved.rhythm ||
    draft.spo2_waveform !== saved.spo2_waveform ||
    draft.etco2_waveform !== saved.etco2_waveform
  )
}

export function hasVitalActiveDirty(
  draftActive: VitalActiveState,
  savedActive: VitalActiveState,
): boolean {
  return (
    draftActive.hr !== savedActive.hr ||
    draftActive.bp_sys !== savedActive.bp_sys ||
    draftActive.bp_dia !== savedActive.bp_dia ||
    draftActive.etco2 !== savedActive.etco2 ||
    draftActive.spo2 !== savedActive.spo2
  )
}

export function hasPending(saved: Vitals, confirmed: Vitals): boolean {
  return (
    saved.hr !== confirmed.hr ||
    saved.bp_sys !== confirmed.bp_sys ||
    saved.bp_dia !== confirmed.bp_dia ||
    saved.etco2 !== confirmed.etco2 ||
    saved.spo2 !== confirmed.spo2 ||
    saved.rhythm !== confirmed.rhythm ||
    saved.spo2_waveform !== confirmed.spo2_waveform ||
    saved.etco2_waveform !== confirmed.etco2_waveform
  )
}

export function hasVitalActivePending(
  savedActive: VitalActiveState,
  confirmedActive: VitalActiveState,
): boolean {
  return (
    savedActive.hr !== confirmedActive.hr ||
    savedActive.bp_sys !== confirmedActive.bp_sys ||
    savedActive.bp_dia !== confirmedActive.bp_dia ||
    savedActive.etco2 !== confirmedActive.etco2 ||
    savedActive.spo2 !== confirmedActive.spo2
  )
}

export function hasCallerInfoDirty(draft: CallerInfo, saved: CallerInfo): boolean {
  return CALLER_INFO_FIELDS.some(({ field }) => draft[field] !== saved[field])
}

export function hasCallerInfoPending(saved: CallerInfo, confirmed: CallerInfo): boolean {
  return CALLER_INFO_FIELDS.some(({ field }) => saved[field] !== confirmed[field])
}

function sameLatLng(a: LatLng | null, b: LatLng | null): boolean {
  if (a === null || b === null) return a === b
  return a.lat === b.lat && a.lng === b.lng
}

function sameGeometry(a: LatLng[], b: LatLng[]): boolean {
  return a.length === b.length &&
    a.every((point, index) => point.lat === b[index].lat && point.lng === b[index].lng)
}

export function hasDispatchRouteChanged(a: DispatchRoute, b: DispatchRoute): boolean {
  return (
    a.originAddress !== b.originAddress ||
    a.destinationAddress !== b.destinationAddress ||
    !sameLatLng(a.origin, b.origin) ||
    !sameLatLng(a.destination, b.destination) ||
    a.distanceMeters !== b.distanceMeters ||
    a.status !== b.status ||
    a.error !== b.error ||
    !sameGeometry(a.geometry, b.geometry)
  )
}

export function dispatchCountdownSeconds(minutes: number, seconds: number): number {
  return Math.max(0, Math.floor(minutes) || 0) * 60 +
    Math.min(59, Math.max(0, Math.floor(seconds) || 0))
}

export function hasDispatchRouteDurationPending(
  confirmedRoute: DispatchRoute,
  minutes: number,
  seconds: number,
): boolean {
  return confirmedRoute.status === 'ready' &&
    confirmedRoute.durationSeconds !== dispatchCountdownSeconds(minutes, seconds)
}
