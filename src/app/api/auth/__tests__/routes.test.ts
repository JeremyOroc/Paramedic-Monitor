import { beforeEach, describe, expect, it, vi } from 'vitest'

const service = vi.hoisted(() => ({
  acceptAccountInvitation: vi.fn(),
  requestPasswordRecovery: vi.fn(),
  signInAccount: vi.fn(),
  signOutAccount: vi.fn(),
  updateAccountPassword: vi.fn(),
}))

vi.mock('@/server/accounts/service', () => service)

import { POST as acceptInvite } from '@/app/api/auth/accept-invite/route'
import { POST as login } from '@/app/api/auth/login/route'
import { POST as password } from '@/app/api/auth/password/route'
import { POST as recover } from '@/app/api/auth/recover/route'
import { POST as signout } from '@/app/api/auth/signout/route'

function request(path: string, body: unknown = {}, origin = 'https://monitor.example') {
  return new Request(`https://monitor.example${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  })
}

describe('account API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.acceptAccountInvitation.mockResolvedValue({ username: 'Medic', role: 'instructor' })
    service.signInAccount.mockResolvedValue({ username: 'Medic', role: 'instructor' })
    service.requestPasswordRecovery.mockResolvedValue({ message: 'recovery accepted' })
    service.updateAccountPassword.mockResolvedValue({ message: 'Password updated.' })
    service.signOutAccount.mockResolvedValue(undefined)
  })

  it.each([
    ['invite acceptance', acceptInvite, service.acceptAccountInvitation, '/api/auth/accept-invite'],
    ['login', login, service.signInAccount, '/api/auth/login'],
    ['password update', password, service.updateAccountPassword, '/api/auth/password'],
  ] as const)('routes %s input to its service', async (_name, handler, fn, path) => {
    const body = { username: 'Medic', password: 'password' }
    const response = await handler(request(path, body))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(fn).toHaveBeenCalledWith(body)
  })

  it('routes recovery with the request origin', async () => {
    const body = { email: 'medic@example.ca' }
    await recover(request('/api/auth/recover', body))
    expect(service.requestPasswordRecovery).toHaveBeenCalledWith(body, 'https://monitor.example')
  })

  it('signs out through the local-session service', async () => {
    const response = await signout(request('/api/auth/signout'))
    expect(response.status).toBe(200)
    expect(service.signOutAccount).toHaveBeenCalledOnce()
  })

  it('rejects cross-origin mutations before invoking a service', async () => {
    const response = await acceptInvite(request('/api/auth/accept-invite', {}, 'https://evil.example'))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'invalid_input' })
    expect(service.acceptAccountInvitation).not.toHaveBeenCalled()
  })
})
