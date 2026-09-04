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
    expect(getSessionStatus).toHaveBeenCalledWith('ABC123', '', null)
  })

  it('passes the version the monitor holds through as ?since= (PLAN 14a)', async () => {
    vi.mocked(getSessionStatus).mockResolvedValue({
      session: { id: 'session-1', code: 'ABC123', created_at: '2026-08-25T16:00:00.000Z' },
      state: null,
      unchanged: true,
      version: 4,
    } as Awaited<ReturnType<typeof getSessionStatus>>)

    const response = await GET(
      new Request('http://localhost/api/session/ABC123/state?since=4'),
      { params: Promise.resolve({ code: 'ABC123' }) },
    )
    const body = await response.json()

    expect(getSessionStatus).toHaveBeenCalledWith('ABC123', '', 4)
    expect(body.unchanged).toBe(true)
    // The clock still travels on an unchanged answer; the queue needs it.
    expect(body.serverReceivedAt).toBe(Date.now())
  })

  it('ignores a since it cannot use rather than failing the poll', async () => {
    vi.mocked(getSessionStatus).mockClear()
    vi.mocked(getSessionStatus).mockResolvedValue({
      session: { id: 'session-1', code: 'ABC123', created_at: '2026-08-25T16:00:00.000Z' },
      state: null,
      unchanged: false,
    } as Awaited<ReturnType<typeof getSessionStatus>>)

    await GET(new Request('http://localhost/api/session/ABC123/state?since=banana'), {
      params: Promise.resolve({ code: 'ABC123' }),
    })
    await GET(new Request('http://localhost/api/session/ABC123/state?since=0'), {
      params: Promise.resolve({ code: 'ABC123' }),
    })

    expect(getSessionStatus).toHaveBeenNthCalledWith(1, 'ABC123', '', null)
    expect(getSessionStatus).toHaveBeenNthCalledWith(2, 'ABC123', '', null)
  })
})
