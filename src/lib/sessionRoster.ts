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
  const progress: RosterProgress = {
    acknowledged: false,
    arrived: false,
    transported: false,
    shocks: 0,
    medications: 0,
    analyzes: 0,
  }

  for (const event of events) {
    if (
      event.participant_id !== participantId ||
      event.attempt_version !== attemptVersion
    ) {
      continue
    }
    if (event.kind === 'acknowledge') progress.acknowledged = true
    else if (event.kind === 'arrival') progress.arrived = true
    else if (event.kind === 'transport') progress.transported = true
    else if (event.kind === 'shock') progress.shocks += 1
    else if (event.kind === 'medication') progress.medications += 1
    else if (event.kind === 'analyze') progress.analyzes += 1
  }

  return progress
}
