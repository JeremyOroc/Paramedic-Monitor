'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export type MedicationRecorderProps = {
  /** Every med the instructor can record, already flattened out of its pages. */
  medications: ReadonlyArray<string>
  participants: ReadonlyArray<{ id: string; nickname: string }>
  /** The trainee the row is credited to. Null when there is nobody to credit. */
  participantId: string | null
  onParticipantChange: (participantId: string) => void
  onRecord: (medication: string) => void
  /** Why recording is impossible right now, or null when it is possible. */
  unavailableReason: string | null
  /** The last failure, surfaced next to the grid rather than swallowed. */
  error?: string
}

/** How long a pressed button stays lit. Long enough to see, short enough to repeat. */
const FLASH_MS = 1200

/**
 * The instructor's copy of the monitor's medication keys.
 *
 * A paramedic with a syringe in one hand and an airway in the other gives the
 * drug and never reaches the monitor, so the run's record used to lose it
 * entirely. Pressing here writes the same `medication` event the monitor
 * writes, credited to the trainee and marked as instructor-entered.
 *
 * Flat, not paged. The monitor pages because it has four soft keys; the
 * console has a column, and an instructor hunting for Fentanyl mid-drill
 * should not have to remember it is on page three.
 */
export function MedicationRecorder({
  medications,
  participants,
  participantId,
  onParticipantChange,
  onRecord,
  unavailableReason,
  error,
}: MedicationRecorderProps) {
  const [flashed, setFlashed] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const record = useCallback(
    (medication: string) => {
      onRecord(medication)
      setFlashed(medication)
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setFlashed(null), FLASH_MS)
    },
    [onRecord],
  )

  const disabled = unavailableReason !== null

  return (
    <section
      aria-label="Record medication"
      data-testid="medication-recorder"
      className="flex min-h-0 flex-col gap-1 border border-neutral-800 bg-neutral-950 p-2 xl:[@media(min-height:800px)]:gap-2 xl:[@media(min-height:800px)]:p-3"
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-1">
        <h2 className="text-xs uppercase tracking-wider text-neutral-400">Meds</h2>
        <span className="text-[9px] uppercase tracking-wider text-neutral-600">Given</span>
      </div>

      {/* One trainee is the usual room, so the picker only earns its space when
          there is genuinely a choice to make about who gets credited. */}
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
        <p
          data-testid="medication-recorder-unavailable"
          className="font-mono text-[10px] leading-4 text-neutral-600"
        >
          {unavailableReason}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-1 overflow-y-auto">
        {medications.map((medication) => (
          <button
            key={medication}
            type="button"
            disabled={disabled}
            onClick={() => record(medication)}
            className={cn(
              'flex min-h-9 items-center justify-center border px-1 py-1 text-center font-mono text-[11px] font-bold leading-tight',
              'transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none',
              'focus:outline-none focus:ring-2 focus:ring-ecg-green',
              'disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900/40 disabled:text-neutral-700',
              'xl:[@media(min-height:800px)]:min-h-11 xl:[@media(min-height:800px)]:text-xs',
              flashed === medication
                ? 'border-ecg-green bg-ecg-green text-black'
                : 'border-neutral-700 bg-neutral-900 text-neutral-300 enabled:hover:border-ecg-green enabled:hover:text-ecg-green',
            )}
          >
            {medication}
          </button>
        ))}
      </div>

      {/* Announced rather than only coloured: the flash is the whole
          confirmation a press gets, and it is not available to a screen reader. */}
      <p aria-live="polite" className="sr-only">
        {flashed ? `${flashed} recorded` : ''}
      </p>

      {error ? (
        <p
          data-testid="medication-recorder-error"
          className="font-mono text-[10px] leading-4 text-alarm-red"
        >
          {error}
        </p>
      ) : null}
    </section>
  )
}
