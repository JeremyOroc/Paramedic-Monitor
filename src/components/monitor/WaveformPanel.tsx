'use client'

import { ECGCanvas } from './ECGCanvas'
import { SecondaryChannel } from './SecondaryChannel'
import { ApplyElectrodesBar } from './ApplyElectrodesBar'
import { cn } from '@/lib/utils'
import type { Etco2Waveform, Rhythm, Spo2Waveform } from '@/types/vitals'
import type { MonitorSelection } from '@/types/monitorSelection'

type WaveformPanelProps = {
  secondaryChannel: 'spo2' | 'etco2'
  rhythm: Rhythm
  hr: number
  spo2: number
  etco2: number
  spo2Waveform: Spo2Waveform
  etco2Waveform: Etco2Waveform
  showApplyElectrodes?: boolean
  showAllSecondaryChannels?: boolean
  selected?: MonitorSelection
  etco2Loading?: boolean
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
  showAllSecondaryChannels = false,
  selected,
  etco2Loading = false,
}: WaveformPanelProps) {
  const ecgConnected = rhythm !== 'off'
  const spo2Connected = spo2Waveform !== 'off'
  const etco2Connected = etco2Waveform !== 'off'
  const ecgLabel = (
    <div className="absolute top-1 left-2 z-10 flex items-center gap-16 text-xs font-mono font-bold text-ecg-green">
      <span className={cn('px-1 py-0.5', selected === 'padsLabel' && 'bg-[var(--color-selection-blue)] text-white')}>
        Pads
      </span>
      <span className={cn('px-1 py-0.5', selected === 'ecgGain' && 'bg-[var(--color-selection-blue)] text-white')}>
        1.0 cm/mV
      </span>
    </div>
  )

  if (showAllSecondaryChannels) {
    return (
      <div className="h-full w-full grid grid-rows-[1.05fr_1fr_0.78fr] bg-black">
        <div className="relative min-h-0 border-b border-neutral-800">
          {ecgLabel}
          <ECGCanvas
            rhythm={rhythm}
            hr={hr}
            connected={ecgConnected}
            className="h-full w-full"
          />
        </div>
        <div className="relative min-h-0 border-b border-neutral-800">
          <SecondaryChannel
            channel="etco2"
            hr={hr}
            spo2={spo2}
            etco2={etco2}
            spo2Waveform={spo2Waveform}
            etco2Waveform={etco2Waveform}
            selectedLabel={selected === 'etco2Label'}
            selectedScale={selected === 'etco2Scale'}
            connected={etco2Connected}
            loading={etco2Loading}
          />
        </div>
        <div className="relative min-h-0">
          <SecondaryChannel
            channel="spo2"
            hr={hr}
            spo2={spo2}
            etco2={etco2}
            spo2Waveform={spo2Waveform}
            etco2Waveform={etco2Waveform}
            selectedLabel={selected === 'spo2Label'}
            selectedScale={selected === 'spo2Scale'}
            connected={spo2Connected}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-black">
      <div className="relative flex-1 min-h-0 border-b border-neutral-800">
        {ecgLabel}
        <ECGCanvas
          rhythm={rhythm}
          hr={hr}
          connected={ecgConnected}
          className="h-full w-full"
        />
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
          selectedLabel={selected === `${secondaryChannel}Label`}
          selectedScale={selected === `${secondaryChannel}Scale`}
          connected={secondaryChannel === 'etco2' ? etco2Connected : spo2Connected}
          loading={secondaryChannel === 'etco2' && etco2Loading}
        />
      </div>
    </div>
  )
}
