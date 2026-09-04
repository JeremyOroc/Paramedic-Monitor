import { NextResponse } from 'next/server'

import { hostTokenFromRequest, jsonError } from '@/server/sessions/http'
import { getMonitorProjectionForHost } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string; participantId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { code, participantId } = await params
    const result = await getMonitorProjectionForHost(
      code,
      hostTokenFromRequest(request),
      participantId,
    )
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
