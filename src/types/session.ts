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

export type StudentEventKind =
  | 'acknowledge'
  | 'arrival'
  | 'transport'
  | 'medication'
  | 'analyze'
  | 'charge'
  | 'shock'

export type StudentEvent = {
  id: string
  session_id: string
  participant_id: string
  attempt_version: number
  kind: StudentEventKind
  label: string
  payload: unknown
  occurred_at: string
}
