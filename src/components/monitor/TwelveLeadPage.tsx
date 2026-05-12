'use client'

import type { Rhythm } from '@/types/vitals'
import type { LeadName } from '@/lib/ecg/rhythms'
import { LeadCell } from './LeadCell'

type TwelveLeadPageProps = {
  rhythm: Rhythm
  hr: number
}

const LEADS: ReadonlyArray<readonly [LeadName, LeadName]> = [
  ['I',   'V1'],
  ['II',  'V2'],
  ['III', 'V3'],
  ['aVR', 'V4'],
  ['aVL', 'V5'],
  ['aVF', 'V6'],
] as const

export function TwelveLeadPage({ rhythm, hr }: TwelveLeadPageProps) {
  return (
    <div className="h-full w-full bg-black p-2 grid grid-cols-2 grid-rows-6 gap-1">
      {LEADS.flatMap(([left, right]) => [
        <LeadCell key={left} label={left} rhythm={rhythm} hr={hr} />,
        <LeadCell key={right} label={right} rhythm={rhythm} hr={hr} />,
      ])}
    </div>
  )
}
