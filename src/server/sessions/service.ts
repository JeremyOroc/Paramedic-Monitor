import { randomUUID } from 'node:crypto'

import { createServiceClient } from '@/lib/supabase/server'
import { generateSessionCode, isValidSessionCode } from '@/lib/session'
import { isStudentEventKind } from '@/types/session'
import {
  MONITOR_PROJECTION_VERSION,
  type MonitorProjection,
  type MonitorProjectionEnvelope,
} from '@/types/monitorProjection'
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
  /**
   * The state version the monitor was showing when the button was pressed.
   * Accepted when it is at or below the version current at insert, so a
   * monitor may say it was behind but never that it saw a state the
   * instructor had not sent. Omitted by older clients, in which case the
   * current version is stamped as before.
   */
  stateVersion?: number | null
  occurredAtClient?: string | null
  captureSequence?: number | null
  clockOffsetMs?: number | null
}

const MAX_MONITOR_PROJECTION_BYTES = 256 * 1024

export function isMonitorProjection(value: unknown): value is MonitorProjection {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const projection = value as Record<string, unknown>
  const isRecord = (candidate: unknown): candidate is Record<string, unknown> =>
    typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
  const route = projection.dispatchRoute
  return (
    projection.version === MONITOR_PROJECTION_VERSION &&
    typeof projection.capturedAt === 'string' &&
    (projection.model === 'wagamiX' || projection.model === 'wagamiZ') &&
    (projection.surface === 'dispatch' || projection.surface === 'monitor') &&
    isRecord(projection.controller) &&
    isRecord(projection.confirmed) &&
    isRecord(projection.confirmedVitalActive) &&
    isRecord(projection.acceptedBp) &&
    isRecord(projection.acceptedBpActive) &&
    isRecord(projection.callerInfo) &&
    isRecord(projection.dispatch) &&
    isRecord(route) &&
    Array.isArray(route.geometry) &&
    isRecord(projection.patientInfo) &&
    isRecord(projection.nibp) &&
    isRecord(projection.defib) &&
    Array.isArray(projection.alarms) &&
    Array.isArray(projection.mergedEventLog) &&
    Array.isArray(projection.vitalLog)
  )
}

function validateMonitorProjection(value: unknown): MonitorProjection {
  if (!isMonitorProjection(value)) {
    throw new SessionError('Invalid monitor projection', 400)
  }
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_MONITOR_PROJECTION_BYTES) {
    throw new SessionError('Monitor projection is too large', 413)
  }
  return value
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

/** Starts a fresh browser-page stream. A later page load replaces the stream id,
 * preventing delayed writes from an older tab from overwriting current state. */
export async function startMonitorProjectionStream(
  code: string,
  participantToken: string,
  value: unknown,
): Promise<MonitorProjectionEnvelope> {
  const projection = validateMonitorProjection(value)
  const { session, participant } = await verifyParticipant(code, participantToken)
  if (session.status === 'ended') throw new SessionError('Session has ended', 410)

  const streamId = randomUUID()
  const updatedAt = new Date().toISOString()
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('trainee_monitor_projections')
    .upsert({
      participant_id: participant.id,
      session_id: session.id,
      attempt_version: session.active_attempt_version,
      stream_id: streamId,
      client_sequence: 0,
      projection,
      updated_at: updatedAt,
    })
    .select('stream_id, client_sequence, attempt_version, projection, updated_at')
    .single()

  if (error || !data) {
    throw new SessionError(error?.message ?? 'Unable to start monitor projection', 500)
  }
  return {
    streamId: data.stream_id as string,
    clientSequence: data.client_sequence as number,
    attemptVersion: data.attempt_version as number,
    updatedAt: data.updated_at as string,
    projection: data.projection as MonitorProjection,
  }
}

/** Publishes only if this page still owns the stream and its sequence advances. */
export async function publishMonitorProjection(
  code: string,
  participantToken: string,
  streamId: string,
  clientSequence: number,
  value: unknown,
): Promise<MonitorProjectionEnvelope> {
  const projection = validateMonitorProjection(value)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(streamId)) {
    throw new SessionError('Invalid projection stream', 400)
  }
  if (!Number.isSafeInteger(clientSequence) || clientSequence < 1) {
    throw new SessionError('Invalid projection sequence', 400)
  }

  const { session, participant } = await verifyParticipant(code, participantToken)
  if (session.status === 'ended') throw new SessionError('Session has ended', 410)
  const updatedAt = new Date().toISOString()
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('trainee_monitor_projections')
    .update({
      client_sequence: clientSequence,
      projection,
      updated_at: updatedAt,
    })
    .eq('participant_id', participant.id)
    .eq('session_id', session.id)
    .eq('attempt_version', session.active_attempt_version)
    .eq('stream_id', streamId)
    .lt('client_sequence', clientSequence)
    .select('stream_id, client_sequence, attempt_version, projection, updated_at')
    .maybeSingle()

  if (error) throw new SessionError(error.message, 500)
  if (!data) throw new SessionError('Projection stream is stale', 409)
  return {
    streamId: data.stream_id as string,
    clientSequence: data.client_sequence as number,
    attemptVersion: data.attempt_version as number,
    updatedAt: data.updated_at as string,
    projection: data.projection as MonitorProjection,
  }
}

export async function getMonitorProjectionForHost(
  code: string,
  hostToken: string,
  participantId: string,
) {
  const session = await verifyHost(code, hostToken)
  const supabase = createServiceClient()
  const [participantResult, projectionResult] = await Promise.all([
    supabase
      .from('participants')
      .select('id, session_id, nickname, joined_at, last_seen_at')
      .eq('id', participantId)
      .eq('session_id', session.id)
      .maybeSingle(),
    supabase
      .from('trainee_monitor_projections')
      .select('stream_id, client_sequence, attempt_version, projection, updated_at')
      .eq('participant_id', participantId)
      .eq('session_id', session.id)
      .maybeSingle(),
  ])

  if (participantResult.error) throw new SessionError(participantResult.error.message, 500)
  if (!participantResult.data) throw new SessionError('Student not found', 404)
  if (projectionResult.error) throw new SessionError(projectionResult.error.message, 500)

  const row = projectionResult.data
  const projection =
    row && row.attempt_version === session.active_attempt_version
      ? {
          streamId: row.stream_id as string,
          clientSequence: row.client_sequence as number,
          attemptVersion: row.attempt_version as number,
          updatedAt: row.updated_at as string,
          projection: row.projection as MonitorProjection,
        }
      : null

  return {
    session,
    participant: participantResult.data as ParticipantRecord,
    projection,
  }
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

export const ATTEMPT_LABEL_MAX = 60

/**
 * Name one of the room's attempts. The number is what the record is keyed
 * on and never changes; the name is a label beside it, changeable at any
 * time, including for an attempt that has already ended. An empty label
 * clears the name.
 */
export async function renameAttempt(
  code: string,
  hostToken: string,
  attemptVersion: number,
  label: string,
) {
  const session = await verifyHost(code, hostToken)
  if (
    !Number.isInteger(attemptVersion) ||
    attemptVersion < 1 ||
    attemptVersion > session.active_attempt_version
  ) {
    throw new SessionError(`No attempt ${attemptVersion} in this room`, 400)
  }
  const normalized = label.trim().replace(/\s+/g, ' ').slice(0, ATTEMPT_LABEL_MAX)

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('session_attempts')
    .upsert(
      {
        session_id: session.id,
        attempt_version: attemptVersion,
        label: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,attempt_version' },
    )
    .select('attempt_version, label')
    .single()
  if (error || !data) throw new SessionError(error?.message ?? 'Unable to rename attempt', 500)
  return data
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

export async function getSessionStatus(
  code: string,
  participantToken?: string,
  sinceVersion: number | null = null,
) {
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

  // A monitor that says which version it holds gets a version-only read when
  // nothing moved. Room data shows one Send per ~13 minutes against a poll
  // every 1.5s, so this is the answer roughly 534 polls in 535 -- and the
  // blob it skips can be 30 KB of route polyline (docs/adr/0003).
  if (sinceVersion !== null) {
    const { data: head, error: headError } = await supabase
      .from('session_state')
      .select('version, updated_at')
      .eq('session_id', session.id)
      .maybeSingle()
    if (headError) throw new SessionError(headError.message, 500)
    if (head && head.version === sinceVersion) {
      return { session, state: null, unchanged: true as const, version: head.version }
    }
  }

  const { data: state, error } = await supabase
    .from('session_state')
    .select('state, version, updated_at')
    .eq('session_id', session.id)
    .maybeSingle()
  if (error) throw new SessionError(error.message, 500)
  return { session, state: state ?? null, unchanged: false as const }
}

/**
 * The evaluation record stores what the instructor sent and what the trainee
 * pressed. The route polyline is neither -- it is what the map drew from an
 * origin and a destination -- and it was 86% of everything in history. The
 * live `session_state` keeps it, because the trainee's map is drawn from
 * there; the history copy does not, because nothing ever reads it back.
 */
export function stripRouteGeometry(state: unknown): unknown {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) return state
  const record = state as Record<string, unknown>
  const route = record.dispatchRouteConfirmed
  if (typeof route !== 'object' || route === null || Array.isArray(route)) return state
  if (!('geometry' in route)) return state
  return {
    ...record,
    dispatchRouteConfirmed: { ...(route as Record<string, unknown>), geometry: [] },
  }
}

export async function updateSessionState(
  code: string,
  hostToken: string,
  state: unknown,
) {
  const session = await verifyHost(code, hostToken)
  // An ended room is closed to changes: a Send here would write history the
  // record shows as part of an attempt that had already finished.
  if (session.status === 'ended') throw new SessionError('Session has ended', 410)
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
      state: stripRouteGeometry(state),
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
  // 410 rather than a silent accept: the queue treats a 4xx as permanent and
  // drops the action, which is right for a room that no longer exists to act in.
  if (session.status === 'ended') throw new SessionError('Session has ended', 410)
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
  const currentVersion =
    typeof currentState?.version === 'number' ? currentState.version : null

  // A claim is the version the monitor was showing when the button was
  // pressed. It may trail the current version -- the monitor was behind, and
  // the report will say so -- but it may never lead it: nobody has seen a
  // state the instructor has not sent. A claim above current is a client
  // bug, and a 400 lets the queue drop it rather than retry it forever.
  const claimed = input.stateVersion
  let stateVersion = currentVersion
  if (typeof claimed === 'number') {
    if (!Number.isInteger(claimed) || claimed < 1) {
      throw new SessionError(`Invalid state version: ${claimed}`, 400)
    }
    if (currentVersion === null || claimed > currentVersion) {
      throw new SessionError(
        `State version ${claimed} is ahead of the room (current ${currentVersion ?? 'none'})`,
        400,
      )
    }
    stateVersion = claimed
  }

  const occurredAtClient =
    typeof input.occurredAtClient === 'string' && Number.isFinite(Date.parse(input.occurredAtClient))
      ? input.occurredAtClient
      : null
  const captureSequence =
    typeof input.captureSequence === 'number' && Number.isInteger(input.captureSequence)
      ? input.captureSequence
      : null
  const clockOffsetMs =
    typeof input.clockOffsetMs === 'number' && Number.isFinite(input.clockOffsetMs)
      ? Math.round(input.clockOffsetMs)
      : null

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
      occurred_at_client: occurredAtClient,
      capture_sequence: captureSequence,
      clock_offset_ms: clockOffsetMs,
    })
    .select(
      'id, session_id, participant_id, attempt_version, kind, label, payload, occurred_at, state_version, occurred_at_client, capture_sequence, clock_offset_ms',
    )
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
export type GetReviewOptions = {
  /**
   * Whether to fetch `session_state_history`. Off by default: the console
   * polls the review every 2.5s for the roster, and the history is only read
   * while the Report tab is open. Fetching it on every tick made the console
   * download every stored state on every poll.
   */
  includeHistory?: boolean
}

export async function getReview(
  code: string,
  hostToken: string,
  attemptVersion: number | 'all' = -1,
  { includeHistory = false }: GetReviewOptions = {},
) {
  const session = await verifyHost(code, hostToken)
  const supabase = createServiceClient()
  const attempt =
    attemptVersion === 'all'
      ? 'all'
      : attemptVersion >= 1
        ? attemptVersion
        : session.active_attempt_version

  let eventsQuery = supabase
    .from('student_events')
    .select(
      'id, session_id, participant_id, attempt_version, kind, label, payload, occurred_at, state_version, occurred_at_client, capture_sequence, clock_offset_ms',
    )
    .eq('session_id', session.id)
  if (attempt !== 'all') eventsQuery = eventsQuery.eq('attempt_version', attempt)

  let historyQuery = supabase
    .from('session_state_history')
    .select('version, attempt_version, state, applied_at')
    .eq('session_id', session.id)
  if (attempt !== 'all') historyQuery = historyQuery.eq('attempt_version', attempt)

  // Four independent reads; nothing here depends on another's result, so they
  // go out together rather than one round-trip after the next.
  const [participantsResult, eventsResult, historyResult, attemptsResult, labelsResult] = await Promise.all([
    supabase
      .from('participants')
      .select('id, session_id, nickname, joined_at, last_seen_at')
      .eq('session_id', session.id)
      .order('joined_at', { ascending: true }),
    // One over the cap: if the extra row comes back, the client is looking at
    // a partial record and gets told so instead of quietly believing it is whole.
    eventsQuery.order('occurred_at', { ascending: true }).limit(REVIEW_EVENT_LIMIT + 1),
    includeHistory
      ? historyQuery.order('version', { ascending: true }).limit(REVIEW_EVENT_LIMIT)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('participant_attempts')
      .select('participant_id, attempt_version, started_at, completed_at')
      .eq('session_id', session.id),
    // Every attempt's name, not only the requested one: the picker lists them all.
    supabase
      .from('session_attempts')
      .select('attempt_version, label')
      .eq('session_id', session.id),
  ])

  if (participantsResult.error) throw new SessionError(participantsResult.error.message, 500)
  if (eventsResult.error) throw new SessionError(eventsResult.error.message, 500)
  if (historyResult.error) throw new SessionError(historyResult.error.message, 500)
  if (attemptsResult.error) throw new SessionError(attemptsResult.error.message, 500)
  if (labelsResult.error) throw new SessionError(labelsResult.error.message, 500)

  const allEvents = eventsResult.data ?? []
  const truncated = allEvents.length > REVIEW_EVENT_LIMIT

  return {
    session,
    attemptVersion: attempt,
    participants: participantsResult.data ?? [],
    events: truncated ? allEvents.slice(0, REVIEW_EVENT_LIMIT) : allEvents,
    truncated,
    stateHistory: historyResult.data ?? [],
    attempts: attemptsResult.data ?? [],
    attemptLabels: labelsResult.data ?? [],
  }
}
