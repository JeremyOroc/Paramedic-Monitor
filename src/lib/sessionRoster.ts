import type { StudentEvent } from '@/types/session'

// Students heartbeat every poll (~1.5-2s); the window tolerates a couple of
// missed polls before a student reads as offline.
export const CONNECTED_WINDOW_MS = 8000

export type RosterProgress = {
  acknowledged: boolean
  arrived: boolean
  transported: boolean
  shocks: number
  medications: number
  analyzes: number
}

export function isConnected(
  lastSeenAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!lastSeenAt) return false
  const seen = Date.parse(lastSeenAt)
  return Number.isFinite(seen) && now - seen <= CONNECTED_WINDOW_MS
}

export function participantProgress(
  events: readonly StudentEvent[],
  participantId: string,
  attemptVersion: number,
): RosterProgress {
  const own = events.filter(
    (event) =>
      event.participant_id === participantId &&
      event.attempt_version === attemptVersion,
  )
  const count = (kind: StudentEvent['kind']) =>
    own.filter((event) => event.kind === kind).length

  return {
    acknowledged: count('acknowledge') > 0,
    arrived: count('arrival') > 0,
    transported: count('transport') > 0,
    shocks: count('shock'),
    medications: count('medication'),
    analyzes: count('analyze'),
  }
}
