import { describe, expect, it, vi } from 'vitest'

import { getMonitorProjectionForHost } from '@/server/sessions/service'

import { GET } from '../route'

vi.mock('@/server/sessions/service', () => ({
  getMonitorProjectionForHost: vi.fn(),
}))

describe('GET /api/session/[code]/spectate/[participantId]', () => {
  it('authorizes with the host token and scopes the student to the room', async () => {
    vi.mocked(getMonitorProjectionForHost).mockResolvedValue({
      session: { status: 'active' },
      participant: { nickname: 'Alice' },
      projection: null,
    } as never)

    const response = await GET(
      new Request('http://localhost/api/session/ABC123/spectate/student-1', {
        headers: { 'x-session-host-token': 'host-token' },
      }),
      { params: Promise.resolve({ code: 'ABC123', participantId: 'student-1' }) },
    )

    expect(response.status).toBe(200)
    expect(getMonitorProjectionForHost).toHaveBeenCalledWith(
      'ABC123',
      'host-token',
      'student-1',
    )
  })
})
