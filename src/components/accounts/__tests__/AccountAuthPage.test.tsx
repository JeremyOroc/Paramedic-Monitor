import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AccountAuthPage } from '@/components/accounts/AccountAuthPage'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

describe('AccountAuthPage', () => {
  beforeEach(() => {
    push.mockReset()
    refresh.mockReset()
    vi.restoreAllMocks()
  })

  it('signs in with username and password and has no public registration link', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ username: 'Medic' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    render(<AccountAuthPage mode="login" />)

    expect(screen.getByText(/Accounts are invitation-only/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /create/i })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Username'), 'Medic')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ username: 'Medic', email: '', password: 'password' }),
    }))
    expect(push).toHaveBeenCalledWith('/instructor')
  })

  it('shows an unverified-account response without exposing an invitation resend path', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error: 'Accept your invitation to continue.',
      code: 'unverified',
    }), { status: 403, headers: { 'Content-Type': 'application/json' } }))
    render(<AccountAuthPage mode="login" />)

    await user.type(screen.getByLabelText('Username'), 'Medic')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Accept your invitation')
    expect(push).not.toHaveBeenCalled()
  })

  it('shows generic recovery success without exposing account existence', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      message: 'If an account uses that email, a recovery link has been sent.',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    render(<AccountAuthPage mode="forgot" />)

    await user.type(screen.getByLabelText('Email'), 'unknown@example.ca')
    await user.click(screen.getByRole('button', { name: 'Send recovery link' }))

    expect(await screen.findByRole('status')).toHaveTextContent('If an account uses that email')
  })

  it('updates a recovered password and returns to Account', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      message: 'Password updated.',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    render(<AccountAuthPage mode="reset" />)
    await user.type(screen.getByLabelText(/^New password/), 'new-password')
    await user.click(screen.getByRole('button', { name: 'Update password' }))
    expect(fetch).toHaveBeenCalledWith('/api/auth/password', expect.anything())
    expect(push).toHaveBeenCalledWith('/instructor/account')
  })
})
