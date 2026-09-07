import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AccountPanel } from '@/components/accounts/AccountPanel'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

describe('AccountPanel', () => {
  beforeEach(() => {
    push.mockReset()
    refresh.mockReset()
    vi.restoreAllMocks()
  })

  it('renders immutable account identity fields', () => {
    render(<AccountPanel username="Jeremy" email="jeremy@example.ca" role="administrator" />)
    expect(screen.getByText('Jeremy')).toBeInTheDocument()
    expect(screen.getByText('jeremy@example.ca')).toBeInTheDocument()
    expect(screen.getByText('administrator')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Jeremy')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/instructor/reports')
  })

  it('updates the password and signs out only the current device', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Password updated.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    render(<AccountPanel username="Medic" email="medic@example.ca" role="instructor" />)

    await user.type(screen.getByPlaceholderText('New password'), 'newpassword')
    await user.click(screen.getByRole('button', { name: 'Update password' }))
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/auth/password', expect.objectContaining({ method: 'POST' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Password updated')

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/auth/signout', { method: 'POST' })
    expect(push).toHaveBeenCalledWith('/instructor/login')
  })
})
