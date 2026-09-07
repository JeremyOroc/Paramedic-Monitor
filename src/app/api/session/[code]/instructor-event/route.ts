import { NextResponse } from 'next/server'

import { controllerTokenFromRequest, jsonError } from '@/server/sessions/http'
import { recordInstructorEvent } from '@/server/sessions/service'
import { requireRoomAccount } from '@/server/sessions/access'

type RouteContext = {
  params: Promise<{ code: string }>
}

/**
 * A trainee action the instructor logged from the console: a drug given while
 * the paramedic's hands were full, a SAMPLE or OPQRST question asked aloud.
 *
 * Authorized as the room's controlling device, because the console holds a
 * controller token and no participant token. The row is still credited to the
 * named trainee; the service stamps `payload.source` so the report can say who
 * pressed the key.
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const body = (await request.json()) as {
      participantId?: string
      kind?: string
      label?: string
      payload?: unknown
    }
    const account = await requireRoomAccount()
    const result = await recordInstructorEvent(
      code,
      account,
      controllerTokenFromRequest(request),
      body.participantId ?? '',
      {
        kind: body.kind ?? '',
        label: body.label ?? '',
        payload: body.payload,
      },
    )
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
