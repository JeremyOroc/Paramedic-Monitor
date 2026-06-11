'use client'

import { ChannelSelector } from './ChannelSelector'
import type { Spo2Waveform } from '@/types/vitals'

const SPO2_OPTIONS: ReadonlyArray<{ value: Spo2Waveform; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'weak', label: 'Weak' },
]

export function Spo2WaveformSelector() {
  return (
    <ChannelSelector
      field="spo2_waveform"
      label="SpO2"
      options={SPO2_OPTIONS}
      disconnectedValue="off"
      defaultConnectedValue="normal"
    />
  )
}
