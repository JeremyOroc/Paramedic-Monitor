import { createAuthenticatedClient, createServiceClient } from '@/lib/supabase/server'
import type { ActiveAccount } from '@/server/accounts/service'
import { isStudentEventKind, type InstructorNote, type ParticipantAttempt, type SessionParticipant, type SessionStateHistoryEntry, type StudentEvent } from '@/types/session'

export const REPORT_PAGE_SIZE = 25
export const REPORT_STUDENT_NAME_MAX = 100
export const REPORT_STUDENT_NAMES_MAX = 100
export const REPORT_ATTEMPT_LABEL_MAX = 60
export const REPORT_GENERAL_NOTES_MAX = 4000
export const REPORT_DELETE_MAX = 25

export type ReportStatus = 'incomplete' | 'complete'
export type ReportCompletionMethod = 'attempt_transition' | 'room_ended' | 'manual' | 'account_disabled'

export type EvaluationReportSummary = {
  id: string
  source_room_code: string
  attempt_version: number
  attempt_label: string
  scenario_name: string
  defibrillator_model: 'wagamiX' | 'wagamiZ' | 'wagamiA' | null
  student_names: string[]
  status: ReportStatus
  completion_method: ReportCompletionMethod | null
  started_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
  deletion_blocked: boolean
}

export type EvaluationReport = EvaluationReportSummary & {
  owner_user_id: string
  source_session_id: string
  scenario_snapshot: unknown
  participants: Pick<SessionParticipant, 'id' | 'nickname'>[]
  participant_attempts: ParticipantAttempt[]
  events: StudentEvent[]
  state_history: SessionStateHistoryEntry[]
  general_notes: string
  instructor_notes: InstructorNote[]
}

export type ReportListFilters = {
  status?: 'all' | ReportStatus
  query?: string
  from?: string
  to?: string
  page?: number
}

export class ReportError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validDate(value: string | undefined): string | null {
  if (!value) return null
  if (!DATE_PATTERN.test(value) || !Number.isFinite(Date.parse(`${value}T12:00:00Z`))) {
    throw new ReportError('Dates must use YYYY-MM-DD', 400)
  }
  return value
}

function reportId(value: string): string {
  if (!UUID_PATTERN.test(value)) throw new ReportError('Report not found', 404)
  return value
}

function normalizeAttemptLabel(value: unknown): string {
  if (typeof value !== 'string') throw new ReportError('Attempt name must be text', 400)
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length > REPORT_ATTEMPT_LABEL_MAX) {
    throw new ReportError(`Attempt name must be ${REPORT_ATTEMPT_LABEL_MAX} characters or fewer`, 400)
  }
  return normalized
}

export function normalizeStudentNames(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((name) => typeof name !== 'string')) {
    throw new ReportError('Student names must be a list of text values', 400)
  }
  if (value.length > REPORT_STUDENT_NAMES_MAX) {
    throw new ReportError(`No more than ${REPORT_STUDENT_NAMES_MAX} Student names are allowed`, 400)
  }
  const names = value.map((name) => name.trim()).filter(Boolean)
  if (names.some((name) => name.length > REPORT_STUDENT_NAME_MAX)) {
    throw new ReportError(`Each Student name must be ${REPORT_STUDENT_NAME_MAX} characters or fewer`, 400)
  }
  return names
}

function stringValue(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === 'string' ? record[key] : ''
}

function nullableString(record: Record<string, unknown>, key: string): string | null {
  return typeof record[key] === 'string' ? record[key] : null
}

function parseSummary(value: unknown): EvaluationReportSummary {
  if (!isRecord(value)) throw new ReportError('Unable to read reports', 500)
  const model = value.defibrillator_model === 'wagamiX' || value.defibrillator_model === 'wagamiZ' || value.defibrillator_model === 'wagamiA'
    ? value.defibrillator_model
    : null
  const status: ReportStatus = value.status === 'complete' ? 'complete' : 'incomplete'
  const completion = value.completion_method
  const completion_method: ReportCompletionMethod | null =
    completion === 'attempt_transition' || completion === 'room_ended' || completion === 'manual' || completion === 'account_disabled'
      ? completion
      : null
  return {
    id: stringValue(value, 'id'),
    source_room_code: stringValue(value, 'source_room_code'),
    attempt_version: typeof value.attempt_version === 'number' ? value.attempt_version : 1,
    attempt_label: stringValue(value, 'attempt_label'),
    scenario_name: stringValue(value, 'scenario_name') || 'Untitled Scenario',
    defibrillator_model: model,
    student_names: Array.isArray(value.student_names)
      ? value.student_names.filter((name): name is string => typeof name === 'string')
      : [],
    status,
    completion_method,
    started_at: stringValue(value, 'started_at'),
    completed_at: nullableString(value, 'completed_at'),
    created_at: stringValue(value, 'created_at'),
    updated_at: stringValue(value, 'updated_at'),
    deletion_blocked: value.deletion_blocked === true,
  }
}

function parseParticipants(value: unknown): EvaluationReport['participants'] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).flatMap((participant) => {
    const id = stringValue(participant, 'id')
    const nickname = stringValue(participant, 'nickname')
    return id && nickname ? [{ id, nickname }] : []
  })
}

function parseParticipantAttempts(value: unknown): ParticipantAttempt[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).flatMap((attempt) => {
    const participantId = stringValue(attempt, 'participant_id')
    const startedAt = stringValue(attempt, 'started_at')
    const version = attempt.attempt_version
    if (!participantId || !startedAt || typeof version !== 'number') return []
    return [{
      participant_id: participantId,
      attempt_version: version,
      started_at: startedAt,
      completed_at: nullableString(attempt, 'completed_at'),
    }]
  })
}

function parseEvents(value: unknown): StudentEvent[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).flatMap((event) => {
    if (!isStudentEventKind(event.kind)) return []
    const id = stringValue(event, 'id')
    const sessionId = stringValue(event, 'session_id')
    const participantId = stringValue(event, 'participant_id')
    const label = stringValue(event, 'label')
    const occurredAt = stringValue(event, 'occurred_at')
    const version = event.attempt_version
    if (!id || !sessionId || !participantId || !label || !occurredAt || typeof version !== 'number') return []
    return [{
      id,
      session_id: sessionId,
      participant_id: participantId,
      attempt_version: version,
      kind: event.kind,
      label,
      payload: event.payload ?? {},
      occurred_at: occurredAt,
      state_version: typeof event.state_version === 'number' ? event.state_version : null,
      occurred_at_client: nullableString(event, 'occurred_at_client'),
      capture_sequence: typeof event.capture_sequence === 'number' ? event.capture_sequence : null,
      clock_offset_ms: typeof event.clock_offset_ms === 'number' ? event.clock_offset_ms : null,
    }]
  })
}

function parseHistory(value: unknown): SessionStateHistoryEntry[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).flatMap((entry) => {
    if (typeof entry.version !== 'number' || typeof entry.attempt_version !== 'number') return []
    const appliedAt = stringValue(entry, 'applied_at')
    if (!appliedAt) return []
    return [{
      version: entry.version,
      attempt_version: entry.attempt_version,
      state: entry.state ?? {},
      applied_at: appliedAt,
    }]
  })
}

function parseInstructorNotes(value: unknown): InstructorNote[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).flatMap((note) => {
    const id = stringValue(note, 'id')
    const sessionId = stringValue(note, 'session_id')
    const body = stringValue(note, 'body')
    const occurredAt = stringValue(note, 'occurred_at')
    const version = note.attempt_version
    if (!id || !sessionId || !body || !occurredAt || typeof version !== 'number') return []
    return [{
      id,
      session_id: sessionId,
      attempt_version: version,
      body,
      occurred_at: occurredAt,
    }]
  })
}

const SUMMARY_COLUMNS = 'id, source_room_code, attempt_version, attempt_label, scenario_name, defibrillator_model, student_names, status, completion_method, started_at, completed_at, created_at, updated_at'
const DETAIL_COLUMNS = `${SUMMARY_COLUMNS}, owner_user_id, source_session_id, scenario_snapshot, participants, participant_attempts, events, state_history, general_notes, instructor_notes`

export async function listEvaluationReports(
  account: Pick<ActiveAccount, 'user_id'>,
  filters: ReportListFilters = {},
) {
  const status = filters.status ?? 'all'
  if (status !== 'all' && status !== 'complete' && status !== 'incomplete') {
    throw new ReportError('Invalid report status', 400)
  }
  const page = filters.page ?? 1
  if (!Number.isSafeInteger(page) || page < 1) throw new ReportError('Invalid page', 400)
  const query = (filters.query ?? '').trim().slice(0, 100)
  const auth = await createAuthenticatedClient()
  const { data, error } = await auth.rpc('search_evaluation_reports', {
    p_owner: account.user_id,
    p_status: status,
    p_query: query,
    p_from: validDate(filters.from),
    p_to: validDate(filters.to),
    p_offset: (page - 1) * REPORT_PAGE_SIZE,
    p_limit: REPORT_PAGE_SIZE,
  })
  if (error) throw new ReportError('Unable to load reports', 503)
  if (!isRecord(data)) throw new ReportError('Unable to read reports', 500)
  const items = Array.isArray(data.items) ? data.items.map(parseSummary) : []
  const total = typeof data.total === 'number' ? data.total : Number(data.total ?? 0)
  return { items, total: Number.isFinite(total) ? total : 0, page, pageSize: REPORT_PAGE_SIZE }
}

export async function getEvaluationReport(
  account: Pick<ActiveAccount, 'user_id'>,
  id: string,
): Promise<EvaluationReport> {
  const auth = await createAuthenticatedClient()
  const { data, error } = await auth
    .from('evaluation_reports')
    .select(DETAIL_COLUMNS)
    .eq('id', reportId(id))
    .eq('owner_user_id', account.user_id)
    .maybeSingle()
  if (error) throw new ReportError('Unable to load report', 503)
  if (!data || !isRecord(data)) throw new ReportError('Report not found', 404)
  const { data: activeRoom, error: activeRoomError } = await auth
    .from('sessions')
    .select('id')
    .eq('id', stringValue(data, 'source_session_id'))
    .eq('owner_user_id', account.user_id)
    .eq('status', 'active')
    .eq('active_attempt_version', typeof data.attempt_version === 'number' ? data.attempt_version : 1)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (activeRoomError) throw new ReportError('Unable to check report deletion availability', 503)
  return {
    ...parseSummary(data),
    deletion_blocked: Boolean(activeRoom),
    owner_user_id: stringValue(data, 'owner_user_id'),
    source_session_id: stringValue(data, 'source_session_id'),
    scenario_snapshot: data.scenario_snapshot ?? {},
    participants: parseParticipants(data.participants),
    participant_attempts: parseParticipantAttempts(data.participant_attempts),
    events: parseEvents(data.events),
    state_history: parseHistory(data.state_history),
    general_notes: stringValue(data, 'general_notes'),
    instructor_notes: parseInstructorNotes(data.instructor_notes),
  }
}

export async function updateEvaluationReport(
  account: Pick<ActiveAccount, 'user_id'>,
  id: string,
  input: unknown,
) {
  if (!isRecord(input)) throw new ReportError('Invalid report update', 400)
  const payload: { attempt_label?: string; student_names?: string[]; general_notes?: string } = {}
  if ('attemptLabel' in input) payload.attempt_label = normalizeAttemptLabel(input.attemptLabel)
  if ('studentNames' in input) payload.student_names = normalizeStudentNames(input.studentNames)
  if ('generalNotes' in input) {
    if (typeof input.generalNotes !== 'string') {
      throw new ReportError('General Notes must be text', 400)
    }
    if (input.generalNotes.length > REPORT_GENERAL_NOTES_MAX) {
      throw new ReportError(`General Notes must be ${REPORT_GENERAL_NOTES_MAX} characters or fewer`, 400)
    }
    payload.general_notes = input.generalNotes
  }
  if (Object.keys(payload).length === 0) throw new ReportError('No report changes supplied', 400)
  const auth = await createAuthenticatedClient()
  if (payload.general_notes !== undefined) {
    const { data: report, error: reportError } = await auth
      .from('evaluation_reports')
      .select('source_session_id, attempt_version')
      .eq('id', reportId(id))
      .eq('owner_user_id', account.user_id)
      .maybeSingle()
    if (reportError) throw new ReportError('Unable to check report editing availability', 503)
    if (!report) throw new ReportError('Report not found', 404)
    const { data: activeRoom, error: activeRoomError } = await auth
      .from('sessions')
      .select('id')
      .eq('id', report.source_session_id)
      .eq('owner_user_id', account.user_id)
      .eq('status', 'active')
      .eq('active_attempt_version', report.attempt_version)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (activeRoomError) throw new ReportError('Unable to check report editing availability', 503)
    if (activeRoom) {
      throw new ReportError('Edit General Notes from the controlling Instructor Console while this Attempt is active', 409)
    }
  }
  const { data, error } = await auth
    .from('evaluation_reports')
    .update(payload)
    .eq('id', reportId(id))
    .eq('owner_user_id', account.user_id)
    .select(`${SUMMARY_COLUMNS}, general_notes`)
    .maybeSingle()
  if (error) throw new ReportError('Unable to update report', 503)
  if (!data) throw new ReportError('Report not found', 404)
  return { ...parseSummary(data), general_notes: stringValue(data, 'general_notes') }
}

export async function manuallyCompleteEvaluationReport(
  account: Pick<ActiveAccount, 'user_id'>,
  id: string,
) {
  const auth = await createAuthenticatedClient()
  const { data, error } = await auth
    .from('evaluation_reports')
    .update({ status: 'complete', completion_method: 'manual', completed_at: new Date().toISOString() })
    .eq('id', reportId(id))
    .eq('owner_user_id', account.user_id)
    .eq('status', 'incomplete')
    .select(SUMMARY_COLUMNS)
    .maybeSingle()
  if (error) throw new ReportError('Unable to complete report', 503)
  if (!data) throw new ReportError('Incomplete report not found', 404)
  return parseSummary(data)
}

export async function deleteEvaluationReport(
  account: Pick<ActiveAccount, 'user_id'>,
  id: string,
) {
  await deleteEvaluationReports(account, { reportIds: [id] })
}

function normalizeReportIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > REPORT_DELETE_MAX) {
    throw new ReportError(`Select between 1 and ${REPORT_DELETE_MAX} reports`, 400)
  }
  if (value.some((id) => typeof id !== 'string' || !UUID_PATTERN.test(id))) {
    throw new ReportError('Invalid report selection', 400)
  }
  const ids = value as string[]
  if (new Set(ids).size !== ids.length) {
    throw new ReportError('Each selected report must be unique', 400)
  }
  return ids
}

export async function deleteEvaluationReports(
  _account: Pick<ActiveAccount, 'user_id'>,
  input: unknown,
): Promise<number> {
  if (!isRecord(input)) throw new ReportError('Invalid report deletion', 400)
  const ids = normalizeReportIds(input.reportIds)
  const auth = await createAuthenticatedClient()
  const { data, error } = await auth.rpc('delete_evaluation_reports', {
    p_report_ids: ids,
  })
  if (error) {
    if (error.code === '55000') throw new ReportError(error.message, 409)
    if (error.code === 'P0002') throw new ReportError('One or more reports were not found', 404)
    throw new ReportError('Unable to delete reports', 503)
  }
  const deleted = typeof data === 'number' ? data : Number(data)
  if (!Number.isSafeInteger(deleted) || deleted !== ids.length) {
    throw new ReportError('Unable to verify report deletion', 503)
  }
  return deleted
}

/** Explicit End Room completes its current report. Passive expiry never calls this. */
export async function completeEvaluationReportForRoom(
  sessionId: string,
  ownerUserId: string,
  attemptVersion: number,
) {
  const service = createServiceClient()
  const { error } = await service
    .from('evaluation_reports')
    .update({ status: 'complete', completion_method: 'room_ended', completed_at: new Date().toISOString() })
    .eq('source_session_id', sessionId)
    .eq('owner_user_id', ownerUserId)
    .eq('attempt_version', attemptVersion)
    .eq('status', 'incomplete')
  if (error) throw new ReportError('Unable to complete the Room report', 500)
}
