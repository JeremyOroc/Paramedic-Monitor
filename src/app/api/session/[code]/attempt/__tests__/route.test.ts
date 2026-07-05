import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/sessions/service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/sessions/service')>()),
  startNewAttempt: vi.fn(),
}))

import { startNewAttempt } from '@/server/sessions/service'

import { POST } from '../route'

describe('POST /api/session/[code]/attempt', () => {
  beforeEach(() => {
    vi.mocked(startNewAttempt).mockReset()
  })

  it('starts a new attempt using the host token from the request', async () => {
    vi.mocked(startNewAttempt).mockResolvedValue({
      id: 'session-id',
      code: 'ABC123',
      status: 'active',
      active_attempt_version: 2,
      created_at: '2026-07-04T00:00:00.000Z',
      expires_at: null,
    })

    const response = await POST(
      new Request('http://localhost/api/session/ABC123/attempt', {
        headers: { 'x-session-host-token': 'host_token' },
      }),
      { params: Promise.resolve({ code: 'ABC123' }) },
    )

    await expect(response.json()).resolves.toEqual({
      session: {
        id: 'session-id',
        code: 'ABC123',
        status: 'active',
        active_attempt_version: 2,
        created_at: '2026-07-04T00:00:00.000Z',
        expires_at: null,
      },
    })
    expect(startNewAttempt).toHaveBeenCalledWith('ABC123', 'host_token')
  })
})
