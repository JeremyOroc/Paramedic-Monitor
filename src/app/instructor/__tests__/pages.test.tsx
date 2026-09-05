import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getCurrentAccount: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`) }),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/server/accounts/service', () => ({ getCurrentAccount: mocks.getCurrentAccount }))
vi.mock('@/components/accounts/AccountAuthPage', () => ({
  AccountAuthPage: ({ mode, initialUsername, verificationError }: {
    mode: string
    initialUsername?: string
    verificationError?: boolean
  }) => <div>{mode}:{initialUsername}:{String(Boolean(verificationError))}</div>,
}))
vi.mock('@/components/accounts/AccountPanel', () => ({
  AccountPanel: ({ username }: { username: string }) => <div>account:{username}</div>,
}))

import AccountPage from '@/app/instructor/account/page'
import CheckEmailPage from '@/app/instructor/check-email/page'
import ForgotPasswordPage from '@/app/instructor/forgot-password/page'
import LoginPage from '@/app/instructor/login/page'
import InstructorPage from '@/app/instructor/page'
import RegisterPage from '@/app/instructor/register/page'
import ResetPasswordPage from '@/app/instructor/reset-password/page'

describe('Instructor account pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentAccount.mockResolvedValue({
      username: 'Medic', email: 'medic@example.ca', role: 'instructor', status: 'enabled', user_id: 'user-1',
    })
  })

  it('renders each public authentication state from URL input', async () => {
    const { unmount } = render(await LoginPage({ searchParams: Promise.resolve({ error: 'verification' }) }))
    expect(screen.getByText('login::true')).toBeInTheDocument()
    unmount()
    const check = render(await CheckEmailPage({ searchParams: Promise.resolve({ username: 'Medic' }) }))
    expect(screen.getByText('resend:Medic:false')).toBeInTheDocument()
    check.unmount()
    const register = render(<RegisterPage />)
    expect(screen.getByText('register::false')).toBeInTheDocument()
    register.unmount()
    render(<ForgotPasswordPage />)
    expect(screen.getByText('forgot::false')).toBeInTheDocument()
  })

  it('protects Account and password-reset pages with a live account check', async () => {
    const account = render(await AccountPage())
    expect(screen.getByText('account:Medic')).toBeInTheDocument()
    account.unmount()
    render(await ResetPasswordPage())
    expect(screen.getByText('reset::false')).toBeInTheDocument()

    mocks.getCurrentAccount.mockResolvedValue(null)
    await expect(AccountPage()).rejects.toThrow('redirect:/instructor/login')
    await expect(ResetPasswordPage()).rejects.toThrow('redirect:/instructor/login')
  })

  it('routes an authenticated Instructor home to Account and anonymous users to login', async () => {
    await expect(InstructorPage()).rejects.toThrow('redirect:/instructor/account')
    mocks.getCurrentAccount.mockResolvedValue(null)
    await expect(InstructorPage()).rejects.toThrow('redirect:/instructor/login')
  })
})
