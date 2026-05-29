'use client'

import { useEffect, useRef } from 'react'
import { drawLeadRow } from '@/lib/ecg/staticTrace'
import { getLeadWaveform, type LeadName } from '@/lib/ecg/rhythms'
import { cn } from '@/lib/utils'
import type { Rhythm } from '@/types/vitals'

type TwelveLeadPrintoutProps = {
  rhythm: Rhythm
  hr: number
}

// Clinical 3x4 layout, one row per array, read left-to-right.
const ROWS: readonly (readonly LeadName[])[] = [
  ['I', 'aVR', 'V1', 'V4'],
  ['II', 'aVL', 'V2', 'V5'],
  ['III', 'aVF', 'V3', 'V6'],
] as const

const RHYTHM_STRIP_LEAD: LeadName = 'II'
const LABEL_SHADOW = '0 0 2px rgba(244,220,198,0.9)'

export function TwelveLeadPrintout({ rhythm }: TwelveLeadPrintoutProps) {
  return (
    <div
      data-testid="twelve-lead-printout"
      aria-label="12-lead printout"
      className="grid h-full w-full grid-rows-4 bg-print-paper"
    >
      {ROWS.map((leads, i) => (
        <PrintoutRow key={i} leads={leads} rhythm={rhythm} beatsPerLead={2} />
      ))}
      <PrintoutRow
        leads={[RHYTHM_STRIP_LEAD]}
        rhythm={rhythm}
        beatsPerLead={8}
      />
    </div>
  )
}

type PrintoutRowProps = {
  leads: readonly LeadName[]
  rhythm: Rhythm
  beatsPerLead: number
}

function PrintoutRow({ leads, rhythm, beatsPerLead }: PrintoutRowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () =>
      drawLeadRow({
        canvas,
        leads: leads.map((lead) => getLeadWaveform(rhythm, lead).data),
        beatsPerLead,
      })
    draw()
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null
    ro?.observe(canvas)
    return () => ro?.disconnect()
  }, [leads, rhythm, beatsPerLead])

  return (
    <div className="relative min-h-0 overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full" />
      {/* Lead labels overlaid at the start of each lead's segment. */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 grid',
          leads.length === 1 ? 'grid-cols-1' : 'grid-cols-4',
        )}
      >
        {leads.map((lead) => (
          <span
            key={lead}
            className="m-1 self-start font-mono text-xs font-bold text-print-ink"
            style={{ textShadow: LABEL_SHADOW }}
          >
            {lead}
          </span>
        ))}
      </div>
    </div>
  )
}
