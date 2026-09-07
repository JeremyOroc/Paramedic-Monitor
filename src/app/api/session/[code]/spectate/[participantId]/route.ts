import { NextResponse } from 'next/server'

import { requireRoomAccount } from '@/server/sessions/access'
import { jsonError } from '@/server/sessions/http'
import { getMonitorProjectionForOwner } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string; participantId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { code, participantId } = await params
    const account = await requireRoomAccount()
    const result = await getMonitorProjectionForOwner(
      code,
      account,
      participantId,
    )
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
