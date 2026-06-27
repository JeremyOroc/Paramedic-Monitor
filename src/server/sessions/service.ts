import { createServiceClient } from '@/lib/supabase/server'
import { generateSessionCode, isValidSessionCode } from '@/lib/session'
import { createSessionToken, hashSessionToken, verifySessionToken } from './tokens'

export type SessionRecord = {
  id: string
  code: string
  status: 'waiting' | 'active' | 'ended'
  active_attempt_version: number
  created_at: string
  expires_at: string | null
}

export type ParticipantRecord = {
  id: string
  session_id: string
  nickname: string
  joined_at: string
  last_seen_at: string | null
  token_hash?: string
}

export type StudentEventInput = {
  kind: string
  label: string
  payload?: unknown
}

export class SessionError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

function normalizeNickname(nickname: string): string {
  return nickname.trim().replace(/\s+/g, ' ').slice(0, 32)
}

async function getSessionByCode(code: string): Promise<SessionRecord> {
  const normalized = normalizeCode(code)
  if (!isValidSessionCode(normalized)) {
    throw new SessionError('Invalid session code', 400)
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('id, code, status, active_attempt_version, created_at, expires_at')
    .eq('code', normalized)
    .single()

  if (error || !data) throw new SessionError('Session not found', 404)
  return data as SessionRecord
}

async function ensureAttempt(
  sessionId: string,
  participantId: string,
  attemptVersion: number,
) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('participant_attempts')
    .upsert(
      {
        session_id: sessionId,
        participant_id: participantId,
        attempt_version: attemptVersion,
      },
      { onConflict: 'participant_id,attempt_version' },
    )

  if (error) throw new SessionError(error.message, 500)
}

export async function createSession(origin: string) {
  const supabase = createServiceClient()
  const hostToken = createSessionToken('host')

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateSessionCode()
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({ code, status: 'waiting', active_attempt_version: 1 })
      .select('id, code, status, active_attempt_version, created_at, expires_at')
      .single()

    if (error) {
      if (error.code === '23505') continue
      throw new SessionError(error.message, 500)
    }
    if (!session) throw new SessionError('Unable to create session', 500)

    const { error: hostError } = await supabase
      .from('session_hosts')
      .insert({
        session_id: session.id,
        token_hash: hashSessionToken(hostToken),
      })
    if (hostError) throw new SessionError(hostError.message, 500)

    const instructorUrl = `${origin}/session/${session.code}/instructor?host=${hostToken}`
    const monitorUrl = `${origin}/session/${session.code}/monitor`
    const waitingUrl = `${origin}/session/${session.code}/waiting`

    return {
      session: session as SessionRecord,
      hostToken,
      instructorUrl,
      monitorUrl,
      waitingUrl,
    }
  }

  throw new SessionError('Unable to generate a unique session code', 500)
}

export async function joinSession(
  code: string,
  nickname: string,
  participantToken?: string,
) {
  const session = await getSessionByCode(code)
  if (session.status === 'ended') throw new SessionError('Session has ended', 410)

  const normalizedNickname = normalizeNickname(nickname)
  if (normalizedNickname.length < 1) {
    throw new SessionError('Nickname is required', 400)
  }

  const supabase = createServiceClient()
  if (participantToken) {
    const { data: existing, error } = await supabase
      .from('participants')
      .select('id, session_id, nickname, joined_at, last_seen_at, token_hash')
      .eq('session_id', session.id)

    if (error) throw new SessionError(error.message, 500)
    const match = (existing as ParticipantRecord[] | null | undefined)?.find(
      (participant) =>
        participant.token_hash &&
        verifySessionToken(participantToken, participant.token_hash),
    )
    if (match) {
      const { data: updated, error: updateError } = await supabase
        .from('participants')
        .update({ nickname: normalizedNickname, last_seen_at: new Date().toISOString() })
        .eq('id', match.id)
        .select('id, session_id, nickname, joined_at, last_seen_at')
        .single()
      if (updateError || !updated) {
        throw new SessionError(updateError?.message ?? 'Unable to resume participant', 500)
      }
      await ensureAttempt(session.id, updated.id, session.active_attempt_version)
      return { session, participant: updated as ParticipantRecord, participantToken }
    }
  }

  const nextParticipantToken = createSessionToken('participant')
  const { data: participant, error } = await supabase
    .from('participants')
    .insert({
      session_id: session.id,
      nickname: normalizedNickname,
      token_hash: hashSessionToken(nextParticipantToken),
    })
    .select('id, session_id, nickname, joined_at, last_seen_at')
    .single()

  if (error || !participant) {
    throw new SessionError(error?.message ?? 'Unable to join session', 500)
  }

  await ensureAttempt(session.id, participant.id, session.active_attempt_version)
  return {
    session,
    participant: participant as ParticipantRecord,
    participantToken: nextParticipantToken,
  }
}

export async function verifyHost(code: string, hostToken: string): Promise<SessionRecord> {
  if (!hostToken) throw new SessionError('Host token required', 401)
  const session = await getSessionByCode(code)
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('session_hosts')
    .select('token_hash')
    .eq('session_id', session.id)
    .single()

  if (error || !data || !verifySessionToken(hostToken, data.token_hash as string)) {
    throw new SessionError('Invalid host token', 403)
  }

  return session
}

export async function verifyParticipant(
  code: string,
  participantToken: string,
): Promise<{ session: SessionRecord; participant: ParticipantRecord }> {
  if (!participantToken) throw new SessionError('Participant token required', 401)
  const session = await getSessionByCode(code)
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('participants')
    .select('id, session_id, nickname, joined_at, last_seen_at, token_hash')
    .eq('session_id', session.id)

  if (error) throw new SessionError(error.message, 500)
  const participant = (data as ParticipantRecord[] | null | undefined)?.find(
    (candidate) =>
      candidate.token_hash && verifySessionToken(participantToken, candidate.token_hash),
  )
  if (!participant) throw new SessionError('Invalid participant token', 403)
  await ensureAttempt(session.id, participant.id, session.active_attempt_version)
  return { session, participant }
}

export async function startSession(code: string, hostToken: string) {
  const session = await verifyHost(code, hostToken)
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('sessions')
    .update({ status: 'active' })
    .eq('id', session.id)
    .select('id, code, status, active_attempt_version, created_at, expires_at')
    .single()

  if (error || !data) throw new SessionError(error?.message ?? 'Unable to start session', 500)
  return data as SessionRecord
}

export async function getSessionStatus(code: string) {
  const session = await getSessionByCode(code)
  const supabase = createServiceClient()
  const { data: state, error } = await supabase
    .from('session_state')
    .select('state, version, updated_at')
    .eq('session_id', session.id)
    .maybeSingle()
  if (error) throw new SessionError(error.message, 500)
  return { session, state: state ?? null }
}

export async function updateSessionState(
  code: string,
  hostToken: string,
  state: unknown,
) {
  const session = await verifyHost(code, hostToken)
  const supabase = createServiceClient()
  const { data: current, error: currentError } = await supabase
    .from('session_state')
    .select('version')
    .eq('session_id', session.id)
    .maybeSingle()

  if (currentError) throw new SessionError(currentError.message, 500)
  const nextVersion =
    typeof current?.version === 'number' ? current.version + 1 : 1

  const { data, error } = await supabase
    .from('session_state')
    .upsert({
      session_id: session.id,
      state,
      version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .select('state, version, updated_at')
    .single()

  if (error || !data) {
    throw new SessionError(error?.message ?? 'Unable to update session state', 500)
  }
  return { session, state: data }
}

export async function recordStudentEvent(
  code: string,
  participantToken: string,
  input: StudentEventInput,
) {
  const { session, participant } = await verifyParticipant(code, participantToken)
  const label = input.label.trim()
  const kind = input.kind.trim()
  if (!kind || !label) throw new SessionError('Event kind and label are required', 400)

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('student_events')
    .insert({
      session_id: session.id,
      participant_id: participant.id,
      attempt_version: session.active_attempt_version,
      kind,
      label,
      payload: input.payload ?? {},
    })
    .select('id, session_id, participant_id, attempt_version, kind, label, payload, occurred_at')
    .single()

  if (error || !data) throw new SessionError(error?.message ?? 'Unable to record event', 500)
  return { session, participant, event: data }
}

export async function getReview(code: string, hostToken: string) {
  const session = await verifyHost(code, hostToken)
  const supabase = createServiceClient()
  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('id, session_id, nickname, joined_at, last_seen_at')
    .eq('session_id', session.id)
    .order('joined_at', { ascending: true })
  if (participantsError) throw new SessionError(participantsError.message, 500)

  const { data: events, error: eventsError } = await supabase
    .from('student_events')
    .select('id, session_id, participant_id, attempt_version, kind, label, payload, occurred_at')
    .eq('session_id', session.id)
    .order('occurred_at', { ascending: true })
  if (eventsError) throw new SessionError(eventsError.message, 500)

  return {
    session,
    participants: participants ?? [],
    events: events ?? [],
  }
}
