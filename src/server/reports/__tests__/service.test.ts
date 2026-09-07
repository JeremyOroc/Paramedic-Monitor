import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSupabaseStub, type RecordedOp } from '@/server/sessions/__tests__/supabaseStub'

let authClient: unknown
let serviceClient: unknown

vi.mock('@/lib/supabase/server', () => ({
  createAuthenticatedClient: vi.fn(async () => authClient),
  createServiceClient: vi.fn(() => serviceClient),
}))

import {
  completeEvaluationReportForRoom,
  deleteEvaluationReport,
  getEvaluationReport,
  listEvaluationReports,
  manuallyCompleteEvaluationReport,
  normalizeStudentNames,
  updateEvaluationReport,
} from '../service'

const ACCOUNT = { user_id: '50000000-0000-4000-8000-000000000001' }
const REPORT_ID = '51000000-0000-4000-8000-000000000001'
const SUMMARY = {
  id: REPORT_ID,
  source_room_code: 'ABC234',
  attempt_version: 2,
  attempt_label: 'Morning',
  scenario_name: 'Cardiac arrest',
  defibrillator_model: 'wagamiZ',
  student_names: ['Alice'],
  status: 'incomplete',
  completion_method: null,
  started_at: '2026-09-07T14:00:00.000Z',
  completed_at: null,
  created_at: '2026-09-07T14:00:00.000Z',
  updated_at: '2026-09-07T14:00:00.000Z',
}

function reportResolver(op: RecordedOp) {
  if (op.table !== 'evaluation_reports') return { data: null }
  if (op.method === 'delete') return { data: { id: REPORT_ID } }
  if (op.method === 'update') {
    return { data: { ...SUMMARY, ...op.payload } }
  }
  return {
    data: {
      ...SUMMARY,
      owner_user_id: ACCOUNT.user_id,
      source_session_id: '52000000-0000-4000-8000-000000000001',
      scenario_snapshot: { confirmed: { hr: 40 } },
      participants: [{ id: 'p1', nickname: 'Trainee' }],
      participant_attempts: [{ participant_id: 'p1', attempt_version: 2, started_at: SUMMARY.started_at, completed_at: null }],
      events: [{
        id: 'e1',
        session_id: 's1',
        participant_id: 'p1',
        attempt_version: 2,
        kind: 'analyze',
        label: 'Analyze',
        payload: {},
        occurred_at: SUMMARY.started_at,
        state_version: 1,
        occurred_at_client: null,
        capture_sequence: null,
        clock_offset_ms: null,
      }],
      state_history: [{ version: 1, attempt_version: 2, state: {}, applied_at: SUMMARY.started_at }],
    },
  }
}

describe('persistent report service', () => {
  beforeEach(() => {
    const authStub = createSupabaseStub(reportResolver)
    const serviceStub = createSupabaseStub(reportResolver)
    authClient = authStub.client
    serviceClient = serviceStub.client
  })

  it('trims names, removes blanks, preserves capitalization, and allows duplicates', () => {
    expect(normalizeStudentNames([' Alice ', '', 'Alice', ' bob '])).toEqual(['Alice', 'Alice', 'bob'])
    expect(() => normalizeStudentNames(Array.from({ length: 101 }, () => 'A'))).toThrow(/No more than 100/)
    expect(() => normalizeStudentNames(['x'.repeat(101)])).toThrow(/100 characters/)
  })

  it('uses the RLS-aware search RPC with 25-row paging and Toronto date values', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { items: [SUMMARY], total: 26 }, error: null })
    authClient = { rpc }

    const result = await listEvaluationReports(ACCOUNT, {
      status: 'incomplete',
      query: '  cardiac  ',
      from: '2026-09-01',
      to: '2026-09-07',
      page: 2,
    })

    expect(rpc).toHaveBeenCalledWith('search_evaluation_reports', {
      p_owner: ACCOUNT.user_id,
      p_status: 'incomplete',
      p_query: 'cardiac',
      p_from: '2026-09-01',
      p_to: '2026-09-07',
      p_offset: 25,
      p_limit: 25,
    })
    expect(result).toMatchObject({ total: 26, page: 2, pageSize: 25 })
    expect(result.items[0]).toMatchObject({ id: REPORT_ID, scenario_name: 'Cardiac arrest' })
  })

  it('rejects invalid filters before querying', async () => {
    await expect(listEvaluationReports(ACCOUNT, { page: 0 })).rejects.toMatchObject({ status: 400 })
    await expect(listEvaluationReports(ACCOUNT, { from: '09/07/2026' })).rejects.toMatchObject({ status: 400 })
  })

  it('loads and reconstructs one owner-scoped durable timeline', async () => {
    const stub = createSupabaseStub(reportResolver)
    authClient = stub.client

    const report = await getEvaluationReport(ACCOUNT, REPORT_ID)

    expect(report.participants).toEqual([{ id: 'p1', nickname: 'Trainee' }])
    expect(report.events[0]).toMatchObject({ kind: 'analyze', participant_id: 'p1' })
    expect(report.state_history[0]).toMatchObject({ version: 1, attempt_version: 2 })
    expect(stub.opsFor('evaluation_reports')[0].filters).toEqual(expect.arrayContaining([
      { op: 'eq', column: 'id', value: REPORT_ID },
      { op: 'eq', column: 'owner_user_id', value: ACCOUNT.user_id },
    ]))
  })

  it('normalizes editable metadata without exposing captured arrays to updates', async () => {
    const stub = createSupabaseStub(reportResolver)
    authClient = stub.client

    await updateEvaluationReport(ACCOUNT, REPORT_ID, {
      attemptLabel: '  Morning   group ',
      studentNames: [' Alice ', '', 'Alice'],
    })

    expect(stub.opsFor('evaluation_reports')[0].payload).toEqual({
      attempt_label: 'Morning group',
      student_names: ['Alice', 'Alice'],
    })
  })

  it('manually completes and permanently deletes only an owner-scoped record', async () => {
    const stub = createSupabaseStub(reportResolver)
    authClient = stub.client

    await manuallyCompleteEvaluationReport(ACCOUNT, REPORT_ID)
    await deleteEvaluationReport(ACCOUNT, REPORT_ID)

    expect(stub.opsFor('evaluation_reports')[0]).toMatchObject({
      method: 'update',
      payload: { status: 'complete', completion_method: 'manual' },
    })
    expect(stub.opsFor('evaluation_reports')[1]).toMatchObject({ method: 'delete' })
    for (const op of stub.opsFor('evaluation_reports')) {
      expect(op.filters).toContainEqual({ op: 'eq', column: 'owner_user_id', value: ACCOUNT.user_id })
    }
  })

  it('completes only explicit End Room through the privileged lifecycle path', async () => {
    const stub = createSupabaseStub(reportResolver)
    serviceClient = stub.client

    await completeEvaluationReportForRoom('session-1', ACCOUNT.user_id, 3)

    expect(stub.opsFor('evaluation_reports')[0]).toMatchObject({
      method: 'update',
      payload: { status: 'complete', completion_method: 'room_ended' },
    })
    expect(stub.opsFor('evaluation_reports')[0].filters).toEqual(expect.arrayContaining([
      { op: 'eq', column: 'source_session_id', value: 'session-1' },
      { op: 'eq', column: 'attempt_version', value: 3 },
      { op: 'eq', column: 'status', value: 'incomplete' },
    ]))
  })
})
