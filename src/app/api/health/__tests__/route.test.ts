import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createServiceClient } from '@/lib/supabase/server'

import { GET } from '../route'

const select = vi.fn()
const from = vi.fn(() => ({ select }))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from })),
}))

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-05T19:07:48.886Z'))
    vi.mocked(createServiceClient).mockClear()
    from.mockClear()
    select.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('checks the protected sessions table with the server-only secret client', async () => {
    select.mockResolvedValue({ error: null })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'ok' },
      latencyMs: 0,
      timestamp: '2026-09-05T19:07:48.886Z',
    })
    expect(createServiceClient).toHaveBeenCalledOnce()
    expect(from).toHaveBeenCalledWith('sessions')
    expect(select).toHaveBeenCalledWith('*', { head: true, count: 'exact' })
  })

  it('reports a degraded database check when Supabase rejects the query', async () => {
    select.mockResolvedValue({ error: { message: 'permission denied' } })

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      checks: { database: 'fail' },
    })
    expect(console.error).toHaveBeenCalledWith(
      '[health] supabase check failed:',
      'permission denied',
    )
  })

  it('reports an unknown database state when the secret client cannot start', async () => {
    vi.mocked(createServiceClient).mockImplementationOnce(() => {
      throw new Error('missing server secret')
    })

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      status: 'error',
      checks: { database: 'unknown' },
    })
    expect(console.error).toHaveBeenCalledWith(
      '[health] unexpected failure:',
      expect.objectContaining({ message: 'missing server secret' }),
    )
  })
})
