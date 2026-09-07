import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { InviteLinkHandler } from '@/components/accounts/InviteLinkHandler'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({ createClient: mocks.createClient }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}))

describe('InviteLinkHandler', () => {
  const auth = {
    getSession: vi.fn(),
    getUser: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createClient.mockReturnValue({ auth })
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null })
    auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', invited_at: '2026-09-05T17:00:00Z' } },
      error: null,
    })
  })

  it('validates the browser invitation session before opening account setup', async () => {
    render(<InviteLinkHandler />)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/instructor/accept-invite')
    })
    expect(auth.getUser).toHaveBeenCalledOnce()
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it('shows a generic failure for an expired or non-invitation session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    render(<InviteLinkHandler />)

    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has expired')
    expect(mocks.replace).not.toHaveBeenCalled()
  })
})
