import { NextResponse } from 'next/server'

import { requireRoomAccount } from '@/server/sessions/access'
import { controllerTokenFromRequest, jsonError } from '@/server/sessions/http'
import { renameAttempt } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string; version: string }>
}

/** Name an attempt. `{ label: "" }` clears it. */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { code, version } = await params
    const body = (await request.json().catch(() => ({}))) as { label?: unknown }
    const label = typeof body.label === 'string' ? body.label : ''
    const account = await requireRoomAccount()
    const result = await renameAttempt(
      code,
      account,
      controllerTokenFromRequest(request),
      Number.parseInt(version, 10),
      label,
    )
    return NextResponse.json({ attempt: result })
  } catch (error) {
    return jsonError(error)
  }
}
