import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getSessionStatus } from '@/server/sessions/service'

import { GET } from '../route'

vi.mock('@/server/sessions/service', () => ({
  getSessionStatus: vi.fn(),
  updateSessionState: vi.fn(),
}))

describe('GET /api/session/[code]/state', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-25T16:30:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('adds the current server clock without changing the session-state payload', async () => {
    vi.mocked(getSessionStatus).mockResolvedValue({
      session: { id: 'session-1', code: 'ABC123', created_at: '2026-08-25T16:00:00.000Z' },
      state: {
        state: { confirmed: { rhythm: 'vf' } },
        version: 4,
        updated_at: '2026-08-25T16:29:58.000Z',
      },
    } as Awaited<ReturnType<typeof getSessionStatus>>)

    const response = await GET(
      new Request('http://localhost/api/session/ABC123/state'),
      { params: Promise.resolve({ code: 'ABC123' }) },
    )
    const body = await response.json()

    expect(body.serverReceivedAt).toBe(Date.now())
    expect(body.serverNow).toBe(Date.now())
    expect(body.state).toMatchObject({ version: 4, updated_at: '2026-08-25T16:29:58.000Z' })
  })
})
