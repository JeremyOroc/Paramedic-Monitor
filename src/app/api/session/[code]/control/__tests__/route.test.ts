import { beforeEach, describe, expect, it, vi } from 'vitest'

const account = vi.hoisted(() => ({ user_id: 'account-id' }))

vi.mock('@/server/sessions/access', () => ({
  requireRoomAccount: vi.fn(async () => account),
}))

vi.mock('@/server/sessions/http', () => ({
  controllerTokenFromRequest: vi.fn(() => 'stored-controller'),
  jsonError: vi.fn((error: Error & { status?: number }) =>
    Response.json({ error: error.message }, { status: error.status ?? 500 }),
  ),
}))

vi.mock('@/server/sessions/service', () => ({
  claimRoomControl: vi.fn(),
  getRoomAccess: vi.fn(),
}))

import { claimRoomControl, getRoomAccess } from '@/server/sessions/service'
import { GET, POST } from '../route'

const context = { params: Promise.resolve({ code: 'ABC123' }) }

describe('/api/session/[code]/control', () => {
  beforeEach(() => {
    vi.mocked(getRoomAccess).mockReset()
    vi.mocked(claimRoomControl).mockReset()
  })

  it('reports whether the authenticated owner browser is the current controller', async () => {
    vi.mocked(getRoomAccess).mockResolvedValue({ canControl: true } as Awaited<ReturnType<typeof getRoomAccess>>)

    const response = await GET(new Request('http://localhost/api/session/ABC123/control'), context)

    expect(response.status).toBe(200)
    expect(getRoomAccess).toHaveBeenCalledWith('ABC123', account, 'stored-controller')
  })

  it('rotates controller access only for the authenticated owner', async () => {
    vi.mocked(claimRoomControl).mockResolvedValue({ controllerToken: 'new-controller' } as Awaited<ReturnType<typeof claimRoomControl>>)

    const response = await POST(new Request('http://localhost/api/session/ABC123/control', {
      method: 'POST',
    }), context)

    await expect(response.json()).resolves.toMatchObject({ controllerToken: 'new-controller' })
    expect(claimRoomControl).toHaveBeenCalledWith('ABC123', account)
  })
})
