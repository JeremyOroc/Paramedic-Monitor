import { NextResponse } from 'next/server'
import { requireRoomAccount } from '@/server/sessions/access'
import { createSession } from '@/server/sessions/service'
import { jsonError } from '@/server/sessions/http'

export async function POST(request: Request) {
  try {
    const account = await requireRoomAccount()
    const result = await createSession(new URL(request.url).origin, account)
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
