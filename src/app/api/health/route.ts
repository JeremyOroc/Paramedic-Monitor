import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Health check for external monitoring.
 *
 * Returns 200 only when the app can complete a real round trip to Supabase.
 * A plain page load can return 200 with the database completely down, so this
 * exists to make that distinction visible to an uptime monitor.
 *
 * Uses the anon client deliberately. RLS blocks public reads (migrations 004
 * and 006), so the count comes back as 0 rather than a row count -- that's
 * fine. What we care about is whether the request errors, which proves DNS,
 * TLS, PostgREST and Postgres are all answering. A missing or broken table
 * still errors here.
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
    const supabase = createClient()
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
