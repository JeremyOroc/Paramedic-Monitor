import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

const getClaims = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getClaims } }),
}))

import { refreshSupabaseSession } from '@/lib/supabase/proxy'
import { config } from '@/proxy'

describe('account session proxy', () => {
  it('covers application workflows while excluding static asset paths', () => {
    expect(config.matcher).toContain('/auth/:path*')
    expect(config.matcher).toContain('/instructor/:path*')
    expect(config.matcher).toContain('/session/:path*')
    expect(config.matcher).toContain('/api/:path*')
  })

  it('refreshes Auth claims and prevents private session responses from caching', async () => {
    const response = await refreshSupabaseSession(new NextRequest('https://monitor.example/instructor'))
    expect(getClaims).toHaveBeenCalledOnce()
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })
})
