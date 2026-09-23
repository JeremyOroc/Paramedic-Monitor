import { NextResponse } from 'next/server'

import { requireRoomAccount } from '@/server/sessions/access'
import { controllerTokenFromRequest, jsonError } from '@/server/sessions/http'
import { saveAttemptGeneralNotes } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const body = (await request.json()) as { generalNotes?: unknown }
    if (typeof body.generalNotes !== 'string') {
      return NextResponse.json({ error: 'General Notes must be text' }, { status: 400 })
    }
    const account = await requireRoomAccount()
    const attemptNotes = await saveAttemptGeneralNotes(
      code,
      account,
      controllerTokenFromRequest(request),
      body.generalNotes,
    )
    return NextResponse.json({ attemptNotes })
  } catch (error) {
    return jsonError(error)
  }
}
