'use client'

import Image from 'next/image'

import type { Rhythm } from '@/types/vitals'

const TWELVE_LEAD_CAPTURE_IMAGE = '/images/twelve-lead-capture.svg'
const REGULAR_SINUS_CAPTURE_IMAGE = '/images/regular-sinus-strip.png'
const ANTERIOR_MI_CAPTURE_IMAGE = '/images/anterior-mi-strip.jpg'
const INFERIOR_MI_CAPTURE_IMAGE = '/images/inferior-mi-strip.jpeg'
const VFIB_CAPTURE_IMAGE = '/images/vfib-12-lead-strip.png'
const FIRST_DEGREE_CAPTURE_IMAGE = '/images/first-degree-block-strip.png'
const SECOND_DEGREE_TYPE_1_CAPTURE_IMAGE = '/images/second-degree-type-1-strip.png'
const SECOND_DEGREE_TYPE_2_CAPTURE_IMAGE = '/images/second-degree-type-2-strip.png'
const THIRD_DEGREE_CAPTURE_IMAGE = '/images/third-degree-block-strip.png'

type TwelveLeadPrintoutProps = {
  rhythm: Rhythm
  hr: number
}

export function TwelveLeadPrintout({ rhythm, hr }: TwelveLeadPrintoutProps) {
  const imageSrc =
    rhythm === 'nsr'
      ? REGULAR_SINUS_CAPTURE_IMAGE
      : rhythm === 'anterior-mi'
        ? ANTERIOR_MI_CAPTURE_IMAGE
        : rhythm === 'inferior-mi'
          ? INFERIOR_MI_CAPTURE_IMAGE
          : rhythm === 'vf'
            ? VFIB_CAPTURE_IMAGE
            : rhythm === 'first-degree'
              ? FIRST_DEGREE_CAPTURE_IMAGE
              : rhythm === 'second-degree-type-1'
                ? SECOND_DEGREE_TYPE_1_CAPTURE_IMAGE
                : rhythm === 'second-degree-type-2'
                  ? SECOND_DEGREE_TYPE_2_CAPTURE_IMAGE
                  : rhythm === 'third-degree'
                    ? THIRD_DEGREE_CAPTURE_IMAGE
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
