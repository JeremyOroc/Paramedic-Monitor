import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/sessions/http', () => ({
  hostTokenFromRequest: vi.fn(() => 'host_token'),
  jsonError: vi.fn((error: Error & { status?: number }) =>
    Response.json({ error: error.message }, { status: error.status ?? 500 }),
  ),
}))

vi.mock('@/server/sessions/service', () => ({
  renameAttempt: vi.fn(),
}))

import { renameAttempt } from '@/server/sessions/service'

import { PATCH } from '../route'

const CODE = 'ABC234'
const context = (version: string) => ({ params: Promise.resolve({ code: CODE, version }) })
const request = (body: unknown) =>
  new Request(`http://localhost/api/session/${CODE}/attempt/2`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('PATCH /api/session/[code]/attempt/[version]', () => {
  beforeEach(() => {
    vi.mocked(renameAttempt).mockReset()
    vi.mocked(renameAttempt).mockResolvedValue({ attempt_version: 2, label: 'Morning cohort' })
  })

  it('renames the attempt named in the path', async () => {
    const response = await PATCH(request({ label: 'Morning cohort' }), context('2'))

    expect(renameAttempt).toHaveBeenCalledWith(CODE, 'host_token', 2, 'Morning cohort')
    expect(await response.json()).toEqual({ attempt: { attempt_version: 2, label: 'Morning cohort' } })
  })

  it('treats a missing or non-string label as clearing the name', async () => {
    await PATCH(request({}), context('2'))
    await PATCH(request({ label: 42 }), context('2'))

    expect(renameAttempt).toHaveBeenNthCalledWith(1, CODE, 'host_token', 2, '')
    expect(renameAttempt).toHaveBeenNthCalledWith(2, CODE, 'host_token', 2, '')
  })

  it('surfaces a rejected version as its status', async () => {
    vi.mocked(renameAttempt).mockRejectedValue(
      Object.assign(new Error('No attempt 9 in this room'), { status: 400 }),
    )

    const response = await PATCH(request({ label: 'x' }), context('9'))

    expect(response.status).toBe(400)
  })
})
