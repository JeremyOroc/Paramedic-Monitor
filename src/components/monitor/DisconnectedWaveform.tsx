'use client'

import { cn } from '@/lib/utils'

type DisconnectedWaveformProps = {
  color: string
  channel: 'ecg' | 'spo2' | 'etco2'
  className?: string
}

export function DisconnectedWaveform({
  color,
  channel,
  className,
}: DisconnectedWaveformProps) {
  return (
    <div
      className={cn('relative block h-full w-full bg-black', className)}
      data-testid="disconnected-waveform"
      data-channel={channel}
    >
      <div
        className="absolute left-3 right-3 top-1/2 h-[2px] -translate-y-1/2 opacity-80"
        data-testid="disconnected-dash-line"
        style={{
          backgroundImage: `repeating-linear-gradient(to right, ${color} 0 20px, transparent 20px 34px)`,
        }}
      />
    </div>
  )
}
