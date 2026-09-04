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
import type {
  StateFact,
  TimelineContext,
  TimelineInstructorRow,
  TimelineRow,
} from '@/lib/evaluationTimeline'

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

/** The opening row names the scenario when the instructor gave it one. */
function openingLabel(scenarioTitle: string): string {
  return scenarioTitle ? `scenario sent — "${scenarioTitle}"` : 'scenario sent'
}

/** A row opens when it has something to show: the opening scenario, or at least one changed field. */
function hasDetail(row: TimelineInstructorRow): boolean {
  return row.opening ? row.snapshot.length > 0 : row.fieldChanges.length > 0
}

const FACT_GROUPS: readonly StateFact['group'][] = ['Dispatch', 'Patient', 'Device']

/**
 * The opening change shows the whole scenario as sent; every later change
 * shows only its fields, before → after. Not the full state again: real room
 * data made 79% of the dispatch card a repeat of the row above when every
 * expansion rendered it.
 */
function InstructorChangeDetail({ row }: { row: TimelineInstructorRow }) {
  return (
    <div
      id={`${row.id}-detail`}
      data-testid="report-row-detail"
      className="ml-[4.5rem] mt-1 grid gap-y-1 border-l border-neutral-800 pl-3 text-neutral-400"
    >
      {row.opening
        ? FACT_GROUPS.map((group) => {
            const facts = row.snapshot.filter((fact) => fact.group === group)
            if (facts.length === 0) return null
            return (
              <div key={group} className="grid gap-y-0.5">
                <span className="uppercase tracking-wider text-neutral-600">{group}</span>
                {facts.map((fact) => (
                  <span key={`${group}-${fact.label}`} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3">
                    <span className="text-neutral-500">{fact.label}</span>
                    <span className="whitespace-pre-wrap break-words text-neutral-300">{fact.value}</span>
                  </span>
                ))}
              </div>
            )
          })
        : row.fieldChanges.map((change) => (
            <span
              key={`${change.group}-${change.label}`}
              className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3"
            >
              <span className="text-neutral-500">{change.label}</span>
              <span className="break-words">
                <span className="text-neutral-500">{change.before}</span>
                <span className="text-neutral-600">{' → '}</span>
                <span className="text-neutral-200">{change.after}</span>
              </span>
            </span>
          ))}
    </div>
  )
}

/** The stream as plain text, for pasting into a debrief. */
function toPlainText(rows: readonly TimelineRow[], showNames: boolean): string {
  return rows
    .map((row) => {
      if (row.kind === 'instructor') {
        const what = row.opening
          ? openingLabel(row.scenarioTitle)
          : row.changes.length > 0
            ? row.changes.join(' · ')
            : 'sent (no change)'
        return `${row.offset}\tINSTRUCTOR\t${what}\t${contextText(row.context)}`
      }
      const who = showNames ? `${row.participantName}\t` : ''
      const behind = row.behindBy > 0 ? `\t← ${row.behindBy} behind` : ''
      return `${row.offset}\t${who}${row.eventKind}\t${row.detail}\t${contextText(row.context)}${behind}`
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
  // Keyed by row id so a row opened mid-attempt stays open across the poll,
  // which replaces every row object every 2.5s.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  const toggle = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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
              data-behind={row.kind === 'action' && row.behindBy > 0 ? String(row.behindBy) : undefined}
              className={cn(
                'border-l-2 px-2 py-1',
                row.inAlarm
                  ? 'border-l-alarm-red bg-alarm-red/10'
                  : 'border-l-transparent',
                row.kind === 'instructor' && 'text-neutral-500',
              )}
            >
            <div
              className={cn(
                'grid items-baseline gap-x-3',
                'grid-cols-[4.5rem_minmax(0,1fr)]',
                showNames
                  ? 'md:grid-cols-[4.5rem_7rem_9rem_minmax(0,1fr)_auto]'
                  : 'md:grid-cols-[4.5rem_9rem_minmax(0,1fr)_auto]',
              )}
            >
              <span className="text-neutral-500">{row.offset}</span>

              {row.kind === 'instructor' ? (
                <span
                  className={cn(
                    'flex min-w-0 items-baseline gap-2 uppercase tracking-wider text-cyan-bp/70',
                    showNames ? 'md:col-span-3' : 'md:col-span-2',
                  )}
                >
                  {hasDetail(row) ? (
                    <button
                      type="button"
                      onClick={() => toggle(row.id)}
                      aria-expanded={expanded.has(row.id)}
                      aria-controls={`${row.id}-detail`}
                      aria-label={expanded.has(row.id) ? 'Collapse instructor change' : 'Expand instructor change'}
                      className="shrink-0 text-cyan-bp/70 hover:text-cyan-bp"
                    >
                      {expanded.has(row.id) ? '▾' : '▸'}
                    </button>
                  ) : (
                    <span className="shrink-0">▸▸</span>
                  )}
                  <span className="truncate">
                    {'Instructor '}
                    <span className="normal-case tracking-normal text-neutral-400">
                      {row.opening
                        ? openingLabel(row.scenarioTitle)
                        : row.changes.length > 0
                          ? row.changes.join(' · ')
                          : 'sent (no change)'}
                    </span>
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
                {row.kind === 'action' && row.behindBy > 0 ? (
                  // The monitor had not received the latest Send yet, so the
                  // action was taken against an older patient than the row
                  // above suggests. Says "behind," not "ignored."
                  <span className="ml-2 text-pending-amber">{`← ${row.behindBy} behind`}</span>
                ) : null}
              </span>
            </div>
            {row.kind === 'instructor' && expanded.has(row.id) ? (
              <InstructorChangeDetail row={row} />
            ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
