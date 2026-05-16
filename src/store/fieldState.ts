import { CALLER_INFO_FIELDS, type CallerInfo } from '@/types/callerInfo'

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

export function hasCallerInfoDirty(draft: CallerInfo, saved: CallerInfo): boolean {
  return CALLER_INFO_FIELDS.some(({ field }) => draft[field] !== saved[field])
}

export function hasCallerInfoPending(saved: CallerInfo, confirmed: CallerInfo): boolean {
  return CALLER_INFO_FIELDS.some(({ field }) => saved[field] !== confirmed[field])
}
