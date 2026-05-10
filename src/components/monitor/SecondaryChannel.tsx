'use client'

import { VideoWaveform } from './VideoWaveform'
import { cn } from '@/lib/utils'

type SecondaryChannelProps = {
  channel: 'spo2' | 'etco2'
  spo2Src?: string
  etco2Src?: string
  className?: string
}

export function SecondaryChannel({
  channel,
  spo2Src = '/waveforms/spo2-placeholder.gif',
  etco2Src = '/waveforms/etco2-placeholder.gif',
  className,
}: SecondaryChannelProps) {
  const isEtco2 = channel === 'etco2'
  return (
    <div className={cn('relative h-full w-full', className)}>
      <span
        className={cn(
          'absolute top-1 left-2 text-xs font-mono font-bold z-10',
          isEtco2 ? 'text-purple-etco2' : 'text-yellow-spo2',
        )}
      >
        {isEtco2 ? 'EtCO2' : 'SpO2'}
      </span>
      {isEtco2 && (
        <div className="absolute right-2 top-1 bottom-1 flex flex-col justify-between text-[10px] font-mono text-purple-etco2 z-10">
          <span>63</span>
          <span>20</span>
          <span>0</span>
        </div>
      )}
      <VideoWaveform src={isEtco2 ? etco2Src : spo2Src} alt={isEtco2 ? 'EtCO2 waveform' : 'SpO2 waveform'} />
    </div>
  )
}
