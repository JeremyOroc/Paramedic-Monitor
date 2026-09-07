import { NextResponse } from 'next/server'

import { requireRoomAccount } from '@/server/sessions/access'
import { controllerTokenFromRequest, jsonError } from '@/server/sessions/http'
import { startSession } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const account = await requireRoomAccount()
    const session = await startSession(code, account, controllerTokenFromRequest(request))
    return NextResponse.json({ session })
  } catch (error) {
    return jsonError(error)
  }
}
