'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { TreatmentCategory } from '@/lib/instructorTreatments'
import { cn } from '@/lib/utils'

export type TreatmentRecorderProps = {
  medications: ReadonlyArray<string>
  traumaTreatments: ReadonlyArray<string>
  participants: ReadonlyArray<{ id: string; nickname: string }>
  participantId: string | null
  onParticipantChange: (participantId: string) => void
  onRecord: (treatment: string, category: TreatmentCategory) => void
  counts: Readonly<Record<string, number>>
  unavailableReason: string | null
  error?: string
}

const FLASH_MS = 1200

export function TreatmentRecorder({
  medications,
  traumaTreatments,
  participants,
  participantId,
  onParticipantChange,
  onRecord,
  counts,
  unavailableReason,
  error,
}: TreatmentRecorderProps) {
  const [flashed, setFlashed] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const record = useCallback(
    (treatment: string, category: TreatmentCategory) => {
      onRecord(treatment, category)
      setFlashed(treatment)
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setFlashed(null), FLASH_MS)
    },
    [onRecord],
  )

  const disabled = unavailableReason !== null
  const renderButtons = (items: ReadonlyArray<string>, category: TreatmentCategory) =>
    items.map((treatment) => {
      const given = counts[treatment] ?? 0
      return (
        <button
          key={`${category}:${treatment}`}
          type="button"
          disabled={disabled}
          onClick={() => record(treatment, category)}
          data-count={given > 0 ? String(given) : undefined}
          aria-label={
            given > 0
              ? `${treatment} ${category === 'medication' ? 'given' : 'recorded'} ${given} ${given === 1 ? 'time' : 'times'}`
              : treatment
          }
          className={cn(
            'flex min-h-9 items-center justify-center gap-1.5 border px-1 py-1 text-center font-mono text-[11px] font-bold leading-tight',
            'transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none',
            'focus:outline-none focus:ring-2 focus:ring-ecg-green',
            'disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900/40 disabled:text-neutral-700',
            'xl:[@media(min-height:800px)]:min-h-11 xl:[@media(min-height:800px)]:text-xs',
            flashed === treatment
              ? 'border-ecg-green bg-ecg-green text-black'
              : given > 0
                ? 'border-ecg-green/60 bg-neutral-900 text-ecg-green enabled:hover:border-ecg-green'
                : 'border-neutral-700 bg-neutral-900 text-neutral-300 enabled:hover:border-ecg-green enabled:hover:text-ecg-green',
          )}
        >
          <span className="min-w-0 truncate">{treatment}</span>
          {given > 0 ? (
            <span
              aria-hidden="true"
              className={cn(
                'grid h-4 min-w-4 shrink-0 place-items-center px-1 text-[10px] font-black tabular-nums',
                flashed === treatment
                  ? 'bg-black/20 text-black'
                  : 'bg-ecg-green/20 text-ecg-green',
              )}
            >
              {given}
            </span>
          ) : null}
        </button>
      )
    })

  return (
    <section
      aria-label="Record treatment"
      data-testid="treatment-recorder"
      className="flex min-h-0 flex-col gap-1 border border-neutral-800 bg-neutral-950 p-2 xl:[@media(min-height:800px)]:gap-2 xl:[@media(min-height:800px)]:p-3"
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-1">
        <h2 className="text-xs uppercase tracking-wider text-neutral-400">Treatments</h2>
        <span className="text-[9px] uppercase tracking-wider text-neutral-600">Recorded</span>
      </div>

      {participants.length > 1 ? (
        <label className="grid gap-0.5 text-[9px] uppercase tracking-wider text-neutral-500">
          Credit to
          <select
            value={participantId ?? ''}
            onChange={(event) => onParticipantChange(event.target.value)}
            className="border border-neutral-700 bg-black px-1 py-1 font-mono text-[11px] normal-case tracking-normal text-neutral-200 focus:border-cyan-bp focus:outline-none"
          >
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.nickname}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {unavailableReason ? (
        <p data-testid="treatment-recorder-unavailable" className="font-mono text-[10px] leading-4 text-neutral-600">
          {unavailableReason}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        <h3 className="sticky top-0 z-10 bg-neutral-950 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-neutral-500">
          Medications
        </h3>
        <div className="grid grid-cols-2 gap-1">{renderButtons(medications, 'medication')}</div>
        <h3 className="sticky top-0 z-10 mt-2 border-t border-neutral-800 bg-neutral-950 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-neutral-500">
          Trauma
        </h3>
        <div className="grid grid-cols-2 gap-1">{renderButtons(traumaTreatments, 'trauma')}</div>
      </div>

      <p aria-live="polite" className="sr-only">
        {flashed ? `${flashed} recorded` : ''}
      </p>

      {error ? (
        <p data-testid="treatment-recorder-error" className="font-mono text-[10px] leading-4 text-alarm-red">
          {error}
        </p>
      ) : null}
    </section>
  )
}
