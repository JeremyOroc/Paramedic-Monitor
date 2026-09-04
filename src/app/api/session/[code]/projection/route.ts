import { NextResponse } from 'next/server'

import { jsonError, participantTokenFromRequest } from '@/server/sessions/http'
import {
  publishMonitorProjection,
  startMonitorProjectionStream,
} from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

type ProjectionRequest = {
  projection?: unknown
  streamId?: unknown
  clientSequence?: unknown
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const body = (await request.json()) as ProjectionRequest
    const participantToken = participantTokenFromRequest(request)
    const result =
      typeof body.streamId === 'string'
        ? await publishMonitorProjection(
            code,
            participantToken,
            body.streamId,
            typeof body.clientSequence === 'number' ? body.clientSequence : Number.NaN,
            body.projection,
          )
        : await startMonitorProjectionStream(code, participantToken, body.projection)
    return NextResponse.json({ projection: result })
  } catch (error) {
    return jsonError(error)
  }
}
