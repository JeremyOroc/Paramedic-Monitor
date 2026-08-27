import { NextResponse } from 'next/server'

import { hostTokenFromRequest, jsonError } from '@/server/sessions/http'
import { getReview } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    // Defaults to the active attempt. `?attempt=all` exports the whole session.
    const requested = new URL(request.url).searchParams.get('attempt')
    const attempt =
      requested === 'all'
        ? ('all' as const)
        : requested === null
          ? -1
          : Number.parseInt(requested, 10)
    const result = await getReview(
      code,
      hostTokenFromRequest(request),
      attempt === 'all' || Number.isFinite(attempt) ? attempt : -1,
    )
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
