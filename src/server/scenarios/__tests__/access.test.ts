import { beforeEach, describe, expect, it, vi } from 'vitest'

const getCurrentAccount = vi.hoisted(() => vi.fn())

vi.mock('@/server/accounts/service', () => ({ getCurrentAccount }))

import { requireScenarioLibraryAccess } from '../access'

const request = new Request('http://localhost/api/scenario-folders')

describe('scenario library access boundary', () => {
  beforeEach(() => getCurrentAccount.mockReset())

  it('returns the verified enabled Account to the route', async () => {
    const account = {
      user_id: 'user-1',
      username: 'Instructor.One',
      email: 'one@example.test',
      role: 'instructor',
      status: 'enabled',
    }
    getCurrentAccount.mockResolvedValue(account)

    await expect(requireScenarioLibraryAccess(request)).resolves.toBe(account)
  })

  it('rejects callers without a live enabled Account', async () => {
    getCurrentAccount.mockResolvedValue(null)

    await expect(requireScenarioLibraryAccess(request)).rejects.toMatchObject({
      status: 401,
      message: 'Sign in to access scenarios',
    })
  })
})
