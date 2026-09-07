import { beforeEach, describe, expect, it, vi } from 'vitest'

const account = vi.hoisted(() => ({ user_id: 'account-id' }))

vi.mock('@/server/sessions/access', () => ({
  requireRoomAccount: vi.fn(async () => account),
}))

vi.mock('@/server/sessions/http', () => ({
  controllerTokenFromRequest: vi.fn(() => 'controller_token'),
  jsonError: vi.fn((error: Error & { status?: number }) =>
    Response.json({ error: error.message }, { status: error.status ?? 500 }),
  ),
}))

vi.mock('@/server/sessions/service', () => ({
  startNewAttempt: vi.fn(),
}))

import { startNewAttempt } from '@/server/sessions/service'

import { POST } from '../route'

describe('POST /api/session/[code]/attempt', () => {
  beforeEach(() => {
    vi.mocked(startNewAttempt).mockReset()
  })

  it('starts a new attempt using the live Account and controller token', async () => {
    vi.mocked(startNewAttempt).mockResolvedValue({
      id: 'session-id',
      code: 'ABC123',
      owner_user_id: account.user_id,
      status: 'active',
      active_attempt_version: 2,
      created_at: '2026-07-04T00:00:00.000Z',
      expires_at: null,
    })

    const response = await POST(
      new Request('http://localhost/api/session/ABC123/attempt'),
      { params: Promise.resolve({ code: 'ABC123' }) },
    )

    await expect(response.json()).resolves.toEqual({
      session: {
        id: 'session-id',
        code: 'ABC123',
        owner_user_id: account.user_id,
        status: 'active',
        active_attempt_version: 2,
        created_at: '2026-07-04T00:00:00.000Z',
        expires_at: null,
      },
    })
    expect(startNewAttempt).toHaveBeenCalledWith('ABC123', account, 'controller_token')
  })
})
