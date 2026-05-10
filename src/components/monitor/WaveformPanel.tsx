'use client'

import { ECGCanvas } from './ECGCanvas'
import { SecondaryChannel } from './SecondaryChannel'
import { ApplyElectrodesBar } from './ApplyElectrodesBar'

type WaveformPanelProps = {
  secondaryChannel: 'spo2' | 'etco2'
  showApplyElectrodes?: boolean
  ecgSrc?: string
  spo2Src?: string
  etco2Src?: string
}

export function WaveformPanel({
  secondaryChannel,
  showApplyElectrodes = true,
  ecgSrc,
  spo2Src,
  etco2Src,
}: WaveformPanelProps) {
  return (
    <div className="h-full w-full flex flex-col bg-black">
      <div className="relative flex-1 min-h-0 border-b border-neutral-800">
        <span className="absolute top-1 left-2 text-xs font-mono font-bold text-ecg-green z-10">
          Elect 1.0 cm/mV
        </span>
        <ECGCanvas src={ecgSrc} className="h-full w-full" />
        {showApplyElectrodes && (
          <div className="absolute inset-x-0 bottom-0">
            <ApplyElectrodesBar />
          </div>
        )}
      </div>
      <div className="relative flex-1 min-h-0">
        <SecondaryChannel
          channel={secondaryChannel}
          spo2Src={spo2Src}
          etco2Src={etco2Src}
        />
      </div>
    </div>
  )
}
