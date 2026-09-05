import { NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/server'

/**
 * Health check for external monitoring.
 *
 * Returns 200 only when the app can complete a real round trip to Supabase.
 * A plain page load can return 200 with the database completely down, so this
 * exists to make that distinction visible to an uptime monitor.
 *
 * Uses the server-only secret client. Migration 006 deliberately revoked the
 * anon role's table grant so room codes cannot be enumerated; Postgres checks
 * that grant before RLS, which means an anon health query fails instead of
 * returning zero rows. The secret stays inside this Route Handler and lets the
 * check prove that DNS, TLS, PostgREST, Postgres, and the server credential are
 * all working without reopening public access to `sessions`.
 *
 * Targets `sessions` rather than `scenarios`: `scenarios` backs a deferred
 * feature and could reasonably be dropped one day, which would turn this check
 * into a permanent false 503. `sessions` is load-bearing and is not going
 * anywhere.
 */

// Without this, Next can evaluate the handler at build time and serve a cached
// response forever -- the health check would report whatever was true during
// the build and never check again.
export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()

  try {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('sessions')
      .select('*', { head: true, count: 'exact' })

    const latencyMs = Date.now() - startedAt

    if (error) {
      console.error('[health] supabase check failed:', error.message)
      return NextResponse.json(
        {
          status: 'degraded',
          checks: { database: 'fail' },
          latencyMs,
          timestamp: new Date().toISOString(),
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json(
      {
        status: 'ok',
        checks: { database: 'ok' },
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('[health] unexpected failure:', err)
    return NextResponse.json(
      {
        status: 'error',
        checks: { database: 'unknown' },
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
