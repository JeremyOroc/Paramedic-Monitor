import { beforeEach, describe, expect, it, vi } from 'vitest'

const account = vi.hoisted(() => ({ user_id: 'account-id' }))

vi.mock('@/server/sessions/access', () => ({
  requireRoomAccount: vi.fn(async () => account),
}))

vi.mock('@/server/sessions/http', () => ({
  controllerTokenFromRequest: vi.fn(() => 'controller-secret'),
  jsonError: vi.fn((error: Error & { status?: number }) =>
    Response.json({ error: error.message }, { status: error.status ?? 500 }),
  ),
}))

vi.mock('@/server/sessions/service', () => ({
  startSession: vi.fn(),
}))

import { startSession } from '@/server/sessions/service'
import { POST } from '../route'

describe('POST /api/session/[code]/start', () => {
  beforeEach(() => vi.mocked(startSession).mockReset())

  it('requires both Account ownership and this browser controller token', async () => {
    vi.mocked(startSession).mockResolvedValue({ status: 'active' } as Awaited<ReturnType<typeof startSession>>)

    const response = await POST(new Request('http://localhost/api/session/ABC123/start', {
      method: 'POST',
    }), { params: Promise.resolve({ code: 'ABC123' }) })

    expect(response.status).toBe(200)
    expect(startSession).toHaveBeenCalledWith('ABC123', account, 'controller-secret')
  })
})
