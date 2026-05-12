'use client'

import { ECGCanvas } from './ECGCanvas'
import { SecondaryChannel } from './SecondaryChannel'
import { ApplyElectrodesBar } from './ApplyElectrodesBar'
import type { Etco2Waveform, Rhythm, Spo2Waveform } from '@/types/vitals'

type WaveformPanelProps = {
  secondaryChannel: 'spo2' | 'etco2'
  rhythm: Rhythm
  hr: number
  spo2: number
  etco2: number
  spo2Waveform: Spo2Waveform
  etco2Waveform: Etco2Waveform
  showApplyElectrodes?: boolean
}

export function WaveformPanel({
  secondaryChannel,
  rhythm,
  hr,
  spo2,
  etco2,
  spo2Waveform,
  etco2Waveform,
  showApplyElectrodes = true,
}: WaveformPanelProps) {
  return (
    <div className="h-full w-full flex flex-col bg-black">
      <div className="relative flex-1 min-h-0 border-b border-neutral-800">
        <span className="absolute top-1 left-2 text-xs font-mono font-bold text-ecg-green z-10">
          Pads 1.0 cm/mV
        </span>
        <ECGCanvas rhythm={rhythm} hr={hr} className="h-full w-full" />
        {showApplyElectrodes && (
          <div className="absolute inset-x-0 bottom-0">
            <ApplyElectrodesBar />
          </div>
        )}
      </div>
      <div className="relative flex-1 min-h-0">
        <SecondaryChannel
          channel={secondaryChannel}
          hr={hr}
          spo2={spo2}
          etco2={etco2}
          spo2Waveform={spo2Waveform}
          etco2Waveform={etco2Waveform}
        />
      </div>
    </div>
  )
}
