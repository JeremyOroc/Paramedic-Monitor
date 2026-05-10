'use client'

import { VideoWaveform } from './VideoWaveform'
import { cn } from '@/lib/utils'

type LeadCellProps = {
  label: string
  videoSrc?: string
  className?: string
}

export function LeadCell({ label, videoSrc, className }: LeadCellProps) {
  return (
    <div
      className={cn(
        'relative border border-neutral-800 bg-black overflow-hidden',
        className,
      )}
    >
      <span
        className="absolute top-1 left-2 text-xs font-mono font-bold text-green-400 z-10"
        style={{ textShadow: '0 0 2px black' }}
      >
        {label}
      </span>
      <VideoWaveform src={videoSrc} alt={`Lead ${label}`} />
    </div>
  )
}
