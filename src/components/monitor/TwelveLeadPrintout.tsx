'use client'

import Image from 'next/image'

import type { Rhythm } from '@/types/vitals'

const TWELVE_LEAD_CAPTURE_IMAGE = '/images/twelve-lead-capture.svg'
const ANTERIOR_MI_CAPTURE_IMAGE = '/images/anterior-mi-strip.jpg'
const INFERIOR_MI_CAPTURE_IMAGE = '/images/inferior-mi-strip.jpeg'

type TwelveLeadPrintoutProps = {
  rhythm: Rhythm
  hr: number
}

export function TwelveLeadPrintout({ rhythm, hr }: TwelveLeadPrintoutProps) {
  const imageSrc =
    rhythm === 'anterior-mi'
      ? ANTERIOR_MI_CAPTURE_IMAGE
      : rhythm === 'inferior-mi'
        ? INFERIOR_MI_CAPTURE_IMAGE
        : TWELVE_LEAD_CAPTURE_IMAGE

  return (
    <div
      data-testid="twelve-lead-printout"
      data-captured-rhythm={rhythm}
      data-captured-hr={hr}
      aria-label="12-lead printout"
      className="relative h-full w-full overflow-hidden bg-white"
    >
      <Image
        src={imageSrc}
        alt="12-lead ECG capture"
        fill
        priority
        sizes="100vw"
        className="object-fill"
        draggable={false}
      />
    </div>
  )
}
