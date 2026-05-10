'use client'

import { VideoWaveform } from './VideoWaveform'

type ECGCanvasProps = {
  src?: string
  /** Reserved for Phase 4 canvas renderer; currently uses placeholder media. */
  className?: string
}

export function ECGCanvas({ src = '/waveforms/ecg-placeholder.gif', className }: ECGCanvasProps) {
  return (
    <div className={className}>
      <VideoWaveform src={src} alt="ECG waveform" />
    </div>
  )
}
