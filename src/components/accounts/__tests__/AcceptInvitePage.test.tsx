import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AcceptInvitePage } from '@/components/accounts/AcceptInvitePage'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

describe('AcceptInvitePage', () => {
  beforeEach(() => {
    push.mockReset()
    refresh.mockReset()
    vi.restoreAllMocks()
  })

  it('submits the invited instructor username and password', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      username: 'Medic.One', role: 'instructor',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    render(<AcceptInvitePage email="medic@example.ca" initialUsername={null} />)

    expect(screen.getByText('medic@example.ca')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Username'), 'Medic.One')
    await user.type(screen.getByLabelText(/^Password/), 'password')
    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    expect(fetch).toHaveBeenCalledWith('/api/auth/accept-invite', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ username: 'Medic.One', password: 'password' }),
    }))
    expect(push).toHaveBeenCalledWith('/instructor')
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('shows the required duplicate-username message and allows retry', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error: 'That username already exists. Please use another username.',
      code: 'username_taken',
    }), { status: 409, headers: { 'Content-Type': 'application/json' } }))
    render(<AcceptInvitePage email="medic@example.ca" initialUsername={null} />)

    await user.type(screen.getByLabelText('Username'), 'Existing')
    await user.type(screen.getByLabelText(/^Password/), 'password')
    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('already exists')
    expect(screen.getByRole('button', { name: 'Finish setup' })).toBeEnabled()
  })

  it('keeps a pre-provisioned Administrator username immutable during password setup', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      username: 'Jeremy', role: 'administrator',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    render(<AcceptInvitePage email="admin@example.ca" initialUsername="Jeremy" />)

    expect(screen.getByText('Jeremy')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Username' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/^Password/), 'password')
    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    expect(fetch).toHaveBeenCalledWith('/api/auth/accept-invite', expect.objectContaining({
      body: JSON.stringify({ username: 'Jeremy', password: 'password' }),
    }))
  })
})
