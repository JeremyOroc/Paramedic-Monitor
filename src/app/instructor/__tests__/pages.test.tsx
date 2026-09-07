import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getCurrentAccount: vi.fn(),
  getInviteSetup: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`) }),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/server/accounts/service', () => ({
  getCurrentAccount: mocks.getCurrentAccount,
  getInviteSetup: mocks.getInviteSetup,
}))
vi.mock('@/components/accounts/AccountAuthPage', () => ({
  AccountAuthPage: ({ mode, verificationError }: {
    mode: string
    verificationError?: boolean
  }) => <div>{mode}:{String(Boolean(verificationError))}</div>,
}))
vi.mock('@/components/accounts/AcceptInvitePage', () => ({
  AcceptInvitePage: ({ email, initialUsername }: { email: string; initialUsername: string | null }) => (
    <div>invite:{email}:{initialUsername ?? 'new'}</div>
  ),
}))
vi.mock('@/components/accounts/AccountPanel', () => ({
  AccountPanel: ({ username }: { username: string }) => <div>account:{username}</div>,
}))

import AccountPage from '@/app/instructor/account/page'
import InviteAcceptancePage from '@/app/instructor/accept-invite/page'
import ForgotPasswordPage from '@/app/instructor/forgot-password/page'
import LoginPage from '@/app/instructor/login/page'
import InstructorPage from '@/app/instructor/page'
import ResetPasswordPage from '@/app/instructor/reset-password/page'

describe('Instructor account pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentAccount.mockResolvedValue({
      username: 'Medic', email: 'medic@example.ca', role: 'instructor', status: 'enabled', user_id: 'user-1',
    })
    mocks.getInviteSetup.mockResolvedValue({
      email: 'invited@example.ca', username: null, role: null,
    })
  })

  it('renders login and recovery as the only public account-entry pages', async () => {
    const { unmount } = render(await LoginPage({ searchParams: Promise.resolve({ error: 'invitation' }) }))
    expect(screen.getByText('login:true')).toBeInTheDocument()
    unmount()
    render(<ForgotPasswordPage />)
    expect(screen.getByText('forgot:false')).toBeInTheDocument()
  })

  it('renders invitation setup only from a live verified invite session', async () => {
    const invite = render(await InviteAcceptancePage())
    expect(screen.getByText('invite:invited@example.ca:new')).toBeInTheDocument()
    invite.unmount()

    mocks.getInviteSetup.mockResolvedValue(null)
    await expect(InviteAcceptancePage()).rejects.toThrow(
      'redirect:/instructor/login?error=invitation',
    )
  })

  it('protects Account and password-reset pages with a live account check', async () => {
    const account = render(await AccountPage())
    expect(screen.getByText('account:Medic')).toBeInTheDocument()
    account.unmount()
    render(await ResetPasswordPage())
    expect(screen.getByText('reset:false')).toBeInTheDocument()

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
