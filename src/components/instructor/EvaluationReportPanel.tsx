'use client'

import { useCallback, useMemo, useState } from 'react'

import { buildEvaluationTimeline, formatOffset } from '@/lib/evaluationTimeline'
import { cn } from '@/lib/utils'
import type {
  ParticipantAttempt,
  SessionParticipant,
  SessionStateHistoryEntry,
  StudentEvent,
} from '@/types/session'
import type { TimelineContext, TimelineRow } from '@/lib/evaluationTimeline'

type EvaluationReportPanelProps = {
  events: readonly StudentEvent[]
  stateHistory: readonly SessionStateHistoryEntry[]
  attempts: readonly ParticipantAttempt[]
  participants: readonly Pick<SessionParticipant, 'id' | 'nickname'>[]
  attemptVersion: number
  onAttemptVersionChange?: (version: number) => void
  truncated?: boolean
}

function contextText(context: TimelineContext): string {
  if (context.kind === 'dispatch') return '[dispatch]'
  if (context.kind === 'missing') return '[no state recorded]'
  return [context.rhythm, ...context.vitals.map((vital) => `${vital.label} ${vital.value}`)].join(' · ')
}

/** The stream as plain text, for pasting into a debrief. */
function toPlainText(rows: readonly TimelineRow[], showNames: boolean): string {
  return rows
    .map((row) => {
      if (row.kind === 'instructor') {
        const what = row.opening
          ? 'scenario sent'
          : row.changes.length > 0
            ? row.changes.join(' · ')
            : 'sent (no clinical change)'
        return `${row.offset}\tINSTRUCTOR\t${what}\t${contextText(row.context)}`
      }
      const who = showNames ? `${row.participantName}\t` : ''
      return `${row.offset}\t${who}${row.eventKind}\t${row.detail}\t${contextText(row.context)}`
    })
    .join('\n')
}

export function EvaluationReportPanel({
  events,
  stateHistory,
  attempts,
  participants,
  attemptVersion,
  onAttemptVersionChange,
  truncated = false,
}: EvaluationReportPanelProps) {
  const [copied, setCopied] = useState(false)

  const timeline = useMemo(
    () =>
      buildEvaluationTimeline({
        events,
        stateHistory,
        attempts,
        participants,
        attemptVersion,
      }),
    [attempts, attemptVersion, events, participants, stateHistory],
  )

  // One trainee per session is the operating assumption, so the name column
  // stays out of the way -- but if a second person is in the room the stream
  // has to say who did what rather than silently merging two runs.
  const showNames = timeline.participantNames.length > 1

  const attemptVersions = useMemo(() => {
    const versions = new Set<number>([attemptVersion])
    for (const attempt of attempts) versions.add(attempt.attempt_version)
    for (const event of events) versions.add(event.attempt_version)
    return [...versions].sort((a, b) => a - b)
  }, [attemptVersion, attempts, events])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(timeline.rows, showNames))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // A blocked clipboard is not worth an error state -- the stream is still
      // on screen to read from.
      setCopied(false)
    }
  }, [showNames, timeline.rows])

  const actionCount = timeline.rows.filter((row) => row.kind === 'action').length
  // Every action resolving to no state is what an unapplied migration 007 looks
  // like from the outside, so the panel says so rather than showing a blank
  // column the evaluator has to interpret.
  const contextUnavailable = actionCount > 0 && stateHistory.length === 0

  return (
    <section
      aria-labelledby="evaluation-report-heading"
      className="border border-neutral-800 bg-neutral-950 p-4"
      data-testid="evaluation-report-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="evaluation-report-heading"
            className="font-mono text-sm font-black uppercase tracking-wider text-neutral-400"
          >
            Report
          </h2>
          {attemptVersions.length > 1 ? (
            <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neutral-500">
              Attempt
              <select
                value={attemptVersion}
                onChange={(nativeEvent) =>
                  onAttemptVersionChange?.(Number(nativeEvent.target.value))
                }
                className="border border-neutral-700 bg-black px-2 py-1 font-mono text-xs text-neutral-200"
              >
                {attemptVersions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">
              Attempt {attemptVersion}
            </span>
          )}
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">
            {timeline.participantNames.join(', ') || 'No trainee'}
          </span>
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">
            {formatOffset(timeline.durationMs).replace('t+', '')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          disabled={timeline.rows.length === 0}
          className="border border-neutral-700 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-neutral-400 enabled:hover:border-cyan-bp enabled:hover:text-cyan-bp disabled:opacity-40"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {truncated ? (
        <p
          data-testid="evaluation-report-truncated"
          className="mt-3 border border-pending-amber/50 bg-pending-amber/10 px-3 py-2 font-mono text-xs text-pending-amber"
        >
          This attempt exceeded the review limit. The stream below is partial.
        </p>
      ) : null}

      {contextUnavailable ? (
        <p
          data-testid="evaluation-report-no-context"
          className="mt-3 border border-pending-amber/50 bg-pending-amber/10 px-3 py-2 font-mono text-xs text-pending-amber"
        >
          No instructor state recorded for this attempt — patient context is unavailable.
        </p>
      ) : null}

      {timeline.rows.length === 0 ? (
        <p className="mt-4 font-mono text-xs text-neutral-600">
          Nothing recorded for this attempt yet.
        </p>
      ) : (
        <ol className="mt-4 font-mono text-xs" data-testid="evaluation-report-rows">
          {timeline.rows.map((row) => (
            <li
              key={row.id}
              data-testid={`report-row-${row.kind}`}
              data-alarm={row.inAlarm ? 'true' : undefined}
              className={cn(
                'grid items-baseline gap-x-3 border-l-2 px-2 py-1',
                'grid-cols-[4.5rem_minmax(0,1fr)]',
                showNames
                  ? 'md:grid-cols-[4.5rem_7rem_9rem_minmax(0,1fr)_auto]'
                  : 'md:grid-cols-[4.5rem_9rem_minmax(0,1fr)_auto]',
                row.inAlarm
                  ? 'border-l-alarm-red bg-alarm-red/10'
                  : 'border-l-transparent',
                row.kind === 'instructor' && 'text-neutral-500',
              )}
            >
              <span className="text-neutral-500">{row.offset}</span>

              {row.kind === 'instructor' ? (
                <span
                  className={cn(
                    'truncate uppercase tracking-wider text-cyan-bp/70',
                    showNames ? 'md:col-span-3' : 'md:col-span-2',
                  )}
                >
                  {'▸▸ Instructor '}
                  <span className="normal-case tracking-normal text-neutral-400">
                    {row.opening
                      ? 'scenario sent'
                      : row.changes.length > 0
                        ? row.changes.join(' · ')
                        : 'sent (no clinical change)'}
                  </span>
                </span>
              ) : (
                <>
                  {showNames ? (
                    <span className="hidden truncate text-neutral-400 md:block">
                      {row.participantName}
                    </span>
                  ) : null}
                  <span className="truncate text-neutral-200">{row.eventKind}</span>
                  <span className="hidden truncate text-neutral-500 md:block">{row.detail}</span>
                </>
              )}

              <span
                className={cn(
                  'hidden justify-self-end whitespace-nowrap md:block',
                  row.context.kind === 'state' ? 'text-neutral-400' : 'text-neutral-600',
                )}
              >
                {row.context.kind === 'state' ? (
                  <>
                    <span>{row.context.rhythm}</span>
                    {row.context.vitals.map((vital) => (
                      <span
                        key={vital.label}
                        className={cn(vital.alarm && 'font-bold text-alarm-red')}
                      >
                        {` · ${vital.label} ${vital.value}`}
                      </span>
                    ))}
                  </>
                ) : (
                  contextText(row.context)
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
