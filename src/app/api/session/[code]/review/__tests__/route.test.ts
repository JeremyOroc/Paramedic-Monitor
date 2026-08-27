import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/sessions/http', () => ({
  hostTokenFromRequest: vi.fn(() => 'host_token'),
  jsonError: vi.fn((error: Error & { status?: number }) =>
    Response.json({ error: error.message }, { status: error.status ?? 500 }),
  ),
}))

vi.mock('@/server/sessions/service', () => ({
  getReview: vi.fn(),
}))

import { getReview } from '@/server/sessions/service'

import { GET } from '../route'

const CODE = 'ABC234'

function request(query = '') {
  return new Request(`http://localhost/api/session/${CODE}/review${query}`)
}

const context = { params: Promise.resolve({ code: CODE }) }

describe('GET /api/session/[code]/review', () => {
  beforeEach(() => {
    vi.mocked(getReview).mockReset()
    vi.mocked(getReview).mockResolvedValue({
      events: [],
    } as unknown as Awaited<ReturnType<typeof getReview>>)
  })

  it('defaults to the active attempt when no attempt is requested', async () => {
    await GET(request(), context)

    expect(getReview).toHaveBeenCalledWith(CODE, 'host_token', -1)
  })

  it('passes an explicitly requested attempt through', async () => {
    await GET(request('?attempt=2'), context)

    expect(getReview).toHaveBeenCalledWith(CODE, 'host_token', 2)
  })

  it('supports a whole-session export', async () => {
    await GET(request('?attempt=all'), context)

    expect(getReview).toHaveBeenCalledWith(CODE, 'host_token', 'all')
  })

  it('falls back to the active attempt on an unparseable value', async () => {
    // A junk query string must not silently widen the review to every attempt.
    await GET(request('?attempt=banana'), context)

    expect(getReview).toHaveBeenCalledWith(CODE, 'host_token', -1)
  })

  it('reports service failures with their status', async () => {
    vi.mocked(getReview).mockRejectedValue(
      Object.assign(new Error('Invalid host token'), { status: 403 }),
    )

    const response = await GET(request(), context)

    expect(response.status).toBe(403)
  })
})
