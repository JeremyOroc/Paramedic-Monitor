import { NextResponse } from 'next/server'

import { hostTokenFromRequest, jsonError } from '@/server/sessions/http'
import { getReview } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const result = await getReview(code, hostTokenFromRequest(request))
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
