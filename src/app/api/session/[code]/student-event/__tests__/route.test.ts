import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/sessions/http', () => ({
  participantTokenFromRequest: vi.fn(() => 'participant_token'),
  jsonError: vi.fn((error: Error & { status?: number }) =>
    Response.json({ error: error.message }, { status: error.status ?? 500 }),
  ),
}))

vi.mock('@/server/sessions/service', () => ({
  recordStudentEvent: vi.fn(),
}))

import { recordStudentEvent } from '@/server/sessions/service'

import { POST } from '../route'

const CODE = 'ABC234'
const context = { params: Promise.resolve({ code: CODE }) }

function request(body: unknown) {
  return new Request(`http://localhost/api/session/${CODE}/student-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/session/[code]/student-event', () => {
  beforeEach(() => {
    vi.mocked(recordStudentEvent).mockReset()
    vi.mocked(recordStudentEvent).mockResolvedValue({
      event: { id: 'e' },
    } as unknown as Awaited<ReturnType<typeof recordStudentEvent>>)
  })

  it('passes the trainee clock and claimed version through (PLAN 14b-14d)', async () => {
    await POST(
      request({
        kind: 'shock',
        label: 'Shock',
        payload: { joules: 200 },
        stateVersion: 5,
        occurredAtClient: '2026-09-03T10:00:00.000Z',
        captureSequence: 3,
        clockOffsetMs: 42,
      }),
      context,
    )

    expect(recordStudentEvent).toHaveBeenCalledWith(CODE, 'participant_token', {
      kind: 'shock',
      label: 'Shock',
      payload: { joules: 200 },
      stateVersion: 5,
      occurredAtClient: '2026-09-03T10:00:00.000Z',
      captureSequence: 3,
      clockOffsetMs: 42,
    })
  })

  it('still records an action from a client that sends none of the new fields', async () => {
    await POST(request({ kind: 'power_on', label: 'Power On' }), context)

    expect(recordStudentEvent).toHaveBeenCalledWith(
      CODE,
      'participant_token',
      expect.objectContaining({ kind: 'power_on', label: 'Power On', stateVersion: undefined }),
    )
  })

  it('surfaces a rejected claim as the 400 the queue drops on', async () => {
    vi.mocked(recordStudentEvent).mockRejectedValue(
      Object.assign(new Error('State version 9 is ahead of the room'), { status: 400 }),
    )

    const response = await POST(request({ kind: 'shock', label: 'Shock', stateVersion: 9 }), context)

    expect(response.status).toBe(400)
  })
})
