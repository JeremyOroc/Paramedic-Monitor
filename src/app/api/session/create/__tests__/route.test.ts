import { beforeEach, describe, expect, it, vi } from 'vitest'

const account = vi.hoisted(() => ({ user_id: 'account-id' }))

vi.mock('@/server/sessions/access', () => ({
  requireRoomAccount: vi.fn(async () => account),
}))

vi.mock('@/server/sessions/service', () => ({
  createSession: vi.fn(),
}))

import { createSession } from '@/server/sessions/service'
import { POST } from '../route'

describe('POST /api/session/create', () => {
  beforeEach(() => vi.mocked(createSession).mockReset())

  it('creates a Room for the authenticated Account and returns a clean instructor URL', async () => {
    vi.mocked(createSession).mockResolvedValue({
      session: { code: 'ABC123' },
      controllerToken: 'controller-secret',
      instructorUrl: 'https://monitor.example/session/ABC123/instructor',
    } as Awaited<ReturnType<typeof createSession>>)

    const response = await POST(new Request('https://monitor.example/api/session/create', {
      method: 'POST',
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(createSession).toHaveBeenCalledWith('https://monitor.example', account)
    expect(body.instructorUrl).not.toContain('controller')
    expect(body.controllerToken).toBe('controller-secret')
  })
})
