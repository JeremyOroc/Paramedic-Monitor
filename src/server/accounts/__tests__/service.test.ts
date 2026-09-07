import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAuthenticatedClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => mocks)

import {
  acceptAccountInvitation,
  getCurrentAccount,
  getInviteSetup,
  requestPasswordRecovery,
  signInAccount,
  signOutAccount,
  updateAccountPassword,
} from '@/server/accounts/service'

const INVITED_USER = {
  id: 'user-1',
  email: 'medic@example.ca',
  email_confirmed_at: '2026-09-05T18:00:00Z',
  invited_at: '2026-09-05T17:00:00Z',
}

function queryResult(data: unknown, error: unknown = null) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  return builder
}

function clients(options: {
  profile?: unknown
  reserved?: unknown
  profileError?: unknown
  reservedError?: unknown
  insertError?: { code: string } | null
  authUser?: unknown
  currentUser?: unknown
  currentUserError?: unknown
  updateUserError?: { code?: string; message?: string } | null
} = {}) {
  const profileQuery = queryResult(options.profile ?? null, options.profileError ?? null)
  const reservedQuery = queryResult(options.reserved ?? null, options.reservedError ?? null)
  const insert = vi.fn().mockResolvedValue({ error: options.insertError ?? null })
  const accountProfiles = { ...profileQuery, insert }
  const service = {
    from: vi.fn((table: string) => (
      table === 'reserved_account_usernames' ? reservedQuery : accountProfiles
    )),
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user: options.authUser }, error: null }),
      },
    },
  }
  const auth = {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' }, session: { access_token: 'token' } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.currentUser ?? null },
        error: options.currentUserError ?? null,
      }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: options.updateUserError ?? null }),
    },
  }
  mocks.createServiceClient.mockReturnValue(service)
  mocks.createAuthenticatedClient.mockResolvedValue(auth)
  return { auth, insert, service }
}

describe('account service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('finishes a verified invitation with a password and fixed Instructor profile', async () => {
    const { auth, insert } = clients({ currentUser: INVITED_USER })

    await expect(acceptAccountInvitation({ username: 'Medic.One', password: 'password' }))
      .resolves.toEqual({ username: 'Medic.One', role: 'instructor' })

    expect(auth.auth.updateUser).toHaveBeenCalledWith({ password: 'password' })
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      username: 'Medic.One',
      role: 'instructor',
      status: 'enabled',
    })
  })

  it('exposes setup only for a verified Supabase-invited identity', async () => {
    clients({ currentUser: INVITED_USER })
    await expect(getInviteSetup()).resolves.toEqual({
      email: 'medic@example.ca',
      username: null,
      role: null,
    })

    clients({ currentUser: { ...INVITED_USER, invited_at: undefined } })
    await expect(getInviteSetup()).resolves.toBeNull()
    await expect(acceptAccountInvitation({ username: 'Medic', password: 'password' }))
      .rejects.toMatchObject({ code: 'invalid_invitation', status: 401 })
  })

  it('rejects an occupied or reserved username before changing the password', async () => {
    const { auth } = clients({ currentUser: INVITED_USER, reserved: { username: 'Jeremy' } })
    await expect(acceptAccountInvitation({ username: 'jeremy', password: 'password' }))
      .rejects.toMatchObject({ code: 'username_taken', status: 409 })
    expect(auth.auth.updateUser).not.toHaveBeenCalled()
  })

  it('keeps a database-race loser outside product areas with a retryable username error', async () => {
    const { auth } = clients({ currentUser: INVITED_USER, insertError: { code: '23505' } })
    await expect(acceptAccountInvitation({ username: 'Medic', password: 'password' }))
      .rejects.toMatchObject({ code: 'username_taken', status: 409 })
    expect(auth.auth.updateUser).toHaveBeenCalledWith({ password: 'password' })
  })

  it('surfaces provider password rejection without creating a profile', async () => {
    const { insert } = clients({
      currentUser: INVITED_USER,
      updateUserError: { code: 'weak_password', message: 'Password is compromised.' },
    })
    await expect(acceptAccountInvitation({ username: 'Medic', password: 'password' }))
      .rejects.toMatchObject({ field: 'password' })
    expect(insert).not.toHaveBeenCalled()
  })

  it('preserves a manually provisioned Administrator profile while setting its password', async () => {
    const profile = {
      user_id: 'user-1', username: 'Jeremy', role: 'administrator', status: 'enabled',
    }
    const { auth, insert } = clients({ currentUser: INVITED_USER, profile })

    await expect(acceptAccountInvitation({ password: 'password' })).resolves.toEqual({
      username: 'Jeremy', role: 'administrator',
    })
    expect(auth.auth.updateUser).toHaveBeenCalledWith({ password: 'password' })
    expect(insert).not.toHaveBeenCalled()
  })

  it('blocks a disabled profile during invitation acceptance and normal sign-in', async () => {
    const profile = {
      user_id: 'user-1', username: 'Medic', role: 'instructor', status: 'disabled',
    }
    const { auth } = clients({ currentUser: INVITED_USER, profile })
    await expect(acceptAccountInvitation({ password: 'password' }))
      .rejects.toMatchObject({ code: 'disabled', status: 403 })
    await expect(signInAccount({ username: 'Medic', password: 'password' }))
      .rejects.toMatchObject({ code: 'disabled', status: 403 })
    expect(auth.auth.updateUser).not.toHaveBeenCalled()
    expect(auth.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('uses the same invalid-credentials result for an unknown username', async () => {
    clients()
    await expect(signInAccount({ username: 'Unknown', password: 'password' }))
      .rejects.toMatchObject({
        code: 'invalid_credentials',
        message: 'Invalid username or password.',
        status: 401,
      })
  })

  it('signs in a verified account through its server-only email mapping', async () => {
    const { auth } = clients({
      profile: { user_id: 'user-1', username: 'Medic', role: 'instructor', status: 'enabled' },
      authUser: { id: 'user-1', email: 'medic@example.ca', email_confirmed_at: '2026-09-04' },
    })
    await expect(signInAccount({ username: 'Medic', password: 'password' })).resolves.toEqual({
      username: 'Medic', role: 'instructor',
    })
    expect(auth.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'medic@example.ca', password: 'password',
    })
  })

  it('rejects an unaccepted invited identity without testing its password', async () => {
    const { auth } = clients({
      profile: { user_id: 'user-1', username: 'Medic', role: 'instructor', status: 'enabled' },
      authUser: { id: 'user-1', email: 'medic@example.ca', email_confirmed_at: null },
    })
    await expect(signInAccount({ username: 'Medic', password: 'password' }))
      .rejects.toMatchObject({ code: 'unverified' })
    expect(auth.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('keeps recovery responses generic while invoking Supabase', async () => {
    const { auth } = clients()
    await expect(requestPasswordRecovery({ email: 'medic@example.ca' }, 'https://monitor.example'))
      .resolves.toMatchObject({ message: expect.stringContaining('If an account') })
    expect(auth.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'medic@example.ca',
      { redirectTo: 'https://monitor.example/auth/callback?next=%2Finstructor%2Freset-password' },
    )
  })

  it('checks the live profile before returning the current account', async () => {
    clients({
      currentUser: { id: 'user-1', email: 'medic@example.ca', email_confirmed_at: '2026-09-04' },
      profile: { user_id: 'user-1', username: 'Medic', role: 'instructor', status: 'enabled' },
    })
    await expect(getCurrentAccount()).resolves.toEqual({
      user_id: 'user-1',
      username: 'Medic',
      role: 'instructor',
      status: 'enabled',
      email: 'medic@example.ca',
    })
  })

  it('changes the password only for a live enabled account and signs out locally', async () => {
    const { auth } = clients({
      currentUser: { id: 'user-1', email: 'medic@example.ca', email_confirmed_at: '2026-09-04' },
      profile: { user_id: 'user-1', username: 'Medic', role: 'instructor', status: 'enabled' },
    })
    await expect(updateAccountPassword({ password: 'new-password' }))
      .resolves.toEqual({ message: 'Password updated.' })
    expect(auth.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' })
    await signOutAccount()
    expect(auth.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('reports a local sign-out provider failure instead of claiming success', async () => {
    const { auth } = clients()
    auth.auth.signOut.mockResolvedValue({ error: new Error('provider unavailable') })
    await expect(signOutAccount()).rejects.toMatchObject({ code: 'retry', status: 503 })
  })
})
