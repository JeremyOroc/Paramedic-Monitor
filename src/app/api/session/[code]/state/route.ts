import { NextResponse } from 'next/server'

import {
  hostTokenFromRequest,
  jsonError,
  participantTokenFromRequest,
} from '@/server/sessions/http'
import { getSessionStatus, updateSessionState } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const serverReceivedAt = Date.now()
    const { code } = await params
    // `?since=<version>`: the monitor names the version it holds and gets a
    // version-only answer when nothing moved.
    const sinceRaw = new URL(request.url).searchParams.get('since')
    const since = sinceRaw === null ? null : Number.parseInt(sinceRaw, 10)
    const result = await getSessionStatus(
      code,
      participantTokenFromRequest(request),
      since !== null && Number.isInteger(since) && since >= 1 ? since : null,
    )
    return NextResponse.json({ ...result, serverReceivedAt, serverNow: Date.now() })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const body = await request.json() as { state?: unknown }
    const result = await updateSessionState(
      code,
      hostTokenFromRequest(request),
      body.state ?? {},
    )
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
