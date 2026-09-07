import { beforeEach, describe, expect, it, vi } from 'vitest'

const getCurrentAccount = vi.hoisted(() => vi.fn())

vi.mock('@/server/accounts/service', () => ({ getCurrentAccount }))

import { requireRoomAccount } from '../access'

describe('Room Account access boundary', () => {
  beforeEach(() => getCurrentAccount.mockReset())

  it('returns the verified enabled Account', async () => {
    const account = {
      user_id: 'user-1',
      username: 'Instructor.One',
      email: 'one@example.test',
      role: 'instructor',
      status: 'enabled',
    }
    getCurrentAccount.mockResolvedValue(account)

    await expect(requireRoomAccount()).resolves.toBe(account)
  })

  it('rejects callers without a live enabled Account', async () => {
    getCurrentAccount.mockResolvedValue(null)

    await expect(requireRoomAccount()).rejects.toMatchObject({
      status: 401,
      message: 'Sign in to access this room',
    })
  })
})
