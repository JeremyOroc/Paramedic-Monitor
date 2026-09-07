import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  isMaintenanceBypassPath,
  isMaintenanceMode,
  shouldRefreshAccountSession,
} from '@/lib/maintenance'
import { refreshSupabaseSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isMaintenanceMode() && !isMaintenanceBypassPath(pathname)) {
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable for scheduled maintenance.' },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': '300',
          },
        },
      )
    }

    const response = NextResponse.redirect(new URL('/maintenance', request.url), 307)
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Retry-After', '300')
    return response
  }

  if (shouldRefreshAccountSession(pathname)) {
    return refreshSupabaseSession(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/admin',
    '/auth/:path*',
    '/instructor/:path*',
    '/session/:path*',
    '/api/:path*',
    '/maintenance',
  ],
}
