'use client'

import { ChannelSelector } from './ChannelSelector'
import type { Rhythm } from '@/types/vitals'

const ECG_RHYTHMS: ReadonlyArray<{ value: Rhythm; label: string }> = [
  { value: 'nsr', label: 'NSR' },
  { value: 'vf', label: 'VF' },
  { value: 'vt', label: 'VT' },
  { value: 'torsades', label: 'Torsades' },
  { value: 'asystole', label: 'Asystole' },
  { value: 'pea', label: 'PEA' },
]

export function EcgRhythmSelector() {
  return <ChannelSelector field="rhythm" label="ECG" options={ECG_RHYTHMS} />
}
