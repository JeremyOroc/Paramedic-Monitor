import { beforeEach, describe, expect, it, vi } from 'vitest'

const service = vi.hoisted(() => ({
  registerAccount: vi.fn(),
  requestPasswordRecovery: vi.fn(),
  resendVerification: vi.fn(),
  signInAccount: vi.fn(),
  signOutAccount: vi.fn(),
  updateAccountPassword: vi.fn(),
}))

vi.mock('@/server/accounts/service', () => service)

import { POST as login } from '@/app/api/auth/login/route'
import { POST as password } from '@/app/api/auth/password/route'
import { POST as recover } from '@/app/api/auth/recover/route'
import { POST as register } from '@/app/api/auth/register/route'
import { POST as resend } from '@/app/api/auth/resend/route'
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
    service.registerAccount.mockResolvedValue({ username: 'Medic' })
    service.signInAccount.mockResolvedValue({ username: 'Medic', role: 'instructor' })
    service.resendVerification.mockResolvedValue({ message: 'resend accepted' })
    service.requestPasswordRecovery.mockResolvedValue({ message: 'recovery accepted' })
    service.updateAccountPassword.mockResolvedValue({ message: 'Password updated.' })
    service.signOutAccount.mockResolvedValue(undefined)
  })

  it('routes registration with a server-derived callback origin', async () => {
    const body = { username: 'Medic' }
    const response = await register(request('/api/auth/register', body))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(service.registerAccount).toHaveBeenCalledWith(body, 'https://monitor.example')
  })

  it.each([
    ['login', login, service.signInAccount, '/api/auth/login'],
    ['password update', password, service.updateAccountPassword, '/api/auth/password'],
  ] as const)('routes %s input to its service', async (_name, handler, fn, path) => {
    const body = { password: 'password' }
    expect((await handler(request(path, body))).status).toBe(200)
    expect(fn).toHaveBeenCalledWith(body)
  })

  it('routes resend and recovery with the request origin', async () => {
    const resendBody = { username: 'Medic' }
    const recoverBody = { email: 'medic@example.ca' }
    await resend(request('/api/auth/resend', resendBody))
    await recover(request('/api/auth/recover', recoverBody))
    expect(service.resendVerification).toHaveBeenCalledWith(resendBody, 'https://monitor.example')
    expect(service.requestPasswordRecovery).toHaveBeenCalledWith(recoverBody, 'https://monitor.example')
  })

  it('signs out through the local-session service', async () => {
    const response = await signout(request('/api/auth/signout'))
    expect(response.status).toBe(200)
    expect(service.signOutAccount).toHaveBeenCalledOnce()
  })

  it('rejects cross-origin mutations before invoking a service', async () => {
    const response = await login(request('/api/auth/login', {}, 'https://evil.example'))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'invalid_input' })
    expect(service.signInAccount).not.toHaveBeenCalled()
  })
})
