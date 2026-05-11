'use client'

import { ChannelSelector } from './ChannelSelector'
import type { Etco2Waveform } from '@/types/vitals'

const ETCO2_OPTIONS: ReadonlyArray<{ value: Etco2Waveform; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'hypoventilation', label: 'Hypo' },
  { value: 'obstructed', label: 'Obstr.' },
  { value: 'off', label: 'Off' },
]

export function Etco2WaveformSelector() {
  return <ChannelSelector field="etco2_waveform" label="EtCO2" options={ETCO2_OPTIONS} />
}
