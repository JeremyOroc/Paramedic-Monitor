import { NextResponse } from 'next/server'

import { requireRoomAccount } from '@/server/sessions/access'
import { controllerTokenFromRequest, jsonError } from '@/server/sessions/http'
import { claimRoomControl, getRoomAccess } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

/** Resolve owner observation and whether this browser still controls the Room. */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const account = await requireRoomAccount()
    const result = await getRoomAccess(code, account, controllerTokenFromRequest(request))
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}

/** Reopen or take over an owned Room by rotating its browser controller token. */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const account = await requireRoomAccount()
    const result = await claimRoomControl(code, account)
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
