import { createServiceClient } from '@/lib/supabase/server'
import { generateSessionCode, isValidSessionCode } from '@/lib/session'
import { isStudentEventKind } from '@/types/session'
import { createSessionToken, hashSessionToken, verifySessionToken } from './tokens'

/**
 * Ceiling on the events one review response will carry. PostgREST caps at 1000
 * by default and silently truncates, which used to drop the NEWEST rows -- the
 * instructor's live roster would stop updating with no error anywhere. Reviews
 * are now scoped to a single attempt and ask for one row more than the cap, so
 * hitting it is reported instead of hidden.
 */
export const REVIEW_EVENT_LIMIT = 2000

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

/**
 * The trainee's own drill window. `completed_at` closes on New Attempt and on
 * End Session so an evaluator can compute how long the run actually took.
 */
async function closeAttempts(sessionId: string, attemptVersion: number) {
  const supabase = createServiceClient()
  // Best-effort: failing to stamp a completion time must not block ending a
  // room or starting the next attempt.
  await supabase
    .from('participant_attempts')
    .update({ completed_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('attempt_version', attemptVersion)
    .is('completed_at', null)
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

/**
 * Sessions past `expires_at` read as `ended` everywhere, so stale room codes
 * get the normal ended-room UX (waiting room notice, join rejection) instead
 * of behaving like live rooms forever. Expired rows are kept; only their
 * effective status changes.
 */
export function applySessionExpiry(
  session: SessionRecord,
  now: number = Date.now(),
): SessionRecord {
  if (session.status === 'ended' || !session.expires_at) return session
  const expiresAt = Date.parse(session.expires_at)
  if (!Number.isFinite(expiresAt) || expiresAt > now) return session
  return { ...session, status: 'ended' }
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
  return applySessionExpiry(data as SessionRecord)
}

async function findParticipantByToken(
  sessionId: string,
  participantToken: string,
): Promise<ParticipantRecord | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('participants')
    .select('id, session_id, nickname, joined_at, last_seen_at')
    .eq('session_id', sessionId)
    .eq('token_hash', hashSessionToken(participantToken))
    .maybeSingle()

  if (error) throw new SessionError(error.message, 500)
  return (data as ParticipantRecord | null) ?? null
}

/**
 * Case-insensitive, matching the `participants_session_nickname_idx` unique
 * index from migration 007.
 */
async function findParticipantByNickname(
  sessionId: string,
  nickname: string,
): Promise<ParticipantRecord | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('participants')
    .select('id, session_id, nickname, joined_at, last_seen_at')
    .eq('session_id', sessionId)
    .ilike('nickname', nickname)
    .maybeSingle()

  if (error) throw new SessionError(error.message, 500)
  return (data as ParticipantRecord | null) ?? null
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
    const match = await findParticipantByToken(session.id, participantToken)
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

  // Identity is a localStorage token, so a cleared store or a second device
  // used to create a SECOND participants row under the same nickname -- which
  // split that trainee's events across two ids and quietly corrupted their
  // evaluation record. A nickname already in this room is treated as the same
  // person: re-issue the token onto the existing row instead of inserting.
  //
  // Trade-off (PLAN.md 12e): room code + nickname is now enough to assume an
  // identity. Accepted for a supervised classroom, where a correct roster
  // matters more than impersonation resistance.
  const existingByNickname = await findParticipantByNickname(
    session.id,
    normalizedNickname,
  )
  if (existingByNickname) {
    const { data: reclaimed, error: reclaimError } = await supabase
      .from('participants')
      .update({
        nickname: normalizedNickname,
        token_hash: hashSessionToken(nextParticipantToken),
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', existingByNickname.id)
      .select('id, session_id, nickname, joined_at, last_seen_at')
      .single()
    if (reclaimError || !reclaimed) {
      throw new SessionError(reclaimError?.message ?? 'Unable to rejoin session', 500)
    }
    await ensureAttempt(session.id, reclaimed.id, session.active_attempt_version)
    return {
      session,
      participant: reclaimed as ParticipantRecord,
      participantToken: nextParticipantToken,
    }
  }

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
  const participant = await findParticipantByToken(session.id, participantToken)
  if (!participant) throw new SessionError('Invalid participant token', 403)
  await ensureAttempt(session.id, participant.id, session.active_attempt_version)
  return { session, participant }
}

export async function startSession(code: string, hostToken: string) {
  const session = await verifyHost(code, hostToken)
  if (session.status === 'ended') {
    throw new SessionError('Session has ended', 410)
  }
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

export async function startNewAttempt(code: string, hostToken: string) {
  const session = await verifyHost(code, hostToken)
  if (session.status === 'ended') {
    throw new SessionError('Session has ended', 410)
  }
  const supabase = createServiceClient()
  // Close the outgoing attempt before bumping, so its duration is recoverable.
  await closeAttempts(session.id, session.active_attempt_version)
  // Back to 'waiting' as well as bumping the attempt: a new attempt is a fresh
  // drill, so trainees return to the waiting room and the instructor arms the
  // next run with Start / Dispatch deliberately. Leaving the room 'active' kept
  // that button disabled, so the next Send armed the gate on its own and the
  // scenario began the moment content was pushed.
  const { data, error } = await supabase
    .from('sessions')
    .update({
      active_attempt_version: session.active_attempt_version + 1,
      status: 'waiting',
    })
    .eq('id', session.id)
    .select('id, code, status, active_attempt_version, created_at, expires_at')
    .single()

  if (error || !data) {
    throw new SessionError(error?.message ?? 'Unable to start a new attempt', 500)
  }
  return data as SessionRecord
}

export async function endSession(code: string, hostToken: string) {
  const session = await verifyHost(code, hostToken)
  const supabase = createServiceClient()
  await closeAttempts(session.id, session.active_attempt_version)
  const { data, error } = await supabase
    .from('sessions')
    .update({ status: 'ended' })
    .eq('id', session.id)
    .select('id, code, status, active_attempt_version, created_at, expires_at')
    .single()

  if (error || !data) throw new SessionError(error?.message ?? 'Unable to end session', 500)
  return data as SessionRecord
}

export async function getSessionStatus(code: string, participantToken?: string) {
  const session = await getSessionByCode(code)
  const supabase = createServiceClient()

  // Student polls double as a presence heartbeat so the instructor roster can
  // show who is connected. Best-effort: a failed touch never fails the poll.
  if (participantToken) {
    await supabase
      .from('participants')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('token_hash', hashSessionToken(participantToken))
  }

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

  // The evaluator's second axis: session_state is overwritten in place, so
  // without this row there is no record of what the patient was when a trainee
  // acted. Written after the upsert and never read by the 1.5s student poll --
  // history sits beside the hot path, not on it.
  //
  // Best-effort by design: a failed history write must not cost the room a
  // Send. It costs the debrief one frame, which is the cheaper loss.
  const { error: historyError } = await supabase
    .from('session_state_history')
    .insert({
      session_id: session.id,
      attempt_version: session.active_attempt_version,
      version: nextVersion,
      state,
    })
  if (historyError) {
    console.error('[session] state history write failed:', historyError.message)
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

  // `kind` arrives from the request body. It used to go straight into a plain
  // text column, so anyone with devtools could write arbitrary kinds into the
  // evaluation record. Migration 007 constrains the column; this rejects the
  // same set with a 400 instead of a 500 from the constraint.
  if (!isStudentEventKind(kind)) {
    throw new SessionError(`Unknown event kind: ${kind}`, 400)
  }

  const supabase = createServiceClient()

  // Pin the action to the patient state it was taken against. Read rather than
  // joined later because session_state is overwritten on the next Send -- by
  // debrief time the live row no longer says what was on screen just now.
  const { data: currentState } = await supabase
    .from('session_state')
    .select('version')
    .eq('session_id', session.id)
    .maybeSingle()
  const stateVersion =
    typeof currentState?.version === 'number' ? currentState.version : null

  const { data, error } = await supabase
    .from('student_events')
    .insert({
      session_id: session.id,
      participant_id: participant.id,
      attempt_version: session.active_attempt_version,
      kind,
      label,
      payload: input.payload ?? {},
      state_version: stateVersion,
    })
    .select('id, session_id, participant_id, attempt_version, kind, label, payload, occurred_at, state_version')
    .single()

  if (error || !data) throw new SessionError(error?.message ?? 'Unable to record event', 500)
  return { session, participant, event: data }
}

/**
 * The evaluation record for one drill run.
 *
 * Scoped to a single attempt by default. The old unscoped query ordered
 * `occurred_at` ascending with no limit, so PostgREST's 1000-row cap truncated
 * the newest rows -- on a long session the roster the instructor was watching
 * live silently stopped updating. Pass `attemptVersion: 'all'` for a
 * whole-session export, where truncation is visible rather than surprising.
 *
 * `stateHistory` carries the instructor side of the timeline: join it to each
 * event on `state_version` -> `version` to recover the patient state behind
 * the action.
 */
export async function getReview(
  code: string,
  hostToken: string,
  attemptVersion: number | 'all' = -1,
) {
  const session = await verifyHost(code, hostToken)
  const supabase = createServiceClient()
  const attempt =
    attemptVersion === 'all'
      ? 'all'
      : attemptVersion >= 1
        ? attemptVersion
        : session.active_attempt_version

  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('id, session_id, nickname, joined_at, last_seen_at')
    .eq('session_id', session.id)
    .order('joined_at', { ascending: true })
  if (participantsError) throw new SessionError(participantsError.message, 500)

  let eventsQuery = supabase
    .from('student_events')
    .select('id, session_id, participant_id, attempt_version, kind, label, payload, occurred_at, state_version')
    .eq('session_id', session.id)
  if (attempt !== 'all') eventsQuery = eventsQuery.eq('attempt_version', attempt)

  // One over the cap: if the extra row comes back, the client is looking at a
  // partial record and gets told so instead of quietly believing it is whole.
  const { data: events, error: eventsError } = await eventsQuery
    .order('occurred_at', { ascending: true })
    .limit(REVIEW_EVENT_LIMIT + 1)
  if (eventsError) throw new SessionError(eventsError.message, 500)

  const allEvents = events ?? []
  const truncated = allEvents.length > REVIEW_EVENT_LIMIT

  let historyQuery = supabase
    .from('session_state_history')
    .select('version, attempt_version, state, applied_at')
    .eq('session_id', session.id)
  if (attempt !== 'all') historyQuery = historyQuery.eq('attempt_version', attempt)

  const { data: stateHistory, error: historyError } = await historyQuery
    .order('version', { ascending: true })
    .limit(REVIEW_EVENT_LIMIT)
  if (historyError) throw new SessionError(historyError.message, 500)

  const { data: attempts, error: attemptsError } = await supabase
    .from('participant_attempts')
    .select('participant_id, attempt_version, started_at, completed_at')
    .eq('session_id', session.id)
  if (attemptsError) throw new SessionError(attemptsError.message, 500)

  return {
    session,
    attemptVersion: attempt,
    participants: participants ?? [],
    events: truncated ? allEvents.slice(0, REVIEW_EVENT_LIMIT) : allEvents,
    truncated,
    stateHistory: stateHistory ?? [],
    attempts: attempts ?? [],
  }
}
