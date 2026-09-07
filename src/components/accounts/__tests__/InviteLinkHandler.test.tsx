import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

import { InviteLinkHandler } from '@/components/accounts/InviteLinkHandler'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({ createClient: mocks.createClient }))
vi.mock('next/navigation', () => ({
  useRouter: () => mocks,
}))

describe('InviteLinkHandler', () => {
  const auth = {
    getSession: vi.fn(),
    getUser: vi.fn(),
    setSession: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/auth/invite')
    mocks.createClient.mockReturnValue({ auth })
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null })
    auth.setSession.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null })
    auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', invited_at: '2026-09-05T17:00:00Z' } },
      error: null,
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('converts an implicit invitation fragment into a persisted session', async () => {
    window.history.replaceState(
      null,
      '',
      '/auth/invite?source=email#access_token=test-access-token&refresh_token=test-refresh-token&type=invite',
    )
    const replaceState = vi.spyOn(window.history, 'replaceState')

    render(<InviteLinkHandler />)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/instructor/accept-invite')
    })
    expect(auth.setSession).toHaveBeenCalledWith({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
    })
    expect(auth.getSession).not.toHaveBeenCalled()
    expect(auth.getUser).toHaveBeenCalledOnce()
    expect(window.location.pathname + window.location.search + window.location.hash)
      .toBe('/auth/invite?source=email')
    expect(replaceState.mock.invocationCallOrder[0])
      .toBeLessThan(auth.setSession.mock.invocationCallOrder[0])
  })

  it('uses an existing cookie session when the invitation fragment was already consumed', async () => {
    render(<InviteLinkHandler />)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/instructor/accept-invite')
    })
    expect(auth.setSession).not.toHaveBeenCalled()
    expect(auth.getSession).toHaveBeenCalledOnce()
    expect(auth.getUser).toHaveBeenCalledOnce()
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it.each([
    '#access_token=only-one-token&type=invite',
    '#error=access_denied&error_code=otp_expired&type=invite',
  ])('clears and rejects an invalid invitation fragment: %s', async (hash) => {
    window.history.replaceState(null, '', `/auth/invite${hash}`)

    render(<InviteLinkHandler />)

    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has expired')
    expect(window.location.hash).toBe('')
    expect(auth.setSession).not.toHaveBeenCalled()
    expect(auth.getSession).not.toHaveBeenCalled()
    expect(auth.getUser).not.toHaveBeenCalled()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('shows a generic failure for an expired cookie session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    render(<InviteLinkHandler />)

    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has expired')
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('rejects a signed-in identity that was not invited', async () => {
    auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', invited_at: null } },
      error: null,
    })

    render(<InviteLinkHandler />)

    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has expired')
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('shows a generic failure if session persistence throws', async () => {
    window.history.replaceState(
      null,
      '',
      '/auth/invite#access_token=test-access-token&refresh_token=test-refresh-token&type=invite',
    )
    auth.setSession.mockRejectedValue(new Error('provider unavailable'))

    render(<InviteLinkHandler />)

    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has expired')
    expect(window.location.hash).toBe('')
    expect(mocks.replace).not.toHaveBeenCalled()
  })
})
