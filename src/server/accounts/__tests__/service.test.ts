import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAuthenticatedClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => mocks)

import {
  getCurrentAccount,
  registerAccount,
  requestPasswordRecovery,
  resendVerification,
  signInAccount,
  signOutAccount,
  updateAccountPassword,
} from '@/server/accounts/service'

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
  insertError?: { code: string } | null
  deleteError?: unknown
  authUser?: unknown
  currentUser?: unknown
} = {}) {
  const profileQuery = queryResult(options.profile ?? null)
  const reservedQuery = queryResult(options.reserved ?? null)
  const insert = vi.fn().mockResolvedValue({ error: options.insertError ?? null })
  const service = {
    from: vi.fn((table: string) => {
      if (table === 'reserved_account_usernames') return reservedQuery
      return {
        ...profileQuery,
        insert,
      }
    }),
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: options.deleteError ?? null }),
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
        getUserById: vi.fn().mockResolvedValue({ data: { user: options.authUser }, error: null }),
      },
    },
  }
  const auth = {
    auth: {
      signUp: vi.fn().mockResolvedValue({
        data: {
          user: { id: 'user-1', identities: [{ id: 'identity-1' }], email_confirmed_at: null },
          session: null,
        },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' }, session: { access_token: 'token' } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: options.currentUser ?? null }, error: null }),
      resend: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  }
  mocks.createServiceClient.mockReturnValue(service)
  mocks.createAuthenticatedClient.mockResolvedValue(auth)
  return { auth, insert, service }
}

describe('account service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.INSTRUCTOR_REGISTRATION_CODE = 'correct-code'
  })

  it('creates an unverified Auth identity and its Instructor profile', async () => {
    const { auth, insert } = clients()
    await expect(registerAccount({
      username: 'Medic.One',
      email: 'medic@example.ca',
      password: 'password',
      registrationCode: 'correct-code',
    }, 'https://monitor.example')).resolves.toEqual({ username: 'Medic.One' })

    expect(auth.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'medic@example.ca',
      options: { emailRedirectTo: 'https://monitor.example/auth/callback?next=%2Finstructor' },
    }))
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      username: 'Medic.One',
      role: 'instructor',
      status: 'enabled',
    })
  })

  it('rejects an occupied or reserved username before creating an Auth user', async () => {
    const { auth } = clients({ reserved: { username: 'Jeremy' } })
    await expect(registerAccount({
      username: 'jeremy',
      email: 'new@example.ca',
      password: 'password',
      registrationCode: 'correct-code',
    }, 'https://monitor.example')).rejects.toMatchObject({ code: 'username_taken', status: 409 })
    expect(auth.auth.signUp).not.toHaveBeenCalled()
  })

  it('rejects an incorrect registration code before any database access', async () => {
    clients()
    await expect(registerAccount({
      username: 'Medic',
      email: 'medic@example.ca',
      password: 'password',
      registrationCode: 'incorrect',
    }, 'https://monitor.example')).rejects.toMatchObject({ code: 'registration_code', status: 403 })
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
  })

  it('uses a generic response for an existing Auth email', async () => {
    const { auth } = clients()
    auth.auth.signUp.mockResolvedValue({
      data: { user: { id: 'obfuscated', identities: [] }, session: null },
      error: null,
    })
    await expect(registerAccount({
      username: 'Available',
      email: 'existing@example.ca',
      password: 'password',
      registrationCode: 'correct-code',
    }, 'https://monitor.example')).rejects.toMatchObject({
      code: 'email_unavailable',
      message: expect.stringContaining('signing in or resetting'),
    })
  })

  it('reports provider password rejection as a password-field error', async () => {
    const { auth } = clients()
    auth.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'weak_password', message: 'Password is known to be compromised.' },
    })
    await expect(registerAccount({
      username: 'Available',
      email: 'new@example.ca',
      password: 'password',
      registrationCode: 'correct-code',
    }, 'https://monitor.example')).rejects.toMatchObject({ field: 'password' })
  })

  it('quarantines an Auth identity when profile creation and deletion both fail', async () => {
    const { service } = clients({ insertError: { code: 'XX000' }, deleteError: new Error('unavailable') })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(registerAccount({
      username: 'Medic',
      email: 'medic@example.ca',
      password: 'password',
      registrationCode: 'correct-code',
    }, 'https://monitor.example')).rejects.toMatchObject({ code: 'retry', status: 503 })
    expect(service.auth.admin.updateUserById).toHaveBeenCalledWith('user-1', {
      ban_duration: '876000h',
    })
    expect(errorSpy).toHaveBeenCalledWith(
      '[accounts] profile provisioning cleanup failed',
      expect.not.objectContaining({ email: expect.anything(), username: expect.anything() }),
    )
  })

  it('blocks a disabled username before password authentication', async () => {
    const { auth } = clients({
      profile: { user_id: 'user-1', username: 'Medic', role: 'instructor', status: 'disabled' },
    })
    await expect(signInAccount({ username: 'Medic', password: 'password' }))
      .rejects.toMatchObject({ code: 'disabled', status: 403 })
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

  it('directs a pending account to verification without testing its password', async () => {
    const { auth } = clients({
      profile: { user_id: 'user-1', username: 'Medic', role: 'instructor', status: 'enabled' },
      authUser: { id: 'user-1', email: 'medic@example.ca', email_confirmed_at: null },
    })
    await expect(signInAccount({ username: 'Medic', password: 'password' }))
      .rejects.toMatchObject({ code: 'unverified' })
    expect(auth.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('keeps resend and recovery responses generic while invoking Supabase', async () => {
    const { auth } = clients({
      profile: { user_id: 'user-1', username: 'Medic', role: 'instructor', status: 'enabled' },
      authUser: { id: 'user-1', email: 'medic@example.ca', email_confirmed_at: null },
    })
    await expect(resendVerification({ username: 'Medic' }, 'https://monitor.example'))
      .resolves.toMatchObject({ message: expect.stringContaining('If that username') })
    expect(auth.auth.resend).toHaveBeenCalledWith(expect.objectContaining({
      type: 'signup', email: 'medic@example.ca',
    }))
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
