import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSupabaseStub, type RecordedOp } from './supabaseStub'
import { hashSessionToken } from '../tokens'

let currentStub: ReturnType<typeof createSupabaseStub>

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => currentStub.client),
  createAuthenticatedClient: vi.fn(async () => currentStub.client),
}))

import {
  claimRoomControl,
  createSession,
  getRoomAccess,
  verifyRoomController,
  verifyRoomOwner,
} from '../service'

const ACCOUNT = { user_id: 'account-1' }
const OTHER_ACCOUNT = { user_id: 'account-2' }
const SESSION = {
  id: 'session-1',
  code: 'ABC234',
  owner_user_id: ACCOUNT.user_id,
  status: 'active' as const,
  active_attempt_version: 1,
  created_at: '2026-09-07T12:00:00.000Z',
  expires_at: '2026-09-08T12:00:00.000Z',
}

function ownerSession(op: RecordedOp) {
  if (op.table !== 'sessions') return { data: null }
  return op.filters.some((filter) =>
    filter.column === 'owner_user_id' && filter.value !== SESSION.owner_user_id,
  )
    ? { data: null }
    : { data: SESSION }
}

describe('Account-owned Rooms', () => {
  beforeEach(() => {
    currentStub = createSupabaseStub(ownerSession)
  })

  it('creates the Room under the immutable Auth user ID and keeps controller secrets out of URLs', async () => {
    currentStub = createSupabaseStub((op) => {
      if (op.table === 'sessions' && op.method === 'select') return { data: null }
      if (op.table === 'sessions' && op.method === 'insert') return { data: SESSION }
      return { data: null }
    })

    const result = await createSession('https://monitor.example', ACCOUNT)

    const roomInsert = currentStub.opsFor('sessions').find((op) => op.method === 'insert')
    const controllerInsert = currentStub.opsFor('session_controllers').find((op) => op.method === 'insert')
    expect(roomInsert?.payload).toMatchObject({
      owner_user_id: ACCOUNT.user_id,
      status: 'waiting',
      active_attempt_version: 1,
    })
    expect(controllerInsert?.payload).toMatchObject({ session_id: SESSION.id })
    expect(controllerInsert?.payload?.token_hash).toBe(hashSessionToken(result.controllerToken))
    expect(result.instructorUrl).toBe('https://monitor.example/session/ABC234/instructor')
    expect(result.instructorUrl).not.toContain(result.controllerToken)
  })

  it('returns the live Room choice instead of creating a second Room for one Account', async () => {
    currentStub = createSupabaseStub((op) =>
      op.table === 'sessions' ? { data: SESSION } : { data: null },
    )

    await expect(createSession('https://monitor.example', ACCOUNT)).rejects.toMatchObject({
      status: 409,
      details: { existingRoom: { code: 'ABC234', status: 'active' } },
    })
    expect(currentStub.opsFor('sessions').filter((op) => op.method === 'insert')).toHaveLength(0)
  })

  it('scopes owner observation through the authenticated client and hides another Account Room', async () => {
    await expect(verifyRoomOwner('ABC234', OTHER_ACCOUNT)).rejects.toMatchObject({ status: 404 })

    const lookup = currentStub.opsFor('sessions')[0]
    expect(lookup.filters).toEqual(expect.arrayContaining([
      { op: 'eq', column: 'code', value: 'ABC234' },
      { op: 'eq', column: 'owner_user_id', value: OTHER_ACCOUNT.user_id },
    ]))
  })

  it('rotates takeover access so the previous controller fails immediately', async () => {
    let controllerHash = hashSessionToken('old-controller')
    currentStub = createSupabaseStub((op) => {
      if (op.table === 'sessions') return ownerSession(op)
      if (op.table === 'session_controllers' && op.method === 'select') {
        return op.columns === 'claim_version'
          ? { data: { claim_version: 3 } }
          : { data: { token_hash: controllerHash } }
      }
      if (op.table === 'session_controllers' && op.method === 'upsert') {
        controllerHash = String(op.payload?.token_hash)
        return { data: null }
      }
      return { data: null }
    })

    const claimed = await claimRoomControl('ABC234', ACCOUNT)

    await expect(verifyRoomController('ABC234', ACCOUNT, 'old-controller'))
      .rejects.toMatchObject({ status: 409 })
    await expect(verifyRoomController('ABC234', ACCOUNT, claimed.controllerToken))
      .resolves.toMatchObject({ id: SESSION.id })
    const write = currentStub.opsFor('session_controllers').find((op) => op.method === 'upsert')
    expect(write?.payload?.claim_version).toBe(4)
  })

  it('allows the owner to observe without control while keeping mutations fenced', async () => {
    currentStub = createSupabaseStub((op) => {
      if (op.table === 'sessions') return ownerSession(op)
      if (op.table === 'session_controllers') {
        return { data: { token_hash: hashSessionToken('controller-secret') } }
      }
      return { data: null }
    })

    await expect(getRoomAccess('ABC234', ACCOUNT, '')).resolves.toMatchObject({
      session: { id: SESSION.id },
      canControl: false,
    })
    await expect(verifyRoomController('ABC234', ACCOUNT, 'wrong-secret'))
      .rejects.toMatchObject({ status: 409 })
  })
})
