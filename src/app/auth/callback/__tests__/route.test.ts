import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAuthenticatedClient: vi.fn(),
  profileForAuthUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAuthenticatedClient: mocks.createAuthenticatedClient,
}))
vi.mock('@/server/accounts/service', () => ({ profileForAuthUser: mocks.profileForAuthUser }))

import { GET } from '@/app/auth/callback/route'

describe('Auth callback', () => {
  const auth = {
    auth: {
      exchangeCodeForSession: vi.fn(),
      verifyOtp: vi.fn(),
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createAuthenticatedClient.mockResolvedValue(auth)
    auth.auth.exchangeCodeForSession.mockResolvedValue({ error: null })
    auth.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    auth.auth.signOut.mockResolvedValue({ error: null })
    mocks.profileForAuthUser.mockResolvedValue({ status: 'enabled' })
  })

  it('exchanges the PKCE code and redirects an enabled profile locally', async () => {
    const response = await GET(new Request(
      'https://monitor.example/auth/callback?code=abc&next=%2Finstructor%2Faccount',
    ))
    expect(auth.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc')
    expect(response.headers.get('location')).toBe('https://monitor.example/instructor/account')
  })

  it('prevents open redirects and rejects users without an enabled profile', async () => {
    mocks.profileForAuthUser.mockResolvedValue(null)
    const response = await GET(new Request(
      'https://monitor.example/auth/callback?code=abc&next=https%3A%2F%2Fevil.example',
    ))
    expect(auth.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(response.headers.get('location')).toBe(
      'https://monitor.example/instructor/login?error=verification',
    )
  })

  it('accepts token-hash signup links', async () => {
    auth.auth.verifyOtp.mockResolvedValue({ error: null })
    const response = await GET(new Request(
      'https://monitor.example/auth/callback?token_hash=hash&type=signup',
    ))
    expect(auth.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash', type: 'signup' })
    expect(response.headers.get('location')).toBe('https://monitor.example/instructor')
  })
})
