'use client'

import { useCallback, useRef, useState } from 'react'
import type { Rhythm } from '@/types/vitals'
import type { LeadName } from '@/lib/ecg/rhythms'
import { LeadCell } from './LeadCell'

type TwelveLeadPageProps = {
  rhythm: Rhythm
  hr: number
  occluded?: boolean
  onReady?: () => void
}

const LEADS: ReadonlyArray<readonly [LeadName, LeadName]> = [
  ['I',   'V1'],
  ['II',  'V2'],
  ['III', 'V3'],
  ['aVR', 'V4'],
  ['aVL', 'V5'],
  ['aVF', 'V6'],
] as const

const LEAD_NAMES = LEADS.flatMap(([left, right]) => [left, right])

export function TwelveLeadPage({
  rhythm,
  hr,
  occluded = false,
  onReady,
}: TwelveLeadPageProps) {
  const [readinessGeneration, setReadinessGeneration] = useState({
    occluded,
    value: 0,
  })
  if (readinessGeneration.occluded !== occluded) {
    setReadinessGeneration({
      occluded,
      value: readinessGeneration.value + 1,
    })
  }
  const readinessKey = `${readinessGeneration.value}:${LEAD_NAMES.join('|')}`
  const readinessRef = useRef({
    key: '',
    leads: new Set<LeadName>(),
    reported: false,
  })

  const reportLeadReady = useCallback(
    (lead: LeadName) => {
      if (occluded) return
      if (readinessRef.current.key !== readinessKey) {
        readinessRef.current = {
          key: readinessKey,
          leads: new Set<LeadName>(),
          reported: false,
        }
      }
      readinessRef.current.leads.add(lead)
      if (
        !readinessRef.current.reported &&
        LEAD_NAMES.every((expected) => readinessRef.current.leads.has(expected))
      ) {
        readinessRef.current.reported = true
        onReady?.()
      }
    },
    [occluded, onReady, readinessKey],
  )

  return (
    <div className="h-full w-full bg-black p-2 grid grid-cols-2 grid-rows-6 gap-1">
      {LEADS.flatMap(([left, right]) => [
        <LeadCell
          key={left}
          label={left}
          rhythm={rhythm}
          hr={hr}
          occluded={occluded}
          onReady={() => reportLeadReady(left)}
        />,
        <LeadCell
          key={right}
          label={right}
          rhythm={rhythm}
          hr={hr}
          occluded={occluded}
          onReady={() => reportLeadReady(right)}
        />,
      ])}
    </div>
  )
}
