import { NextResponse } from 'next/server'

import { hostTokenFromRequest, jsonError } from '@/server/sessions/http'
import { startNewAttempt } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const session = await startNewAttempt(code, hostTokenFromRequest(request))
    return NextResponse.json({ session })
  } catch (error) {
    return jsonError(error)
  }
}
