import { NextResponse } from 'next/server'

import { jsonError } from '@/server/sessions/http'
import { getSessionStatus } from '@/server/sessions/service'

type RouteContext = {
  params: Promise<{ code: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { code } = await params
    const result = await getSessionStatus(code)
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
