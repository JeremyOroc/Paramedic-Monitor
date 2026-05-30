'use client'

import Image from 'next/image'

import type { Rhythm } from '@/types/vitals'

const TWELVE_LEAD_CAPTURE_IMAGE = '/images/twelve-lead-capture.svg'

type TwelveLeadPrintoutProps = {
  rhythm: Rhythm
  hr: number
}

export function TwelveLeadPrintout({ rhythm, hr }: TwelveLeadPrintoutProps) {
  return (
    <div
      data-testid="twelve-lead-printout"
      data-captured-rhythm={rhythm}
      data-captured-hr={hr}
      aria-label="12-lead printout"
      className="relative h-full w-full overflow-hidden bg-white"
    >
      <Image
        src={TWELVE_LEAD_CAPTURE_IMAGE}
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
