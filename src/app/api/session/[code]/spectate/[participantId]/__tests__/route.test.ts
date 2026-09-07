import { describe, expect, it, vi } from 'vitest'

import { getMonitorProjectionForOwner } from '@/server/sessions/service'

import { GET } from '../route'

const account = vi.hoisted(() => ({ user_id: 'account-id' }))

vi.mock('@/server/sessions/access', () => ({
  requireRoomAccount: vi.fn(async () => account),
}))

vi.mock('@/server/sessions/service', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/server/sessions/service')>(),
  getMonitorProjectionForOwner: vi.fn(),
}))

describe('GET /api/session/[code]/spectate/[participantId]', () => {
  it('authorizes with the live owner Account and scopes the student to the room', async () => {
    vi.mocked(getMonitorProjectionForOwner).mockResolvedValue({
      session: { status: 'active' },
      participant: { nickname: 'Alice' },
      projection: null,
    } as never)

    const response = await GET(
      new Request('http://localhost/api/session/ABC123/spectate/student-1'),
      { params: Promise.resolve({ code: 'ABC123', participantId: 'student-1' }) },
    )

    expect(response.status).toBe(200)
    expect(getMonitorProjectionForOwner).toHaveBeenCalledWith(
      'ABC123',
      account,
      'student-1',
    )
  })
})
