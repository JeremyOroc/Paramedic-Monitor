import { NextResponse } from 'next/server'

import { hostTokenFromRequest, jsonError } from '@/server/sessions/http'
import { endSession } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const session = await endSession(code, hostTokenFromRequest(request))
    return NextResponse.json({ session })
  } catch (error) {
    return jsonError(error)
  }
}
