import { NextResponse } from 'next/server'

import { hostTokenFromRequest, jsonError } from '@/server/sessions/http'
import { getSessionStatus, updateSessionState } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const result = await getSessionStatus(code)
    return NextResponse.json(result)
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
