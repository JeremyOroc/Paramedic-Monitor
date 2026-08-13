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
  etco2Calibrated: boolean
}

export function isConnected(
  lastSeenAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!lastSeenAt) return false
  const seen = Date.parse(lastSeenAt)
  return Number.isFinite(seen) && now - seen <= CONNECTED_WINDOW_MS
}

/**
 * Whether anyone in the room has calibrated EtCO2 on this attempt.
 *
 * Calibration happens on the trainee's own monitor and is not part of the
 * shared session state, so the instructor panel can only learn about it from
 * this event stream. Scoped to the attempt so it clears on New Attempt.
 */
export function anyoneCalibratedEtco2(
  events: readonly StudentEvent[],
  attemptVersion: number,
): boolean {
  return events.some(
    (event) =>
      event.kind === 'etco2_calibration' && event.attempt_version === attemptVersion,
  )
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
    // Calibration is a student-side action on their own monitor, so the
    // instructor only learns about it through this event stream.
    etco2Calibrated: count('etco2_calibration') > 0,
  }
}
