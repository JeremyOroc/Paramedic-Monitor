import { NextResponse } from 'next/server'

import { requireRoomAccount } from '@/server/sessions/access'
import { controllerTokenFromRequest, jsonError } from '@/server/sessions/http'
import { recordInstructorNote } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const body = (await request.json()) as { body?: unknown }
    if (typeof body.body !== 'string') {
      return NextResponse.json({ error: 'Report Note must be text' }, { status: 400 })
    }
    const account = await requireRoomAccount()
    const instructorNote = await recordInstructorNote(
      code,
      account,
      controllerTokenFromRequest(request),
      body.body,
    )
    return NextResponse.json({ instructorNote })
  } catch (error) {
    return jsonError(error)
  }
}
