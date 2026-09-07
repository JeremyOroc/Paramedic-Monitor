import { NextRequest, NextResponse } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const refreshSupabaseSession = vi.hoisted(() => vi.fn(async () => NextResponse.next()))

vi.mock('@/lib/supabase/proxy', () => ({ refreshSupabaseSession }))

import { config, proxy } from '@/proxy'

describe('application proxy', () => {
  afterEach(() => {
    delete process.env.MAINTENANCE_MODE
    vi.clearAllMocks()
  })

  it('covers every current application workflow explicitly', () => {
    expect(config.matcher).toEqual([
      '/',
      '/admin',
      '/auth/:path*',
      '/instructor/:path*',
      '/session/:path*',
      '/api/:path*',
      '/maintenance',
    ])
  })

  it('keeps production behavior and account refresh unchanged when maintenance is off', async () => {
    const response = await proxy(new NextRequest('https://monitor.example/instructor'))
    expect(response.status).toBe(200)
    expect(refreshSupabaseSession).toHaveBeenCalledOnce()

    await proxy(new NextRequest('https://monitor.example/api/session/create'))
    expect(refreshSupabaseSession).toHaveBeenCalledOnce()
  })

  it('returns a sanitized non-cacheable 503 for APIs during maintenance', async () => {
    process.env.MAINTENANCE_MODE = 'true'
    const response = await proxy(new NextRequest('https://monitor.example/api/session/create'))

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Retry-After')).toBe('300')
    await expect(response.json()).resolves.toEqual({
      error: 'Service temporarily unavailable for scheduled maintenance.',
    })
    expect(refreshSupabaseSession).not.toHaveBeenCalled()
  })

  it('redirects pages to maintenance without caching the response', async () => {
    process.env.MAINTENANCE_MODE = 'true'
    const response = await proxy(new NextRequest('https://monitor.example/instructor/reports'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://monitor.example/maintenance')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('keeps health and the maintenance page reachable during maintenance', async () => {
    process.env.MAINTENANCE_MODE = 'true'

    expect((await proxy(new NextRequest('https://monitor.example/api/health'))).status).toBe(200)
    expect((await proxy(new NextRequest('https://monitor.example/maintenance'))).status).toBe(200)
  })
})
