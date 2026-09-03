export type Session = {
  id: string
  code: string
  status?: SessionStatus
  active_attempt_version?: number
  expires_at?: string | null
  created_at: string
}

export type SessionStatus = 'waiting' | 'active' | 'ended'

export type SessionParticipant = {
  id: string
  session_id: string
  nickname: string
  joined_at: string
  last_seen_at: string | null
}

/**
 * Every trainee action the evaluator can review. Kept in lockstep with the
 * `student_events_kind_check` constraint in migration 007 -- the database
 * rejects anything not listed here, because `kind` arrives from the request
 * body and used to be unvalidated free text.
 *
 * CPR is deliberately absent: it is instructor-driven, so it is captured by
 * session_state_history rather than as a trainee action.
 */
export const STUDENT_EVENT_KINDS = [
  'acknowledge',
  'arrival',
  'transport',
  'medication',
  'analyze',
  'charge',
  'shock',
  'etco2_calibration',
  'nibp_start',
  'nibp_result',
  'power_on',
  'power_off',
  'twelve_lead',
  'twelve_lead_capture',
  'print',
  'etco2_toggle',
  'energy_change',
  'treatment_menu',
  'patient_info',
] as const

export type StudentEventKind = (typeof STUDENT_EVENT_KINDS)[number]

export function isStudentEventKind(value: unknown): value is StudentEventKind {
  return (
    typeof value === 'string' &&
    (STUDENT_EVENT_KINDS as readonly string[]).includes(value)
  )
}

export type StudentEvent = {
  id: string
  session_id: string
  participant_id: string
  attempt_version: number
  kind: StudentEventKind
  label: string
  payload: unknown
  occurred_at: string
  /**
   * The session_state_history version in force when this action was taken.
   * Join on it to recover the patient state behind the action. Null for rows
   * predating migration 007, and for actions taken before the first Send.
   */
  state_version: number | null
}

/**
 * One instructor-confirmed state, as it stood when it was sent. Append-only:
 * `session_state` is overwritten on the next Send, so this is the only record
 * of what the patient was when a trainee acted against it.
 */
export type SessionStateHistoryEntry = {
  version: number
  attempt_version: number
  state: unknown
  applied_at: string
}

/** One trainee's window on one drill run. `completed_at` closes on New Attempt and End. */
export type ParticipantAttempt = {
  participant_id: string
  attempt_version: number
  started_at: string
  completed_at: string | null
}

/** The shape `GET /api/session/[code]/review` returns. */
export type SessionReview = {
  session: Session
  attemptVersion: number | 'all'
  participants: SessionParticipant[]
  events: StudentEvent[]
  truncated: boolean
  stateHistory: SessionStateHistoryEntry[]
  attempts: ParticipantAttempt[]
}
