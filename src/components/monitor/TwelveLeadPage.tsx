'use client'

import type { Rhythm } from '@/types/vitals'
import { LeadCell } from './LeadCell'

type TwelveLeadPageProps = {
  rhythm: Rhythm
}

const LEADS: ReadonlyArray<readonly [string, string]> = [
  ['I', 'aVR'],
  ['II', 'aVL'],
  ['III', 'aVF'],
  ['V1', 'V4'],
  ['V2', 'V5'],
  ['V3', 'V6'],
] as const

function leadSrc(rhythm: Rhythm, lead: string) {
  return `/waveforms/12lead/${rhythm}/${lead}.gif`
}

export function TwelveLeadPage({ rhythm }: TwelveLeadPageProps) {
  return (
    <div className="h-full w-full bg-black p-2 grid grid-cols-2 grid-rows-6 gap-1">
      {LEADS.flatMap(([left, right]) => [
        <LeadCell key={left} label={left} videoSrc={leadSrc(rhythm, left)} />,
        <LeadCell key={right} label={right} videoSrc={leadSrc(rhythm, right)} />,
      ])}
    </div>
  )
}
