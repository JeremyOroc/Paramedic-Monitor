import { beforeEach, describe, expect, it, vi } from 'vitest'

const account = vi.hoisted(() => ({ user_id: 'account-id' }))

vi.mock('@/server/sessions/access', () => ({ requireRoomAccount: vi.fn(async () => account) }))
vi.mock('@/server/sessions/http', () => ({
  controllerTokenFromRequest: vi.fn(() => 'controller-token'),
  jsonError: vi.fn((error: Error & { status?: number }) =>
    Response.json({ error: error.message }, { status: error.status ?? 500 })),
}))
vi.mock('@/server/sessions/service', () => ({ saveAttemptGeneralNotes: vi.fn() }))

import { saveAttemptGeneralNotes } from '@/server/sessions/service'
import { PATCH } from '../route'

const context = { params: Promise.resolve({ code: 'ABC234' }) }
const request = (body: unknown) => new Request('http://localhost/api/session/ABC234/attempt-notes', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

describe('PATCH /api/session/[code]/attempt-notes', () => {
  beforeEach(() => {
    vi.mocked(saveAttemptGeneralNotes).mockReset()
    vi.mocked(saveAttemptGeneralNotes).mockResolvedValue({ attempt_version: 3, general_notes: 'Airway reassessed' })
  })

  it('saves General Notes through the controlling Room service', async () => {
    const response = await PATCH(request({ generalNotes: 'Airway reassessed' }), context)
    expect(saveAttemptGeneralNotes).toHaveBeenCalledWith(
      'ABC234', account, 'controller-token', 'Airway reassessed',
    )
    expect(await response.json()).toEqual({
      attemptNotes: { attempt_version: 3, general_notes: 'Airway reassessed' },
    })
  })

  it('rejects a non-text value before calling the service', async () => {
    const response = await PATCH(request({ generalNotes: 42 }), context)
    expect(response.status).toBe(400)
    expect(saveAttemptGeneralNotes).not.toHaveBeenCalled()
  })
})
