import { NextResponse } from 'next/server'

import { jsonError, participantTokenFromRequest } from '@/server/sessions/http'
import { recordStudentEvent } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const body = await request.json() as {
      kind?: string
      label?: string
      payload?: unknown
      stateVersion?: number | null
      occurredAtClient?: string | null
      captureSequence?: number | null
      clockOffsetMs?: number | null
    }
    const result = await recordStudentEvent(
      code,
      participantTokenFromRequest(request),
      {
        kind: body.kind ?? '',
        label: body.label ?? '',
        payload: body.payload,
        stateVersion: body.stateVersion,
        occurredAtClient: body.occurredAtClient,
        captureSequence: body.captureSequence,
        clockOffsetMs: body.clockOffsetMs,
      },
    )
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
