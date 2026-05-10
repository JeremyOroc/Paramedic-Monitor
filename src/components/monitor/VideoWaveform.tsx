'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type VideoWaveformProps = {
  src?: string
  className?: string
  alt?: string
}

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov']

function isVideoSrc(src: string) {
  const lower = src.toLowerCase()
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export function VideoWaveform({ src, className, alt = '' }: VideoWaveformProps) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return <div className={cn('w-full h-full bg-transparent', className)} aria-hidden />
  }

  if (isVideoSrc(src)) {
    return (
      <video
        src={src}
        className={cn('w-full h-full object-cover', className)}
        loop
        muted
        autoPlay
        playsInline
        onError={() => setErrored(true)}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn('w-full h-full object-cover', className)}
      onError={() => setErrored(true)}
    />
  )
}
