import { beforeEach, describe, expect, it, vi } from 'vitest'

const account = vi.hoisted(() => ({ user_id: 'account-id' }))

vi.mock('@/server/sessions/access', () => ({ requireRoomAccount: vi.fn(async () => account) }))
vi.mock('@/server/sessions/http', () => ({
  controllerTokenFromRequest: vi.fn(() => 'controller-token'),
  jsonError: vi.fn((error: Error & { status?: number }) =>
    Response.json({ error: error.message }, { status: error.status ?? 500 })),
}))
vi.mock('@/server/sessions/service', () => ({ recordInstructorNote: vi.fn() }))

import { recordInstructorNote } from '@/server/sessions/service'
import { POST } from '../route'

const context = { params: Promise.resolve({ code: 'ABC234' }) }
const request = (body: unknown) => new Request('http://localhost/api/session/ABC234/instructor-notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

describe('POST /api/session/[code]/instructor-notes', () => {
  beforeEach(() => {
    vi.mocked(recordInstructorNote).mockReset()
    vi.mocked(recordInstructorNote).mockResolvedValue({
      id: 'note-1',
      session_id: 'session-1',
      attempt_version: 3,
      body: 'Tourniquet reassessed',
      occurred_at: '2026-09-23T20:00:00.000Z',
    })
  })

  it('appends a Report Note through the controlling Room service', async () => {
    const response = await POST(request({ body: 'Tourniquet reassessed' }), context)
    expect(recordInstructorNote).toHaveBeenCalledWith(
      'ABC234', account, 'controller-token', 'Tourniquet reassessed',
    )
    expect((await response.json()).instructorNote.body).toBe('Tourniquet reassessed')
  })

  it('rejects a non-text body before calling the service', async () => {
    const response = await POST(request({ body: null }), context)
    expect(response.status).toBe(400)
    expect(recordInstructorNote).not.toHaveBeenCalled()
  })
})
