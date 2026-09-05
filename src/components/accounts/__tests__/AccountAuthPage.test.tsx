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

  it('submits all required registration fields and opens the verification step', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ username: 'Medic.One' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    render(<AccountAuthPage mode="register" />)

    await user.type(screen.getByLabelText('Username'), 'Medic.One')
    await user.type(screen.getByLabelText('Email'), 'medic@example.ca')
    await user.type(screen.getByLabelText(/^Password/), 'password')
    await user.type(screen.getByLabelText('Instructor registration code'), 'private-code')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(fetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        username: 'Medic.One',
        email: 'medic@example.ca',
        password: 'password',
        registrationCode: 'private-code',
      }),
    }))
    expect(push).toHaveBeenCalledWith('/instructor/check-email?username=Medic.One')
  })

  it('sends an unverified login to the resend screen', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error: 'Verify your email to continue.',
      code: 'unverified',
    }), { status: 403, headers: { 'Content-Type': 'application/json' } }))
    render(<AccountAuthPage mode="login" />)

    await user.type(screen.getByLabelText('Username'), 'Medic')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(push).toHaveBeenCalledWith('/instructor/check-email?username=Medic')
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

  it('resends verification from the prefilled pending-account state', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      message: 'If that username has a pending account, a new verification email has been sent.',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    render(<AccountAuthPage mode="resend" initialUsername="Medic" />)
    expect(screen.getByLabelText('Username')).toHaveValue('Medic')
    await user.click(screen.getByRole('button', { name: 'Resend email' }))
    expect(fetch).toHaveBeenCalledWith('/api/auth/resend', expect.objectContaining({ method: 'POST' }))
    expect(await screen.findByRole('status')).toHaveTextContent('If that username has a pending account')
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

  it('shows the specific duplicate-username registration message', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error: 'That username already exists. Please use another username.',
      code: 'username_taken',
    }), { status: 409, headers: { 'Content-Type': 'application/json' } }))
    render(<AccountAuthPage mode="register" />)
    await user.type(screen.getByLabelText('Username'), 'Existing')
    await user.type(screen.getByLabelText('Email'), 'new@example.ca')
    await user.type(screen.getByLabelText(/^Password/), 'password')
    await user.type(screen.getByLabelText('Instructor registration code'), 'private-code')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists')
  })
})
